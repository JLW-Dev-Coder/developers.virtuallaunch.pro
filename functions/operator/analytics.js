// functions/operator/analytics.js
// GET /operator/analytics — aggregates dashboard stats

import { verifyToken } from '../_shared/auth.js';

export async function onRequestGet({ request, env }) {
  const CORS = corsHeaders(request);

  const auth = await verifyToken(request, env);
  if (!auth.valid) return json({ ok: false, error: 'unauthorized' }, 401, CORS);

  if (!env.ONBOARDING_R2) {
    return json({ ok: true, analytics: { complete: 0, pending: 0, upcoming: 0,
      totalPosts: 0, activeDevelopers: 0, avgPostsPerDeveloper: 0 } }, 200, CORS);
  }

  const objects = [];
  let list = await env.ONBOARDING_R2.list({ prefix: 'dashboard-records/' });
  objects.push(...list.objects);
  while (list.truncated) {
    list = await env.ONBOARDING_R2.list({ prefix: 'dashboard-records/', cursor: list.cursor });
    objects.push(...list.objects);
  }

  let complete = 0, pending = 0, upcoming = 0, totalPosts = 0, activeDevelopers = 0;

  for (const obj of objects) {
    const item = await env.ONBOARDING_R2.get(obj.key);
    if (!item) continue;
    let record;
    try { record = await item.json(); } catch { continue; }

    const posts  = record.posts || [];
    const status = record.status || 'pending';

    if (status === 'complete')       complete++;
    else if (status === 'upcoming')  upcoming++;
    else                             pending++;

    totalPosts += posts.length;
    if (posts.length > 0) activeDevelopers++;
  }

  const totalDevs            = objects.length;
  const avgPostsPerDeveloper = totalDevs > 0
    ? parseFloat((totalPosts / totalDevs).toFixed(1))
    : 0;

  return json({
    ok: true,
    analytics: { complete, pending, upcoming, totalPosts, activeDevelopers, avgPostsPerDeveloper }
  }, 200, CORS);
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
