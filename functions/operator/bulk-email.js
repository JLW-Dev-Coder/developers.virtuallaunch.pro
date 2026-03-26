// functions/operator/bulk-email.js
// POST /operator/bulk-email — filter-based bulk email dispatch
// Required bindings: OPERATOR_SESSIONS (KV), ONBOARDING_R2 (R2)
// Required env secrets: RESEND_API_KEY, EMAIL_FROM

import { verifyOperatorToken } from './_verifyToken.js';
import { sendBulkEmail, sendEmailDryRun } from '../_shared/email.js';
import { bulkEmailTemplate } from '../_shared/emailTemplates.js';

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin':  origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization',
    'Access-Control-Max-Age':       '86400'
  };
}

function json(body, status, cors = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors }
  });
}

async function getRecord(env, key) {
  if (!env.ONBOARDING_R2) return null;
  const obj = await env.ONBOARDING_R2.get(key);
  if (!obj) return null;
  try { return await obj.json(); } catch { return null; }
}

async function resolveRecipients(env, filters = {}) {
  const objects = [];
  let list = await env.ONBOARDING_R2.list({ prefix: 'onboarding-records/' });
  objects.push(...list.objects);
  while (list.truncated) {
    list = await env.ONBOARDING_R2.list({ prefix: 'onboarding-records/', cursor: list.cursor });
    objects.push(...list.objects);
  }

  const seen = new Set();
  const recipients = [];

  for (const obj of objects) {
    const record = await getRecord(env, obj.key);
    if (!record || !record.email) continue;

    // Apply filters
    if (filters.status && record.status !== filters.status) continue;
    if (filters.cronSchedule && record.cronSchedule !== filters.cronSchedule) continue;
    if (typeof filters.publish === 'boolean' && record.publish_profile !== filters.publish) continue;
    if (filters.skill) {
      const skillVal = record[filters.skill];
      if (typeof skillVal !== 'number' || skillVal < 1) continue;
    }

    // Deduplicate by email
    if (seen.has(record.email)) continue;
    seen.add(record.email);

    recipients.push({ email: record.email, full_name: record.full_name || 'Developer' });
  }

  return recipients;
}

export async function onRequestPost({ request, env }) {
  const CORS = corsHeaders(request);

  const auth = await verifyOperatorToken(request, env);
  if (!auth.valid) return json({ ok: false, error: 'unauthorized' }, 401, CORS);

  // Parse body
  let payload;
  try { payload = await request.json(); } catch {
    return json({ ok: false, error: 'validation_failed' }, 400, CORS);
  }

  const { eventId, subject: payloadSubject, body: payloadBody, templateId, filters = {}, dryRun } = payload;

  if (!eventId || typeof eventId !== 'string' || !eventId.length) {
    return json({ ok: false, error: 'validation_failed', field: 'eventId' }, 400, CORS);
  }
  if (!payloadSubject || typeof payloadSubject !== 'string' || !payloadSubject.length) {
    return json({ ok: false, error: 'validation_failed', field: 'subject' }, 400, CORS);
  }
  if (!payloadBody && !templateId) {
    return json({ ok: false, error: 'body_or_template_required' }, 400, CORS);
  }

  if (!env.ONBOARDING_R2) return json({ ok: false, error: 'storage_unavailable' }, 500, CORS);

  // Dedupe check
  const dedupeKey = `operator-dedupe:bulk-email:${eventId}`;
  let existingDedupe = null;
  try {
    existingDedupe = await env.OPERATOR_SESSIONS.get(dedupeKey);
  } catch (err) {
    console.error('KV dedupe lookup failed:', err);
  }
  if (existingDedupe) {
    return json({ ok: true, deduped: true, eventId }, 200, CORS);
  }

  // Resolve template if templateId provided
  let subject = payloadSubject;
  let body    = payloadBody || null;

  if (templateId) {
    const template = await getRecord(env, `operator-canned-responses/${templateId}.json`);
    if (template) {
      if (!payloadBody    && template.body)    body    = template.body;
      if (!payloadSubject && template.subject) subject = template.subject;
    }
  }

  if (!body) {
    return json({ ok: false, error: 'body_or_template_required' }, 400, CORS);
  }

  // Resolve recipients
  const recipients = await resolveRecipients(env, filters);
  const recipientCount = recipients.length;
  const now = new Date().toISOString();

  // Dry run — write receipt and return without sending
  if (dryRun === true) {
    const dryResult = sendEmailDryRun(recipients.map(r => r.email));
    try {
      await env.ONBOARDING_R2.put(
        `receipts/operator/bulk-email/${eventId}.json`,
        JSON.stringify({ eventId, filters, subject, recipientCount, sentAt: now, dryRun: true }),
        { httpMetadata: { contentType: 'application/json' } }
      );
    } catch (err) {
      console.error('R2 receipt write failed (non-fatal):', err);
    }
    try {
      await env.OPERATOR_SESSIONS.put(dedupeKey, eventId, { expirationTtl: 86400 });
    } catch (err) {
      console.error('KV dedupe write failed (non-fatal):', err);
    }
    return json({ ok: true, eventId, recipientCount: dryResult.recipientCount, dryRun: true, sent: false }, 200, CORS);
  }

  // Live send
  const { html, text } = bulkEmailTemplate({
    full_name: null,
    subject,
    body
  });

  const result = await sendBulkEmail(env, {
    recipients: recipients.map(r => r.email),
    subject,
    html,
    text
  });

  // Write receipt
  try {
    await env.ONBOARDING_R2.put(
      `receipts/operator/bulk-email/${eventId}.json`,
      JSON.stringify({ eventId, filters, subject, recipientCount, sentAt: now, dryRun: false, sent: result.sent, failed: result.failed }),
      { httpMetadata: { contentType: 'application/json' } }
    );
  } catch (err) {
    console.error('R2 receipt write failed (non-fatal):', err);
  }

  // Write dedupe key
  try {
    await env.OPERATOR_SESSIONS.put(dedupeKey, eventId, { expirationTtl: 86400 });
  } catch (err) {
    console.error('KV dedupe write failed (non-fatal):', err);
  }

  return json({ ok: true, eventId, recipientCount, dryRun: false, sent: true, sentCount: result.sent, failed: result.failed, errors: result.errors }, 200, CORS);
}

export async function onRequest({ request }) {
  const CORS = corsHeaders(request);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  return json({ ok: false, error: 'method_not_allowed' }, 405, CORS);
}
