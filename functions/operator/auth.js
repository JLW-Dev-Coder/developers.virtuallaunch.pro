// functions/operator/auth.js
// POST /operator/auth — validates operator credentials and returns a signed token

async function hmacSign(data, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function onRequestPost({ request, env }) {
  const CORS = corsHeaders(request);

  try {
    const { email, accessCode } = await request.json();

    if (!email || !accessCode) {
      return json({ ok: false, error: 'invalid_credentials' }, 401, CORS);
    }

    if (accessCode !== env.OPERATOR_ACCESS_CODE || email !== env.OPERATOR_EMAIL) {
      return json({ ok: false, error: 'invalid_credentials' }, 401, CORS);
    }

    // Build token: base64url(payload) + "." + HMAC-SHA256 signature
    const now        = Math.floor(Date.now() / 1000);
    const payloadObj = { email, exp: now + 8 * 3600 };
    const payloadB64 = btoa(JSON.stringify(payloadObj))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const sig   = await hmacSign(payloadB64, env.OPERATOR_SECRET);
    const token = `${payloadB64}.${sig}`;

    return json({ ok: true, token }, 200, CORS);

  } catch (err) {
    return json({ ok: false, error: 'invalid_request' }, 400, CORS);
  }
}

export async function onRequestOptions({ request }) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin':  origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
