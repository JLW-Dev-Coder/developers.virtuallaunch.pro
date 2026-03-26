// functions/operator/developer.js
// Pages Function — GET /operator/developer?ref=VLP-xxx  (single record lookup)
//                  PATCH /operator/developer             (update record)
// Required bindings:
//   KV: OPERATOR_SESSIONS — for verifyOperatorToken
//   R2: ONBOARDING_R2 — onboarding records bucket

import { verifyOperatorToken } from './_verifyToken.js';

// Skill keys to extract and nest under `skills` in GET response
const SKILL_KEYS = [
  'skill_javascript', 'skill_python',     'skill_react',
  'skill_nodejs',     'skill_typescript',  'skill_aws',
  'skill_docker',     'skill_mongodb',     'skill_postgresql',
  'skill_other_skills'
];

// Fields that must never be overwritten by a PATCH
const IMMUTABLE_FIELDS = ['ref_number', 'email', 'eventId', 'createdAt'];

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin':  origin,
    'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
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

async function putRecord(env, key, data) {
  if (!env.ONBOARDING_R2) return;
  await env.ONBOARDING_R2.put(key, JSON.stringify(data), {
    httpMetadata: { contentType: 'application/json' }
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

  const url = new URL(request.url);
  const ref = url.searchParams.get('ref');
  if (!ref) {
    return json({ ok: false, error: 'ref_required' }, 400, CORS);
  }

  // ref == eventId — direct key lookup
  const recordKey = `onboarding-records/${ref}.json`;
  const record    = await getRecord(env, recordKey);
  if (!record) {
    return json({ ok: false, error: 'not_found' }, 404, CORS);
  }

  // Reshape: extract skill_* keys and nest under `skills`
  const skills = {};
  for (const key of SKILL_KEYS) {
    const raw = record[key];
    skills[key] = raw !== undefined && raw !== null && raw !== ''
      ? parseInt(raw, 10) || raw  // numeric skills as int, other_skills as string
      : null;
  }

  return json({
    ok:     true,
    record: {
      ref_number:           record.eventId         || record.ref_number || null,
      full_name:            record.full_name        || null,
      email:                record.email            || null,
      phone:                record.phone            || null,
      country:              record.country          || null,
      linkedin_url:         record.linkedin_url     || null,
      portfolio_url:        record.portfolio_url    || null,
      professional_summary: record.professional_summary || null,
      ideal_role:           record.ideal_role       || null,
      contract_type:        record.contract_type    || null,
      timezone:             record.timezone         || null,
      hourly_rate:          record.hourly_rate      || null,
      availability:         record.availability     || null,
      publish_profile:      record.publish_profile  === true,
      status:               record.status           || null,
      cronSchedule:         record.cronSchedule     || null,
      nextNotificationDue:  record.nextNotificationDue || null,
      skills,
      createdAt:            record.createdAt        || null,
      updatedAt:            record.updatedAt        || null
    }
  }, 200, CORS);
}

export async function onRequestPatch({ request, env }) {
  const CORS = corsHeaders(request);

  // verifyOperatorToken first — before anything else
  const auth = await verifyOperatorToken(request, env);
  if (!auth.valid) {
    return json({ ok: false, error: auth.error || 'unauthorized' }, 401, CORS);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400, CORS);
  }

  const { ref_number } = payload;
  if (!ref_number) {
    return json({ ok: false, error: 'ref_number_required' }, 400, CORS);
  }

  // ref_number == eventId — direct key lookup
  const recordKey    = `onboarding-records/${ref_number}.json`;
  const existingRecord = await getRecord(env, recordKey);
  if (!existingRecord) {
    return json({ ok: false, error: 'not_found' }, 404, CORS);
  }

  // Strip immutable fields from the incoming updates before merging
  const updates = { ...payload };
  for (const field of IMMUTABLE_FIELDS) {
    delete updates[field];
  }

  const updatedAt = new Date().toISOString();
  const merged    = { ...existingRecord, ...updates, updatedAt };

  // Restore immutable fields from existing record
  merged.ref_number = existingRecord.ref_number;
  merged.email      = existingRecord.email;
  merged.eventId    = existingRecord.eventId;
  merged.createdAt  = existingRecord.createdAt;

  await putRecord(env, recordKey, merged);

  return json({ ok: true, ref_number, updatedAt }, 200, CORS);
}
