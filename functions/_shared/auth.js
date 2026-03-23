// functions/_shared/auth.js
// Shared operator token verifier — imported by all operator/* functions

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

export async function verifyToken(request, env) {
  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return { valid: false };

  const token   = auth.slice(7).trim();
  const dotIdx  = token.lastIndexOf('.');
  if (dotIdx === -1) return { valid: false };

  const payloadPart = token.slice(0, dotIdx);
  const sigPart     = token.slice(dotIdx + 1);

  // Verify HMAC signature
  const expectedSig = await hmacSign(payloadPart, env.OPERATOR_SECRET);
  if (expectedSig !== sigPart) return { valid: false };

  // Decode and validate payload
  try {
    const padded  = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const pad     = padded.length % 4;
    const json    = atob(pad ? padded + '='.repeat(4 - pad) : padded);
    const payload = JSON.parse(json);
    if (payload.exp < Math.floor(Date.now() / 1000)) return { valid: false };
    return { valid: true, email: payload.email };
  } catch {
    return { valid: false };
  }
}
