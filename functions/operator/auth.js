// functions/operator/auth.js
// Pages Function — POST /operator/auth
// Required bindings (Pages → Settings → Functions):
//   KV:     OPERATOR_SESSIONS → operator session token store
//   Secret: OPERATOR_KEY      → operator API key

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function onRequestPost({ request, env }) {
  // Validate x-operator-key header
  const operatorKey = request.headers.get('x-operator-key');
  if (!operatorKey) {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }
  if (operatorKey !== env.OPERATOR_KEY) {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }

  // Parse JSON body
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: 'validation_failed' }, 400);
  }

  if (!payload.eventId || typeof payload.eventId !== 'string' || payload.eventId.length === 0) {
    return json({ ok: false, error: 'validation_failed' }, 400);
  }

  const { eventId } = payload;

  // Deduplication check
  const dedupeKey = `operator-dedupe:${eventId}`;
  let existingToken = null;
  try {
    existingToken = await env.OPERATOR_SESSIONS.get(dedupeKey);
  } catch (err) {
    console.error('KV dedupe lookup failed:', err);
  }

  if (existingToken) {
    return json({ ok: true, deduped: true, eventId, token: existingToken }, 200);
  }

  // Generate new session token
  const token     = crypto.randomUUID();
  const now       = Date.now();
  const expiresAt = new Date(now + 28800000).toISOString();
  const createdAt = new Date(now).toISOString();

  const sessionValue = JSON.stringify({ token, eventId, createdAt, expiresAt });

  try {
    await env.OPERATOR_SESSIONS.put(`operator-session:${token}`, sessionValue, { expirationTtl: 28800 });
    await env.OPERATOR_SESSIONS.put(dedupeKey, token, { expirationTtl: 28800 });
  } catch (err) {
    console.error('KV session write failed:', err);
    return json({ ok: false, error: 'internal_error' }, 500);
  }

  return json({ ok: true, eventId, token, expiresAt }, 201);
}

export async function onRequest({ request }) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }
  return new Response(JSON.stringify({ ok: false, error: 'method_not_allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
}
