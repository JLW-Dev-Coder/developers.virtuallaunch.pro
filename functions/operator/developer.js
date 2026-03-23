// functions/operator/developer.js
// GET /operator/developer?ref=VLP-xxx — returns name + email for a developer ref

import { verifyToken } from '../_shared/auth.js';

export async function onRequestGet({ request, env }) {
  const CORS = corsHeaders(request);

  const auth = await verifyToken(request, env);
  if (!auth.valid) return json({ ok: false, error: 'unauthorized' }, 401, CORS);

  const url = new URL(request.url);
  const ref = url.searchParams.get('ref');

  if (!ref) return json({ ok: false, error: 'missing_ref' }, 400, CORS);

  if (!env.ONBOARDING_R2) return json({ ok: false, error: 'not_found' }, 404, CORS);

  const obj = await env.ONBOARDING_R2.get(`onboarding-records/${ref}.json`);
  if (!obj) return json({ ok: false, error: 'not_found' }, 404, CORS);

  try {
    const record = await obj.json();
    return json({ ok: true, name: record.full_name || '', email: record.email || '' }, 200, CORS);
  } catch {
    return json({ ok: false, error: 'not_found' }, 404, CORS);
  }
}

export async function onRequestOptions({ request }) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin':  origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
