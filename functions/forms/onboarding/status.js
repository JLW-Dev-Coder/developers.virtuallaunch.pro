// functions/forms/onboarding/status.js
// GET /forms/onboarding/status
// Public endpoint — no auth required.
// Returns status and lastUpdated only for the given VLP- reference ID.

export async function onRequestGet(context) {
  const { request, env } = context;

  const url = new URL(request.url);
  const referenceId = url.searchParams.get('referenceId');

  if (!referenceId) {
    return new Response(JSON.stringify({ ok: false, error: 'missing_referenceId' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Direct key lookup — referenceId === eventId === recordId === R2 key suffix.
  // Fresh records (POST only, never operator-PATCH'd) have eventId/recordId but not
  // ref_number, so a prefix scan comparing record.ref_number always returns undefined.
  const key = `onboarding-records/${referenceId}.json`;
  let record;
  try {
    const res = await env.ONBOARDING_R2.get(key);
    if (!res) {
      return new Response(JSON.stringify({ ok: false, error: 'not_found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    record = JSON.parse(await res.text());
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'not_found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({
    ok: true,
    referenceId,
    status: record.status,
    lastUpdated: record.updatedAt
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function onRequest(context) {
  if (context.request.method !== 'GET') {
    return new Response(JSON.stringify({ ok: false, error: 'method_not_allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  return onRequestGet(context);
}
