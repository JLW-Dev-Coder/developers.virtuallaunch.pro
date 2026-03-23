// functions/operator/post.js
// POST /operator/post — records a post submission for a developer

import { verifyToken } from '../_shared/auth.js';
import { sendEmail } from '../_shared/gmail.js';

export async function onRequestPost({ request, env }) {
  const CORS = corsHeaders(request);

  const auth = await verifyToken(request, env);
  if (!auth.valid) return json({ ok: false, error: 'unauthorized' }, 401, CORS);

  try {
    const body = await request.json();
    const { developerRef, developerName, posterName, postContent, postUrl,
            dueDate, cronSchedule, nextNotificationDue } = body;

    if (!developerRef || !postContent) {
      return json({ ok: false, error: 'validation_failed' }, 400, CORS);
    }

    // Load or create dashboard record
    const dashKey  = `dashboard-records/${developerRef}.json`;
    const existing = (await getRecord(env, dashKey)) || { developerRef, posts: [] };

    const now     = new Date().toISOString();
    const newPost = {
      posterName:  posterName  || '',
      postContent: postContent || '',
      postUrl:     postUrl     || '',
      dueDate:     dueDate     || '',
      createdAt:   now
    };

    const posts = [...(existing.posts || []), newPost];

    // Calculate status
    const today  = new Date().toISOString().slice(0, 10);
    const dueDay = dueDate ? String(dueDate).slice(0, 10) : null;
    let status = 'pending';
    if (dueDay && dueDay < today && posts.length > 0) status = 'complete';
    else if (dueDay && dueDay === today) status = 'upcoming';

    const record = {
      ...existing,
      developerRef,
      developerName:       developerName        || existing.developerName || '',
      posts,
      status,
      nextNotificationDue: nextNotificationDue  || dueDate || existing.nextNotificationDue || '',
      cronSchedule:        cronSchedule          || existing.cronSchedule  || '',
      updatedAt:           now
    };

    if (env.ONBOARDING_R2) {
      await env.ONBOARDING_R2.put(dashKey, JSON.stringify(record), {
        httpMetadata: { contentType: 'application/json' }
      });
    }

    // Notify developer by email (non-blocking)
    try {
      const onboardingRecord = await getRecord(env, `onboarding-records/${developerRef}.json`);
      if (onboardingRecord && onboardingRecord.email) {
        const snippet  = postContent.length > 300 ? postContent.slice(0, 300) + '...' : postContent;
        const emailBody = `Hi ${onboardingRecord.full_name || 'there'},

You have new posts available on Virtual Launch Pro!

Posted by: ${posterName || 'Virtual Launch Pro Team'}

Post preview:
${snippet}
${postUrl ? '\nView full post: ' + postUrl : ''}

Check your current status and available posts at:
https://developers.virtuallaunch.pro/support.html

Your reference number: ${developerRef}

Regards,
Virtual Launch Pro Team`;

        await sendEmail(
          env,
          onboardingRecord.email,
          'You have new posts available on Virtual Launch Pro',
          emailBody
        );
      }
    } catch (emailErr) {
      console.error('Email send failed (non-fatal):', emailErr);
    }

    return json({ ok: true, status }, 200, CORS);

  } catch (err) {
    console.error(err);
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

async function getRecord(env, key) {
  if (!env.ONBOARDING_R2) return null;
  const obj = await env.ONBOARDING_R2.get(key);
  if (!obj) return null;
  try { return await obj.json(); } catch { return null; }
}
