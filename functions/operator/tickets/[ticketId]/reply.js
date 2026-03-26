// functions/operator/tickets/[ticketId]/reply.js
// POST /operator/tickets/{ticketId}/reply — operator reply to a support ticket
// Response: { ok, ticketId, eventId, repliedAt }

import { verifyOperatorToken }  from '../../../_verifyToken.js';
import { sendTransactionalEmail } from '../../../../_shared/email.js';
import { supportTicketReply }   from '../../../../_shared/emailTemplates.js';

// ── helpers ───────────────────────────────────────────────────────────────────

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

// ── entry point ───────────────────────────────────────────────────────────────

export async function onRequest(context) {
  const { request, env, params } = context;
  const CORS = corsHeaders(request);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  // 1. Verify token
  const auth = await verifyOperatorToken(request, env);
  if (!auth.valid) {
    return json({ ok: false, error: 'unauthorized' }, 401, CORS);
  }

  if (request.method !== 'POST') {
    return json({ ok: false, error: 'method_not_allowed' }, 405, CORS);
  }

  // 2. Extract ticketId from route params
  const ticketId = params.ticketId;
  if (!ticketId) {
    return json({ ok: false, error: 'missing_ticket_id' }, 400, CORS);
  }

  // 3. Parse + validate body
  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: 'invalid_json' }, 400, CORS); }

  const { eventId, body: replyBody, templateId } = body;
  if (!eventId || !replyBody) {
    return json({ ok: false, error: 'missing_required_fields', required: ['eventId', 'body'] }, 400, CORS);
  }

  // 4. Fetch ticket record
  const ticketObj = await env.ONBOARDING_R2.get(`support-records/${ticketId}.json`);
  if (!ticketObj) {
    return json({ ok: false, error: 'not_found' }, 404, CORS);
  }
  let ticket;
  try { ticket = await ticketObj.json(); }
  catch { return json({ ok: false, error: 'record_parse_error' }, 500, CORS); }

  const repliedAt = new Date().toISOString();

  // 5. Write reply
  const replyRecord = {
    eventId,
    ticketId,
    body:      replyBody,
    direction: 'outbound',
    repliedAt,
    ...(templateId ? { templateId } : {})
  };
  await env.ONBOARDING_R2.put(
    `support-records/${ticketId}/replies/${eventId}.json`,
    JSON.stringify(replyRecord),
    { httpMetadata: { contentType: 'application/json' } }
  );

  // 6. Update ticket status to 'in_progress' if currently 'open'
  if (!ticket.status || ticket.status === 'open') {
    ticket.status    = 'in_progress';
    ticket.updatedAt = repliedAt;
    await env.ONBOARDING_R2.put(
      `support-records/${ticketId}.json`,
      JSON.stringify(ticket),
      { httpMetadata: { contentType: 'application/json' } }
    );
  }

  // 7. Send reply email — never abort on failure
  const submitterEmail = ticket.email || ticket.submitterEmail || null;
  const ticketSubject  = ticket.subject || 'Support Ticket';
  const clientRef      = ticket.clientRef || ticket.ref_number || ticketId;

  if (submitterEmail) {
    try {
      const { html, text, subject } = supportTicketReply({
        clientRef,
        subject:   ticketSubject,
        replyBody
      });
      await sendTransactionalEmail(env, { to: submitterEmail, subject, html, text });
    } catch (err) {
      console.error('tickets/reply.js email send failed:', err.message);
    }
  }

  return json({ ok: true, ticketId, eventId, repliedAt }, 200, CORS);
}
