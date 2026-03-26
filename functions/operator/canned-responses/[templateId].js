// functions/operator/canned-responses/[templateId].js
// PATCH  /operator/canned-responses/{templateId} — edit template (label, subject, body, userType)
// DELETE /operator/canned-responses/{templateId} — delete template (isDefault guard)
// Response shapes: contracts/operator-canned-responses.json > notes.additionalEndpoints

import { verifyOperatorToken } from '../_verifyToken.js';

// ── helpers ───────────────────────────────────────────────────────────────────

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin':  origin,
    'Access-Control-Allow-Methods': 'PATCH, DELETE, OPTIONS',
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

// ── PATCH ─────────────────────────────────────────────────────────────────────

async function handlePatch(request, env, templateId, CORS) {
  // Fetch existing record
  const obj = await env.ONBOARDING_R2.get(`operator-canned-responses/${templateId}.json`);
  if (!obj) {
    return json({ ok: false, error: 'not_found' }, 404, CORS);
  }
  let record;
  try { record = await obj.json(); }
  catch { return json({ ok: false, error: 'record_parse_error' }, 500, CORS); }

  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: 'invalid_json' }, 400, CORS); }

  // Mutable fields only
  const MUTABLE = ['label', 'subject', 'body', 'userType'];
  for (const key of MUTABLE) {
    if (body[key] !== undefined) record[key] = body[key];
  }
  record.updatedAt = new Date().toISOString();

  await env.ONBOARDING_R2.put(
    `operator-canned-responses/${templateId}.json`,
    JSON.stringify(record),
    { httpMetadata: { contentType: 'application/json' } }
  );

  return json({ ok: true, templateId, updatedAt: record.updatedAt }, 200, CORS);
}

// ── DELETE ────────────────────────────────────────────────────────────────────

async function handleDelete(request, env, templateId, CORS) {
  // Fetch existing record
  const obj = await env.ONBOARDING_R2.get(`operator-canned-responses/${templateId}.json`);
  if (!obj) {
    return json({ ok: false, error: 'not_found' }, 404, CORS);
  }
  let record;
  try { record = await obj.json(); }
  catch { return json({ ok: false, error: 'record_parse_error' }, 500, CORS); }

  // Guard: isDefault templates cannot be deleted
  if (record.isDefault === true) {
    return json({ ok: false, error: 'protected' }, 403, CORS);
  }

  await env.ONBOARDING_R2.delete(`operator-canned-responses/${templateId}.json`);

  return json({ ok: true, templateId, deleted: true }, 200, CORS);
}

// ── entry point ───────────────────────────────────────────────────────────────

export async function onRequest(context) {
  const { request, env, params } = context;
  const CORS = corsHeaders(request);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  const auth = await verifyOperatorToken(request, env);
  if (!auth.valid) {
    return json({ ok: false, error: 'unauthorized' }, 401, CORS);
  }

  const templateId = params.templateId;
  if (!templateId) {
    return json({ ok: false, error: 'missing_template_id' }, 400, CORS);
  }

  if (request.method === 'PATCH')  return handlePatch(request, env, templateId, CORS);
  if (request.method === 'DELETE') return handleDelete(request, env, templateId, CORS);

  return json({ ok: false, error: 'method_not_allowed' }, 405, CORS);
}
