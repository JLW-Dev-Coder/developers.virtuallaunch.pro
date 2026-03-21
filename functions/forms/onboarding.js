// functions/forms/onboarding.js
// Pages Function — handles POST /forms/onboarding
// Requires R2 binding "ONBOARDING_R2" set in:
//   Cloudflare Dashboard → Pages → your-project → Settings → Functions → R2 bucket bindings

export async function onRequestPost({ request, env }) {
  const CORS = corsHeaders(request);

  try {
    const payload = await request.json();

    const requiredFields = ['confirmation', 'email', 'eventId', 'full_name'];
    for (const field of requiredFields) {
      if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
        return json({ ok: false, error: 'validation_failed' }, 400, CORS);
      }
    }

    if (payload.confirmation !== true) {
      return json({ ok: false, error: 'validation_failed' }, 400, CORS);
    }

    const recordKey = `onboarding-records/${payload.eventId}.json`;

    const existing = await getRecord(env, recordKey);
    if (existing) {
      return json(
        { deduped: true, eventId: payload.eventId, ok: true, status: 'already_submitted' },
        200, CORS
      );
    }

    const now = new Date().toISOString();
    await putRecord(env, recordKey, {
      ...payload,
      createdAt: now,
      status: 'submitted',
      updatedAt: now
    });

    return json({ eventId: payload.eventId, ok: true, status: 'submitted' }, 200, CORS);

  } catch (err) {
    console.error(err);
    return json({ ok: false, error: 'invalid_json' }, 400, CORS);
  }
}

export async function onRequestOptions({ request }) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age': '86400'
  };
}

function json(body, status, cors = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors }
  });
}

async function getRecord(env, key) {
  if (!env.ONBOARDING_R2) { console.warn('ONBOARDING_R2 binding missing'); return null; }
  const obj = await env.ONBOARDING_R2.get(key);
  if (!obj) return null;
  try { return await obj.json(); } catch { return null; }
}

async function putRecord(env, key, data) {
  if (!env.ONBOARDING_R2) { console.warn('ONBOARDING_R2 binding missing'); return; }
  await env.ONBOARDING_R2.put(key, JSON.stringify(data), {
    httpMetadata: { contentType: 'application/json' }
  });
}
