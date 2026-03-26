// functions/operator/submissions.js
// Pages Function — GET /operator/submissions
// Required bindings:
//   KV: OPERATOR_SESSIONS — for verifyOperatorToken
//   R2: ONBOARDING_R2 — onboarding records bucket

import { verifyOperatorToken } from './_verifyToken.js';

const STATUS_ENUM   = ['pending', 'active', 'complete', 'archived'];
const TYPE_ENUM     = ['developer', 'client'];
const CRON_ENUM     = ['3 days', '7 days', '14 days'];
const DEFAULT_LIMIT = 25;
const MAX_LIMIT     = 100;

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

export async function onRequestOptions({ request }) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export async function onRequestGet({ request, env }) {
  const CORS = corsHeaders(request);

  // verifyOperatorToken first — before anything else
  const auth = await verifyOperatorToken(request, env);
  if (!auth.valid) {
    return json({ ok: false, error: auth.error || 'unauthorized' }, 401, CORS);
  }

  const url          = new URL(request.url);
  const statusFilter = url.searchParams.get('status')       || null;
  const typeFilter   = url.searchParams.get('type')         || null;
  const skillFilter  = url.searchParams.get('skill')        || null;
  const publishRaw   = url.searchParams.get('publish')      || null;
  const cronFilter   = url.searchParams.get('cronSchedule') || null;
  const pageRaw      = parseInt(url.searchParams.get('page')  || '1', 10);
  const limitRaw     = parseInt(url.searchParams.get('limit') || String(DEFAULT_LIMIT), 10);

  const page  = isNaN(pageRaw)  || pageRaw  < 1 ? 1            : pageRaw;
  const limit = isNaN(limitRaw) || limitRaw < 1 ? DEFAULT_LIMIT : Math.min(MAX_LIMIT, limitRaw);

  // Validate enums
  if (statusFilter && !STATUS_ENUM.includes(statusFilter)) {
    return json({ ok: false, error: 'invalid_enum', field: 'status' }, 400, CORS);
  }
  if (typeFilter && !TYPE_ENUM.includes(typeFilter)) {
    return json({ ok: false, error: 'invalid_enum', field: 'type' }, 400, CORS);
  }
  if (cronFilter && !CRON_ENUM.includes(cronFilter)) {
    return json({ ok: false, error: 'invalid_enum', field: 'cronSchedule' }, 400, CORS);
  }

  // List all R2 records — handle R2 pagination (>1000 objects)
  const allRecords = [];
  let cursor;
  do {
    const listOpts = { prefix: 'onboarding-records/' };
    if (cursor) listOpts.cursor = cursor;
    const listed = await env.ONBOARDING_R2.list(listOpts);
    const batch  = await Promise.all(
      listed.objects.map(async (obj) => {
        const res = await env.ONBOARDING_R2.get(obj.key);
        if (!res) return null;
        try { return JSON.parse(await res.text()); } catch { return null; }
      })
    );
    allRecords.push(...batch.filter(Boolean));
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);

  // Apply filters
  let filtered = allRecords;

  if (statusFilter) {
    filtered = filtered.filter(r => r.status === statusFilter);
  }
  if (typeFilter) {
    filtered = filtered.filter(r => r.userType === typeFilter);
  }
  if (skillFilter) {
    // match if record[skill] is not null and >= 1 (e.g. skill_javascript)
    filtered = filtered.filter(r => {
      const val = parseInt(r[skillFilter], 10);
      return !isNaN(val) && val >= 1;
    });
  }
  if (publishRaw !== null) {
    const publishBool = publishRaw === 'true';
    filtered = filtered.filter(r => r.publish_profile === publishBool);
  }
  if (cronFilter) {
    filtered = filtered.filter(r => r.cronSchedule === cronFilter);
  }

  const total     = filtered.length;
  const offset    = (page - 1) * limit;
  const paginated = filtered.slice(offset, offset + limit);

  return json({
    ok:      true,
    page,
    limit,
    total,
    results: paginated.map(r => ({
      ref_number:      r.eventId        || r.ref_number  || null,
      full_name:       r.full_name      || null,
      email:           r.email          || null,
      status:          r.status         || null,
      publish_profile: r.publish_profile === true,
      cronSchedule:    r.cronSchedule   || null,
      createdAt:       r.createdAt      || null,
      updatedAt:       r.updatedAt      || null
    }))
  }, 200, CORS);
}
