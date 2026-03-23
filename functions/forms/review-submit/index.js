// functions/forms/review-submit/index.js
// GET  /forms/review-submit  — returns all reviews newest-first
// POST /forms/review-submit  — saves a new review per contract
// Requires R2 binding "ONBOARDING_R2"

export async function onRequestGet({ request, env }) {
  const CORS = corsHeaders(request);

  if (!env.ONBOARDING_R2) {
    return json({ ok: true, reviews: [] }, 200, CORS);
  }

  // List all individual review objects
  const objects = [];
  let list = await env.ONBOARDING_R2.list({ prefix: 'reviews/' });
  objects.push(...list.objects);
  while (list.truncated) {
    list = await env.ONBOARDING_R2.list({ prefix: 'reviews/', cursor: list.cursor });
    objects.push(...list.objects);
  }

  // Fetch each record
  const reviews = [];
  for (const obj of objects) {
    const item = await env.ONBOARDING_R2.get(obj.key);
    if (!item) continue;
    try { reviews.push(await item.json()); } catch { /* skip malformed */ }
  }

  // Sort newest first
  reviews.sort((a, b) => {
    const ta = a.createdAt || a.created_at || '';
    const tb = b.createdAt || b.created_at || '';
    return tb.localeCompare(ta);
  });

  return json({ ok: true, reviews }, 200, CORS);
}

export async function onRequestPost({ request, env }) {
  const CORS = corsHeaders(request);
  try {
    const payload = await request.json();

    // Validate required fields per contract
    const required = ['eventId', 'author_name', 'author_email', 'author_role', 'rating', 'review_text'];
    for (const f of required) {
      if (payload[f] === undefined || payload[f] === null || payload[f] === '') {
        return json({ ok: false, error: 'validation_failed' }, 400, CORS);
      }
    }

    if (typeof payload.rating !== 'number' || payload.rating < 1 || payload.rating > 5) {
      return json({ ok: false, error: 'validation_failed' }, 400, CORS);
    }

    const recordKey = `reviews/${payload.eventId}.json`;

    // Dedupe check
    if (env.ONBOARDING_R2) {
      const existing = await env.ONBOARDING_R2.get(recordKey);
      if (existing) {
        return json({ deduped: true, eventId: payload.eventId, ok: true }, 200, CORS);
      }
    }

    const now = new Date().toISOString();
    const record = {
      eventId:      payload.eventId,
      author_name:  String(payload.author_name).slice(0, 100),
      author_email: String(payload.author_email).slice(0, 200),
      author_role:  String(payload.author_role).slice(0, 100),
      rating:       payload.rating,
      review_text:  String(payload.review_text).slice(0, 5000),
      createdAt:    now,
      status:       'submitted'
    };

    if (env.ONBOARDING_R2) {
      await env.ONBOARDING_R2.put(recordKey, JSON.stringify(record), {
        httpMetadata: { contentType: 'application/json' }
      });
    }

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
  return {
    'Access-Control-Allow-Origin':  request.headers.get('Origin') || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age':       '86400'
  };
}

function json(body, status, cors = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors }
  });
}
