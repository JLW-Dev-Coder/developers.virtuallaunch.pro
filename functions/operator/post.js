// functions/operator/post.js
// POST /operator/post — operator posts a targeted job opportunity to a specific developer
// Required bindings: OPERATOR_SESSIONS (KV), ONBOARDING_R2 (R2)
// Required env secrets: GOOGLE_PRIVATE_KEY, GOOGLE_CLIENT_EMAIL

import { verifyOperatorToken } from './_verifyToken.js';
import { sendTransactionalEmail } from '../_shared/email.js';
import { operatorPostNotification } from '../_shared/emailTemplates.js';

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

function computeNextNotificationDue(cronSchedule) {
  const now = Date.now();
  if (cronSchedule === '3 days')  return new Date(now + 3  * 86400000).toISOString();
  if (cronSchedule === '7 days')  return new Date(now + 7  * 86400000).toISOString();
  if (cronSchedule === '14 days') return new Date(now + 14 * 86400000).toISOString();
  return null;
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

  const { eventId, ref_number, jobTitle, jobDescription, jobId } = payload;

  if (!eventId || typeof eventId !== 'string' || !eventId.length) {
    return json({ ok: false, error: 'validation_failed', field: 'eventId' }, 400, CORS);
  }
  if (!ref_number || typeof ref_number !== 'string' || !ref_number.length) {
    return json({ ok: false, error: 'validation_failed', field: 'ref_number' }, 400, CORS);
  }
  if (!jobTitle || typeof jobTitle !== 'string' || !jobTitle.length) {
    return json({ ok: false, error: 'validation_failed', field: 'jobTitle' }, 400, CORS);
  }
  if (!jobDescription || typeof jobDescription !== 'string' || !jobDescription.length) {
    return json({ ok: false, error: 'validation_failed', field: 'jobDescription' }, 400, CORS);
  }

  // Dedupe check
  const dedupeKey = `operator-dedupe:post:${eventId}`;
  let existingDedupe = null;
  try {
    existingDedupe = await env.OPERATOR_SESSIONS.get(dedupeKey);
  } catch (err) {
    console.error('KV dedupe lookup failed:', err);
  }
  if (existingDedupe) {
    return json({ ok: true, deduped: true, eventId }, 200, CORS);
  }

  // Verify developer record exists
  if (!env.ONBOARDING_R2) return json({ ok: false, error: 'storage_unavailable' }, 500, CORS);

  const developerRecord = await getRecord(env, `onboarding-records/${ref_number}.json`);
  if (!developerRecord) {
    return json({ ok: false, error: 'not_found' }, 404, CORS);
  }

  const now = new Date().toISOString();

  // Write post record to R2
  const postRecord = {
    eventId,
    ref_number,
    jobTitle,
    jobDescription,
    postedAt: now,
    notificationStatus: 'queued'
  };
  if (jobId) postRecord.jobId = jobId;

  try {
    await env.ONBOARDING_R2.put(
      `operator-posts/${ref_number}/${eventId}.json`,
      JSON.stringify(postRecord),
      { httpMetadata: { contentType: 'application/json' } }
    );
  } catch (err) {
    console.error('R2 post write failed:', err);
    return json({ ok: false, error: 'internal_error' }, 500, CORS);
  }

  // Update developer's nextNotificationDue based on their cronSchedule
  const nextDue = computeNextNotificationDue(developerRecord.cronSchedule);
  if (nextDue) {
    try {
      const updatedRecord = { ...developerRecord, nextNotificationDue: nextDue, updatedAt: now };
      await env.ONBOARDING_R2.put(
        `onboarding-records/${ref_number}.json`,
        JSON.stringify(updatedRecord),
        { httpMetadata: { contentType: 'application/json' } }
      );
    } catch (err) {
      console.error('R2 developer record update failed (non-fatal):', err);
    }
  }

  // Send email notification to developer (non-fatal — failure never causes non-200)
  let notificationStatus = 'queued';
  try {
    const template = operatorPostNotification({
      full_name:      developerRecord.full_name,
      jobTitle,
      jobDescription,
      postedAt:       now
    });
    const emailResult = await sendTransactionalEmail(env, {
      to: developerRecord.email,
      ...template
    });
    notificationStatus = emailResult.ok ? 'sent' : 'failed';
    if (!emailResult.ok) {
      postRecord.notificationError = emailResult.error;
      console.error('post notification email failed:', emailResult.error);
    }
    postRecord.notificationStatus = notificationStatus;
    await env.ONBOARDING_R2.put(
      `operator-posts/${ref_number}/${eventId}.json`,
      JSON.stringify(postRecord),
      { httpMetadata: { contentType: 'application/json' } }
    );
  } catch (err) {
    console.error('post notification email failed', err.message);
  }

  // Write dedupe key to KV (TTL 86400s = 24h)
  try {
    await env.OPERATOR_SESSIONS.put(dedupeKey, eventId, { expirationTtl: 86400 });
  } catch (err) {
    console.error('KV dedupe write failed (non-fatal):', err);
  }

  return json({ ok: true, eventId, ref_number, notificationStatus }, 201, CORS);
}

export async function onRequest({ request }) {
  const CORS = corsHeaders(request);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  return json({ ok: false, error: 'method_not_allowed' }, 405, CORS);
}
