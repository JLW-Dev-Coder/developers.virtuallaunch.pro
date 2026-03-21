// functions/forms/reviews/index.js
// GET  /forms/reviews        — returns all reviews newest-first
// POST /forms/reviews        — saves a new review
// Requires R2 binding "ONBOARDING_R2" (same bucket, different key prefix)

const REVIEWS_KEY = 'reviews/all.json';

export async function onRequestGet({ request, env }) {
  const CORS = corsHeaders(request);
  const reviews = await loadReviews(env);
  return json({ ok: true, reviews }, 200, CORS);
}

export async function onRequestPost({ request, env }) {
  const CORS = corsHeaders(request);
  try {
    const payload = await request.json();

    if (!payload.author_name || !payload.review_text || !payload.rating) {
      return json({ ok: false, error: 'missing_fields' }, 400, CORS);
    }

    if (typeof payload.rating !== 'number' || payload.rating < 1 || payload.rating > 5) {
      return json({ ok: false, error: 'invalid_rating' }, 400, CORS);
    }

    const reviews = await loadReviews(env);
    const record  = {
      id:           `rev-${Date.now()}`,
      author_name:  String(payload.author_name).slice(0, 80),
      author_email: String(payload.author_email || '').slice(0, 120),
      author_role:  String(payload.author_role  || '').slice(0, 80),
      rating:       payload.rating,
      review_text:  String(payload.review_text).slice(0, 1000),
      created_at:   new Date().toISOString()
    };

    reviews.unshift(record);            // newest first
    await saveReviews(env, reviews);

    return json({ ok: true, review: record }, 200, CORS);
  } catch (err) {
    console.error(err);
    return json({ ok: false, error: 'invalid_json' }, 400, CORS);
  }
}

export async function onRequestOptions({ request }) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

// ── R2 helpers ────────────────────────────────────────────────────────────────

async function loadReviews(env) {
  if (!env.ONBOARDING_R2) return [];
  const obj = await env.ONBOARDING_R2.get(REVIEWS_KEY);
  if (!obj) return [];
  try { return await obj.json(); } catch { return []; }
}

async function saveReviews(env, reviews) {
  if (!env.ONBOARDING_R2) return;
  await env.ONBOARDING_R2.put(REVIEWS_KEY, JSON.stringify(reviews), {
    httpMetadata: { contentType: 'application/json' }
  });
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
