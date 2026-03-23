// functions/operator/submissions.js
// GET /operator/submissions — lists all onboarding records with dashboard status

import { verifyToken } from '../_shared/auth.js';

export async function onRequestGet({ request, env }) {
  const CORS = corsHeaders(request);

  const auth = await verifyToken(request, env);
  if (!auth.valid) return json({ ok: false, error: 'unauthorized' }, 401, CORS);

  if (!env.ONBOARDING_R2) return json({ ok: true, submissions: [] }, 200, CORS);

  // List all onboarding records
  const objects = [];
  let list = await env.ONBOARDING_R2.list({ prefix: 'onboarding-records/' });
  objects.push(...list.objects);
  while (list.truncated) {
    list = await env.ONBOARDING_R2.list({ prefix: 'onboarding-records/', cursor: list.cursor });
    objects.push(...list.objects);
  }

  const submissions = [];
  for (const obj of objects) {
    const record = await getRecord(env, obj.key);
    if (!record) continue;

    const dash = await getRecord(env, `dashboard-records/${record.eventId}.json`);

    submissions.push({
      ref:                record.eventId,
      full_name:          record.full_name   || '',
      email:              record.email       || '',
      posts:              dash ? (dash.posts || []).length : 0,
      status:             dash ? (dash.status || 'pending') : 'pending',
      createdAt:          record.createdAt,
      nextNotificationDue: dash ? (dash.nextNotificationDue || null) : null
    });
  }

  return json({ ok: true, submissions }, 200, CORS);
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

async function getRecord(env, key) {
  const obj = await env.ONBOARDING_R2.get(key);
  if (!obj) return null;
  try { return await obj.json(); } catch { return null; }
}
