// functions/_shared/email.js
// Unified email dispatch — transactional via Gmail API, bulk via Resend
// All handlers import from here; never call gmail.js or Resend directly from a handler.

import { sendEmail } from './gmail.js';

const DEFAULT_FROM = 'team@virtuallaunch.pro';
const BATCH_SIZE   = 50;

/**
 * sendTransactionalEmail — single recipient via Gmail API
 * @param {object} env  - Cloudflare env (GOOGLE_PRIVATE_KEY, GOOGLE_CLIENT_EMAIL)
 * @param {object} opts - { to, subject, html, text, replyTo }
 * @returns {{ ok: true, messageId: null } | { ok: false, error: string }}
 * Never throws.
 */
export async function sendTransactionalEmail(env, { to, subject, html, text, replyTo }) {
  try {
    // Pass html separately so gmail.js can send multipart/alternative with HTML part.
    // Falls back to text-only if html is absent.
    await sendEmail(env, to, subject, text || '', html || null);
    return { ok: true, messageId: null };
  } catch (err) {
    console.error('sendTransactionalEmail failed:', err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * sendBulkEmail — multiple recipients via Resend batch API
 * @param {object} env   - Cloudflare env (RESEND_API_KEY, EMAIL_FROM)
 * @param {object} opts  - { recipients: string[], subject, html, text }
 * recipients must be deduplicated by the caller.
 * Sends in batches of 50. Per-batch errors are collected, not thrown.
 * @returns {{ ok: true, sent: number, failed: number, errors: object[] }}
 */
export async function sendBulkEmail(env, { recipients, subject, html, text }) {
  const from   = env.EMAIL_FROM || DEFAULT_FROM;
  const apiKey = env.RESEND_API_KEY;

  let sent   = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE).map(to => ({
      from,
      to,
      subject,
      html,
      text
    }));

    try {
      const res = await fetch('https://api.resend.com/emails/batch', {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type':  'application/json'
        },
        body: JSON.stringify(batch)
      });

      if (!res.ok) {
        const errText = await res.text();
        const msg = `Resend batch error ${res.status}: ${errText}`;
        console.error(msg);
        failed += batch.length;
        errors.push({ batchIndex: Math.floor(i / BATCH_SIZE), error: msg });
      } else {
        sent += batch.length;
      }
    } catch (err) {
      console.error('sendBulkEmail batch fetch failed:', err.message);
      failed += batch.length;
      errors.push({ batchIndex: Math.floor(i / BATCH_SIZE), error: err.message });
    }
  }

  return { ok: true, sent, failed, errors };
}

/**
 * sendEmailDryRun — no API call; returns dry-run receipt shape
 * @param {string[]} recipients
 * @returns {{ ok: true, recipientCount: number, dryRun: true, sent: false }}
 */
export function sendEmailDryRun(recipients) {
  return { ok: true, recipientCount: recipients.length, dryRun: true, sent: false };
}
