import Stripe from 'stripe';

export async function onRequestPost({ request, env }) {
  // Validate required env vars
  if (!env.STRIPE_WEBHOOK_SECRET) return new Response('STRIPE_WEBHOOK_SECRET is not configured', { status: 500 });
  if (!env.STRIPE_SECRET_KEY)     return new Response('STRIPE_SECRET_KEY is not configured', { status: 500 });
  if (!env.ONBOARDING_R2)         return new Response('ONBOARDING_R2 is not configured', { status: 500 });

  const sig = request.headers.get('stripe-signature');
  if (!sig) {
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  // Read raw body — must not parse as JSON before verification
  const rawBody = await request.text();

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe signature verification failed:', err.message);
    return new Response('Invalid signature', { status: 400 });
  }

  const now = new Date().toISOString();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const vlp_ref = session.client_reference_id;
        if (!vlp_ref) {
          console.warn('checkout.session.completed: missing client_reference_id');
          break;
        }
        await patchRecord(env, vlp_ref, {
          stripeSessionId:     session.id,
          stripeCustomerId:    session.customer || null,
          subscriptionId:      session.subscription || undefined,
          planConfirmed:       session.metadata?.plan || null,
          paymentStatus:       'completed',
          webhookEvent:        'checkout.session.completed',
          webhookConfirmedAt:  now,
          updatedAt:           now,
        });
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const vlp_ref = invoice.subscription_details?.metadata?.vlp_ref
          || invoice.lines?.data?.[0]?.metadata?.vlp_ref;
        if (!vlp_ref) {
          console.warn('invoice.payment_succeeded: missing vlp_ref in subscription metadata');
          break;
        }
        await patchRecord(env, vlp_ref, {
          paymentStatus:      'completed',
          webhookEvent:       'invoice.payment_succeeded',
          webhookConfirmedAt: now,
          updatedAt:          now,
        });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const vlp_ref = invoice.subscription_details?.metadata?.vlp_ref
          || invoice.lines?.data?.[0]?.metadata?.vlp_ref;
        if (!vlp_ref) {
          console.warn('invoice.payment_failed: missing vlp_ref in subscription metadata');
          break;
        }
        await patchRecord(env, vlp_ref, {
          paymentStatus:      'failed',
          webhookEvent:       'invoice.payment_failed',
          webhookConfirmedAt: now,
          updatedAt:          now,
        });
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const vlp_ref = sub.metadata?.vlp_ref;
        if (!vlp_ref) {
          console.warn(`${event.type}: missing vlp_ref in subscription metadata`);
          break;
        }
        // Read current record to avoid overwriting paymentStatus: "completed"
        const current = await getRecord(env, vlp_ref);
        const patch = {
          subscriptionId: sub.id,
          webhookEvent:   event.type,
          updatedAt:      now,
        };
        // Do not overwrite paymentStatus if already completed
        if (!current || current.paymentStatus !== 'completed') {
          patch.paymentStatus = 'processing';
        }
        await patchRecord(env, vlp_ref, patch);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const vlp_ref = sub.metadata?.vlp_ref;
        if (!vlp_ref) {
          console.warn('customer.subscription.deleted: missing vlp_ref in subscription metadata');
          break;
        }
        await patchRecord(env, vlp_ref, {
          paymentStatus: 'cancelled',
          webhookEvent:  'customer.subscription.deleted',
          updatedAt:     now,
        });
        break;
      }

      default:
        // Unhandled event type — return 200 to prevent Stripe retries
        break;
    }
  } catch (err) {
    console.error('Webhook handler error:', err.message);
    // Return 200 so Stripe does not retry on R2 write errors
    return Response.json({ ok: true, warning: 'handler_error' });
  }

  return Response.json({ ok: true });
}

async function getRecord(env, vlp_ref) {
  const obj = await env.ONBOARDING_R2.get(`onboarding-records/${vlp_ref}.json`);
  if (!obj) return null;
  try {
    return await obj.json();
  } catch {
    return null;
  }
}

async function patchRecord(env, vlp_ref, patch) {
  const key = `onboarding-records/${vlp_ref}.json`;
  const existing = await env.ONBOARDING_R2.get(key);
  let record = {};
  if (existing) {
    try { record = await existing.json(); } catch { /* start fresh */ }
  }
  // Remove undefined fields from patch before merging
  const cleanPatch = Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== undefined)
  );
  const updated = { ...record, ...cleanPatch };
  await env.ONBOARDING_R2.put(key, JSON.stringify(updated), {
    httpMetadata: { contentType: 'application/json' },
  });
}
