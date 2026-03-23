// functions/operator/developers.js
// GET /operator/developers — lists all dashboard records

import { verifyToken } from '../_shared/auth.js';

export async function onRequestGet({ request, env }) {
  const CORS = corsHeaders(request);

  const auth = await verifyToken(request, env);
  if (!auth.valid) return json({ ok: false, error: 'unauthorized' }, 401, CORS);

  if (!env.ONBOARDING_R2) return json({ ok: true, developers: [] }, 200, CORS);

  const objects = [];
  let list = await env.ONBOARDING_R2.list({ prefix: 'dashboard-records/' });
  objects.push(...list.objects);
  while (list.truncated) {
    list = await env.ONBOARDING_R2.list({ prefix: 'dashboard-records/', cursor: list.cursor });
    objects.push(...list.objects);
  }

  const developers = [];
  for (const obj of objects) {
    const record = await env.ONBOARDING_R2.get(obj.key);
    if (!record) continue;
    try { developers.push(await record.json()); } catch { /* skip */ }
  }

  return json({ ok: true, developers }, 200, CORS);
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
