// functions/forms/onboarding.js
// Pages Function — handles POST /forms/onboarding
// Required bindings (Pages → Settings → Functions):
//   R2:     ONBOARDING_R2  → onboarding-records bucket
//   Secret: GOOGLE_PRIVATE_KEY → your Google service account private key
//   Secret: GOOGLE_CLIENT_EMAIL → your Google service account email

import { sendEmail } from '../_shared/gmail.js';

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

    // Send confirmation email (non-blocking — don't fail submission if email fails)
    try {
      await sendConfirmationEmail(env, payload.email, payload.full_name, payload.eventId);
    } catch (emailErr) {
      console.error('Email send failed (non-fatal):', emailErr);
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

// ── Email ──────────────────────────────────────────────────────────────────────

async function sendConfirmationEmail(env, toEmail, toName, referenceNumber) {
  const subject = 'Your Virtual Launch Pro Reference Number & Next Steps';
  const body    = buildEmailBody(toName, referenceNumber);
  await sendEmail(env, toEmail, subject, body);
}

function buildEmailBody(name, referenceNumber) {
  return `Hi there,

Thank you for submitting your form and completing your payment. Your reference number is:

${referenceNumber}

Please keep this number handy — you'll need it to check your submission status anytime on Virtual Launch Pro.

Here's what you get as part of your membership:

  • Personalized Job Matches — Opportunities curated specifically for your skills.
  • Direct Introductions — We connect you directly with the opportunity posters.
  • Profile Amplification — Your profile gets more visibility to relevant opportunities.
  • Time-Saving Automation — Spend less time searching and more time applying.
  • Real-Time Notifications — Get instant updates on new matches and connections.

We also provide onboarding guidance to help you get started quickly and make the most of every opportunity.

Welcome aboard, and we look forward to helping you find your next freelance or contract opportunity faster and easier.

Regards,
Virtual Launch Pro Team`;
}

// ── R2 helpers ────────────────────────────────────────────────────────────────

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin':  origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
