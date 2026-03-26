// functions/operator/messages.js
// POST /operator/messages  — send a message to a developer (writes to R2 + sends email)
// GET  /operator/messages?ref=VLP-xxx — fetch full message thread for a developer
// Response shape: contracts/operator-messages.json > response.success

import { verifyOperatorToken }  from './_verifyToken.js';
import { sendTransactionalEmail } from '../_shared/email.js';
import { supportTicketReply }   from '../_shared/emailTemplates.js';

// ── helpers ───────────────────────────────────────────────────────────────────

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin':  origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

// ── POST handler ──────────────────────────────────────────────────────────────

async function handlePost(request, env, CORS) {
  // 1. Parse + validate body
  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: 'invalid_json' }, 400, CORS); }

  const { eventId, ref_number, subject, body: msgBody, templateId, replyToId } = body;
  if (!eventId || !ref_number || !subject || !msgBody) {
    return json({ ok: false, error: 'missing_required_fields', required: ['eventId', 'ref_number', 'subject', 'body'] }, 400, CORS);
  }

  // 2. Dedupe check
  const dedupeKey = `operator-dedupe:message:${eventId}`;
  const existing  = await env.OPERATOR_SESSIONS.get(dedupeKey);
  if (existing) {
    return json({ ok: true, deduped: true, eventId }, 200, CORS);
  }

  // 3. Look up developer record
  const devObj = await env.ONBOARDING_R2.get(`onboarding-records/${ref_number}.json`);
  if (!devObj) {
    return json({ ok: false, error: 'not_found' }, 404, CORS);
  }
  let devRecord;
  try { devRecord = await devObj.json(); }
  catch { return json({ ok: false, error: 'record_parse_error' }, 500, CORS); }

  const now    = new Date().toISOString();
  const toAddr = devRecord.email;

  // 4. Build message record
  const messageRecord = {
    eventId,
    ref_number,
    subject,
    body:      msgBody,
    direction: 'outbound',
    sentAt:    now,
    read:      false,
    ...(templateId ? { templateId } : {}),
    ...(replyToId  ? { replyToId  } : {})
  };

  // 5. Write message to R2
  await env.ONBOARDING_R2.put(
    `operator-messages/${ref_number}/${eventId}.json`,
    JSON.stringify(messageRecord),
    { httpMetadata: { contentType: 'application/json' } }
  );

  // 6. Write receipt to R2
  const receipt = { eventId, ref_number, subject, sentAt: now, type: 'message' };
  await env.ONBOARDING_R2.put(
    `receipts/operator/messages/${eventId}.json`,
    JSON.stringify(receipt),
    { httpMetadata: { contentType: 'application/json' } }
  );

  // 7. Write dedupe key (TTL 86400s)
  await env.OPERATOR_SESSIONS.put(dedupeKey, '1', { expirationTtl: 86400 });

  // 8. Send email — catch failure, never abort
  if (toAddr) {
    try {
      const { html, text } = supportTicketReply({
        clientRef:  ref_number,
        subject,
        replyBody:  msgBody
      });
      await sendTransactionalEmail(env, { to: toAddr, subject: `Re: ${subject} [Ref: ${ref_number}]`, html, text });
    } catch (err) {
      console.error('messages.js email send failed:', err.message);
    }
  }

  return json({ ok: true, eventId, ref_number, sentAt: now }, 200, CORS);
}

// ── GET handler ───────────────────────────────────────────────────────────────

async function handleGet(request, env, CORS) {
  const url = new URL(request.url);
  const ref = url.searchParams.get('ref');
  if (!ref) {
    return json({ ok: false, error: 'missing_ref' }, 400, CORS);
  }

  const prefix  = `operator-messages/${ref}/`;
  const messages = [];

  try {
    let list = await env.ONBOARDING_R2.list({ prefix });
    const objects = [...list.objects];
    while (list.truncated) {
      list = await env.ONBOARDING_R2.list({ prefix, cursor: list.cursor });
      objects.push(...list.objects);
    }

    for (const obj of objects) {
      try {
        const item = await env.ONBOARDING_R2.get(obj.key);
        if (!item) continue;
        messages.push(await item.json());
      } catch {
        // skip unparseable
      }
    }
  } catch (err) {
    console.error('messages.js GET list error:', err.message);
  }

  // Sort chronologically by sentAt
  messages.sort((a, b) => {
    const ta = a.sentAt || '';
    const tb = b.sentAt || '';
    return ta < tb ? -1 : ta > tb ? 1 : 0;
  });

  return json({ ok: true, ref_number: ref, messages }, 200, CORS);
}

// ── entry point ───────────────────────────────────────────────────────────────

export async function onRequest(context) {
  const { request, env } = context;
  const CORS = corsHeaders(request);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  const auth = await verifyOperatorToken(request, env);
  if (!auth.valid) {
    return json({ ok: false, error: 'unauthorized' }, 401, CORS);
  }

  if (request.method === 'POST') return handlePost(request, env, CORS);
  if (request.method === 'GET')  return handleGet(request, env, CORS);

  return json({ ok: false, error: 'method_not_allowed' }, 405, CORS);
}
