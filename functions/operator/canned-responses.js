// functions/operator/canned-responses.js
// GET  /operator/canned-responses            — list templates (optional ?userType filter)
// POST /operator/canned-responses            — create a new template
// PATCH/DELETE routed to canned-responses/[templateId].js
// Response shape: contracts/operator-canned-responses.json > response.success

import { verifyOperatorToken } from './_verifyToken.js';

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

// ── GET ───────────────────────────────────────────────────────────────────────

async function handleGet(request, env, CORS) {
  const url       = new URL(request.url);
  const userType  = url.searchParams.get('userType') || null;

  const templates = [];
  try {
    let list = await env.ONBOARDING_R2.list({ prefix: 'operator-canned-responses/' });
    const objects = [...list.objects];
    while (list.truncated) {
      list = await env.ONBOARDING_R2.list({ prefix: 'operator-canned-responses/', cursor: list.cursor });
      objects.push(...list.objects);
    }

    for (const obj of objects) {
      try {
        const item = await env.ONBOARDING_R2.get(obj.key);
        if (!item) continue;
        const tpl = await item.json();

        if (userType && userType !== 'all' && tpl.userType !== userType) continue;

        templates.push({
          templateId: tpl.templateId,
          userType:   tpl.userType,
          label:      tpl.label,
          subject:    tpl.subject,
          body:       tpl.body,
          isDefault:  tpl.isDefault,
          createdAt:  tpl.createdAt,
          updatedAt:  tpl.updatedAt
        });
      } catch {
        // skip unparseable
      }
    }
  } catch (err) {
    console.error('canned-responses.js GET list error:', err.message);
  }

  return json({ ok: true, templates }, 200, CORS);
}

// ── POST ──────────────────────────────────────────────────────────────────────

async function handlePost(request, env, CORS) {
  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: 'invalid_json' }, 400, CORS); }

  const { eventId, userType, label, subject, body: tplBody } = body;
  if (!eventId || !userType || !label || !subject || !tplBody) {
    return json({
      ok: false, error: 'missing_required_fields',
      required: ['eventId', 'userType', 'label', 'subject', 'body']
    }, 400, CORS);
  }

  if (!['developer', 'client', 'all'].includes(userType)) {
    return json({ ok: false, error: 'invalid_userType', allowed: ['developer', 'client', 'all'] }, 400, CORS);
  }

  // Dedupe check
  const dedupeKey = `operator-dedupe:canned:${eventId}`;
  const existing  = await env.OPERATOR_SESSIONS.get(dedupeKey);
  if (existing) {
    return json({ ok: true, deduped: true, eventId }, 200, CORS);
  }

  const now = new Date().toISOString();
  const template = {
    templateId: eventId,
    eventId,
    userType,
    label,
    subject,
    body:      tplBody,
    isDefault: false,
    createdAt: now,
    updatedAt: now
  };

  await env.ONBOARDING_R2.put(
    `operator-canned-responses/${eventId}.json`,
    JSON.stringify(template),
    { httpMetadata: { contentType: 'application/json' } }
  );

  // Write dedupe key (TTL 86400s)
  await env.OPERATOR_SESSIONS.put(dedupeKey, '1', { expirationTtl: 86400 });

  return json({ ok: true, templateId: eventId, eventId }, 201, CORS);
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

  if (request.method === 'GET')  return handleGet(request, env, CORS);
  if (request.method === 'POST') return handlePost(request, env, CORS);

  return json({ ok: false, error: 'method_not_allowed' }, 405, CORS);
}
