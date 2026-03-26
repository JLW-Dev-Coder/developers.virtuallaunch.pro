// functions/operator/tickets/index.js
// GET /operator/tickets — list all support tickets with optional ?status filter
// Response: { ok, results: [{ ticketId, clientRef, subject, status, submittedAt, replyCount }] }

import { verifyOperatorToken } from '../_verifyToken.js';

// ── helpers ───────────────────────────────────────────────────────────────────

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

async function countReplies(r2, ticketId) {
  let count = 0;
  try {
    const prefix = `support-records/${ticketId}/replies/`;
    let list = await r2.list({ prefix });
    count += list.objects.length;
    while (list.truncated) {
      list = await r2.list({ prefix, cursor: list.cursor });
      count += list.objects.length;
    }
  } catch {
    // prefix not found — count stays 0
  }
  return count;
}

// ── entry point ───────────────────────────────────────────────────────────────

export async function onRequest(context) {
  const { request, env } = context;
  const CORS = corsHeaders(request);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  const auth = await verifyOperatorToken(request, env);
  if (!auth.valid) {
    return json({ ok: false, error: 'unauthorized' }, 401, CORS);
  }

  if (request.method !== 'GET') {
    return json({ ok: false, error: 'method_not_allowed' }, 405, CORS);
  }

  const url          = new URL(request.url);
  const statusFilter = url.searchParams.get('status') || null;

  // List all support-records/ objects (top-level only — skip reply sub-keys)
  const ticketObjects = [];
  try {
    let list = await env.ONBOARDING_R2.list({ prefix: 'support-records/' });
    ticketObjects.push(...list.objects);
    while (list.truncated) {
      list = await env.ONBOARDING_R2.list({ prefix: 'support-records/', cursor: list.cursor });
      ticketObjects.push(...list.objects);
    }
  } catch (err) {
    console.error('tickets/index.js list error:', err.message);
  }

  // Only include top-level ticket files (pattern: support-records/{ticketId}.json)
  const topLevel = ticketObjects.filter(obj => {
    const parts = obj.key.replace('support-records/', '').split('/');
    return parts.length === 1 && parts[0].endsWith('.json');
  });

  const results = [];
  for (const obj of topLevel) {
    try {
      const item = await env.ONBOARDING_R2.get(obj.key);
      if (!item) continue;
      const ticket = await item.json();

      if (statusFilter && ticket.status !== statusFilter) continue;

      const ticketId = ticket.ticketId || ticket.eventId || obj.key.replace('support-records/', '').replace('.json', '');
      const replyCount = await countReplies(env.ONBOARDING_R2, ticketId);

      results.push({
        ticketId,
        clientRef:   ticket.clientRef   || ticket.ref_number || null,
        subject:     ticket.subject     || null,
        status:      ticket.status      || 'open',
        submittedAt: ticket.submittedAt || ticket.createdAt || null,
        replyCount
      });
    } catch {
      // skip unparseable ticket
    }
  }

  return json({ ok: true, results }, 200, CORS);
}
