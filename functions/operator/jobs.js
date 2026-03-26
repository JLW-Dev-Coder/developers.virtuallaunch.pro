// functions/operator/jobs.js
// GET   /operator/jobs          — list job posts (optional ?status=open|closed)
// POST  /operator/jobs          — create a job post
// PATCH /operator/jobs/{jobId}  — update a job post
// Required bindings: OPERATOR_SESSIONS (KV), ONBOARDING_R2 (R2)

import { verifyOperatorToken } from './_verifyToken.js';

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin':  origin,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
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

async function listAllJobs(env) {
  const objects = [];
  let list = await env.ONBOARDING_R2.list({ prefix: 'job-posts/' });
  objects.push(...list.objects);
  while (list.truncated) {
    list = await env.ONBOARDING_R2.list({ prefix: 'job-posts/', cursor: list.cursor });
    objects.push(...list.objects);
  }
  return objects;
}

// ── GET ─────────────────────────────────────────────────────────────────────

async function handleGet(request, env) {
  const CORS = corsHeaders(request);

  const auth = await verifyOperatorToken(request, env);
  if (!auth.valid) return json({ ok: false, error: 'unauthorized' }, 401, CORS);

  if (!env.ONBOARDING_R2) return json({ ok: true, results: [] }, 200, CORS);

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get('status') || null;

  const objects = await listAllJobs(env);

  const results = [];
  for (const obj of objects) {
    const record = await getRecord(env, obj.key);
    if (!record) continue;
    if (statusFilter && record.status !== statusFilter) continue;
    results.push({
      jobId:           record.jobId,
      title:           record.title,
      status:          record.status,
      createdAt:       record.createdAt,
      required_skills: record.required_skills || []
    });
  }

  return json({ ok: true, results }, 200, CORS);
}

// ── POST ────────────────────────────────────────────────────────────────────

async function handlePost(request, env) {
  const CORS = corsHeaders(request);

  const auth = await verifyOperatorToken(request, env);
  if (!auth.valid) return json({ ok: false, error: 'unauthorized' }, 401, CORS);

  let payload;
  try { payload = await request.json(); } catch {
    return json({ ok: false, error: 'validation_failed' }, 400, CORS);
  }

  const { eventId, title, description, required_skills, budget, duration } = payload;

  if (!eventId || typeof eventId !== 'string' || !eventId.length) {
    return json({ ok: false, error: 'validation_failed', field: 'eventId' }, 400, CORS);
  }
  if (!title || typeof title !== 'string' || !title.length) {
    return json({ ok: false, error: 'validation_failed', field: 'title' }, 400, CORS);
  }
  if (!description || typeof description !== 'string' || !description.length) {
    return json({ ok: false, error: 'validation_failed', field: 'description' }, 400, CORS);
  }

  // Dedupe check
  const dedupeKey = `operator-dedupe:job:${eventId}`;
  let existingDedupe = null;
  try {
    existingDedupe = await env.OPERATOR_SESSIONS.get(dedupeKey);
  } catch (err) {
    console.error('KV dedupe lookup failed:', err);
  }
  if (existingDedupe) {
    return json({ ok: true, deduped: true, eventId }, 200, CORS);
  }

  if (!env.ONBOARDING_R2) return json({ ok: false, error: 'storage_unavailable' }, 500, CORS);

  const now = new Date().toISOString();
  const record = {
    jobId:           eventId,
    eventId,
    title,
    description,
    required_skills: Array.isArray(required_skills) ? required_skills : [],
    budget:          budget   || null,
    duration:        duration || null,
    status:          'open',
    createdAt:       now,
    updatedAt:       now
  };

  try {
    await env.ONBOARDING_R2.put(
      `job-posts/${eventId}.json`,
      JSON.stringify(record),
      { httpMetadata: { contentType: 'application/json' } }
    );
  } catch (err) {
    console.error('R2 job write failed:', err);
    return json({ ok: false, error: 'internal_error' }, 500, CORS);
  }

  try {
    await env.OPERATOR_SESSIONS.put(dedupeKey, eventId, { expirationTtl: 86400 });
  } catch (err) {
    console.error('KV dedupe write failed (non-fatal):', err);
  }

  return json({ ok: true, jobId: eventId, eventId, status: 'open' }, 201, CORS);
}

// ── PATCH ───────────────────────────────────────────────────────────────────

async function handlePatch(request, env) {
  const CORS = corsHeaders(request);

  const auth = await verifyOperatorToken(request, env);
  if (!auth.valid) return json({ ok: false, error: 'unauthorized' }, 401, CORS);

  // Extract jobId from URL path: /operator/jobs/{jobId}
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const jobId = pathParts[pathParts.length - 1];

  if (!jobId || jobId === 'jobs') {
    return json({ ok: false, error: 'validation_failed', field: 'jobId' }, 400, CORS);
  }

  if (!env.ONBOARDING_R2) return json({ ok: false, error: 'storage_unavailable' }, 500, CORS);

  const existing = await getRecord(env, `job-posts/${jobId}.json`);
  if (!existing) return json({ ok: false, error: 'not_found' }, 404, CORS);

  let updates;
  try { updates = await request.json(); } catch {
    return json({ ok: false, error: 'validation_failed' }, 400, CORS);
  }

  // Immutable fields — strip from updates then restore from existing
  const { jobId: _jId, eventId: _eId, createdAt: _cAt, ...mutableUpdates } = updates;

  const now = new Date().toISOString();
  const merged = {
    ...existing,
    ...mutableUpdates,
    jobId:     existing.jobId,
    eventId:   existing.eventId,
    createdAt: existing.createdAt,
    updatedAt: now
  };

  try {
    await env.ONBOARDING_R2.put(
      `job-posts/${jobId}.json`,
      JSON.stringify(merged),
      { httpMetadata: { contentType: 'application/json' } }
    );
  } catch (err) {
    console.error('R2 job patch failed:', err);
    return json({ ok: false, error: 'internal_error' }, 500, CORS);
  }

  return json({ ok: true, jobId, status: merged.status, updatedAt: now }, 200, CORS);
}

// ── Router ──────────────────────────────────────────────────────────────────

export async function onRequest({ request, env }) {
  const CORS = corsHeaders(request);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (request.method === 'GET')   return handleGet(request, env);
  if (request.method === 'POST')  return handlePost(request, env);
  if (request.method === 'PATCH') return handlePatch(request, env);
  return json({ ok: false, error: 'method_not_allowed' }, 405, CORS);
}
