// functions/operator/_verifyToken.js
// Shared Bearer token verification utility — imported by all operator handlers.
// Underscore prefix prevents Cloudflare Pages from treating this as a route handler.

/**
 * Verifies the Bearer token in the Authorization header against OPERATOR_SESSIONS KV.
 *
 * @param {Request} request
 * @param {object}  env — Cloudflare Pages Function env bindings
 * @returns {{ valid: boolean, token?: string, eventId?: string, error?: string }}
 */
export async function verifyOperatorToken(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'unauthorized' };
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return { valid: false, error: 'unauthorized' };
  }

  const sessionKey = `operator-session:${token}`;
  let raw;
  try {
    raw = await env.OPERATOR_SESSIONS.get(sessionKey);
  } catch (err) {
    console.error('KV session lookup failed:', err);
    return { valid: false, error: 'unauthorized' };
  }

  if (!raw) {
    return { valid: false, error: 'unauthorized' };
  }

  let session;
  try {
    session = JSON.parse(raw);
  } catch {
    return { valid: false, error: 'unauthorized' };
  }

  // Check expiry
  if (!session.expiresAt || Date.now() >= new Date(session.expiresAt).getTime()) {
    try {
      await env.OPERATOR_SESSIONS.delete(sessionKey);
    } catch (err) {
      console.error('KV expired session delete failed:', err);
    }
    return { valid: false, error: 'token_expired' };
  }

  return { valid: true, token: session.token, eventId: session.eventId };
}
