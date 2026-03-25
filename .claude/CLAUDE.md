# VirtualLaunch Developer — Claude Context

## Architecture Overview
- Frontend: Static HTML + Tailwind CSS, served via Cloudflare Pages (developer.virtuallaunch.pro)
- Backend: Cloudflare Workers (`workers/src/index.js`) + Cloudflare Pages Functions (`functions/forms/`)
- Storage: Cloudflare R2 bucket (`onboarding-records`)
- Runtime: workerd (Cloudflare); entrypoint declared in `wrangler.toml`
- Hosting: developer.virtuallaunch.pro

## Key Files
- Onboarding flow: `public/onboarding.html` (multi-step SPA: form-page → payment-page)
- Post-payment landing: `public/success.html` (polls `/forms/stripe/session-status` on load)
- Onboarding Pages Function: `functions/forms/onboarding.js` (GET / POST / PATCH)
- Worker entry (status + onboarding): `workers/src/index.js`
- Developer listing: `functions/forms/developers.js` + `public/js/developers.js`
- Support status endpoint: `workers/src/index.js` → GET `/forms/support/status?clientRef=VLP-xxx`
- Stripe checkout session creator: `functions/forms/stripe/create-session.js` (POST)
- Stripe webhook handler: `functions/forms/stripe/webhook.js` (POST)
- Session status endpoint: `functions/forms/stripe/session-status.js` (GET)

## Stripe Integration
- Webhook endpoint: https://api.virtuallaunch.pro/v1/webhooks/stripe
- Webhook secret: stored as env var STRIPE_WEBHOOK_SECRET — never hardcode
- Listening events: see registry.json > stripe.webhookEvents
- Success redirect URL: https://developer.virtuallaunch.pro/success.html?session_id={CHECKOUT_SESSION_ID}
- Both Free and $2.99 plans go through Stripe Checkout Sessions (not Payment Links)
- Stripe lives in Pages Functions in this repo (`functions/forms/stripe/`)
- Stripe SDK version: 20.4.1

## Payment State Machine
States: plan-selection → processing → completed | error
- State is never derived from redirect URL params alone
- Completed state requires webhook confirmation (`paymentStatus: "completed"` + `webhookConfirmedAt`)
- `vl_payment_state` key in sessionStorage tracks current state
- `success.html` polls `/forms/stripe/session-status?session_id=...` every 2s, 30s timeout
- See registry.json > paymentStates for full contract

## Environment Variables

| Key                   | Required | Location              | Purpose                        |
|-----------------------|----------|-----------------------|--------------------------------|
| STRIPE_SECRET_KEY     | yes      | Cloudflare dashboard  | Authenticate Stripe API calls  |
| STRIPE_WEBHOOK_SECRET | yes      | Cloudflare dashboard  | Verify webhook signatures      |
| STRIPE_PRICE_FREE     | yes      | Cloudflare dashboard  | Free plan price ID             |
| STRIPE_PRICE_PAID     | yes      | Cloudflare dashboard  | $2.99 recurring price ID       |

## Self-Check Rules (run before every change)
1. Never modify webhook endpoint, secret, or event list
2. Never derive payment state from client-side redirect alone
3. After any backend change, verify the status polling endpoint still
   returns the shape in registry.json > backend.sessionStatusResponseShape
4. After any frontend change, verify all four payment states render
   without JS errors
5. If a required file is missing, stop and report — do not invent a substitute

## Audit Log

### 2026-03-25 — Initial audit
- Files read: .claude/settings.local.json, wrangler.toml, workers/src/index.js,
  functions/forms/onboarding.js, public/onboarding.html, public/success.html,
  public/js/developers.js, public/available.html (partial), contracts/registry.json,
  contracts/onboarding.json
- Nulls remaining at that time: Stripe webhook handler, session-status endpoint,
  Stripe SDK version, vl_payment_state sessionStorage key

### 2026-03-25 — Stripe Checkout + Webhook State Machine
- Changes:
  - Created `functions/forms/stripe/create-session.js` (POST /forms/stripe/create-session)
  - Created `functions/forms/stripe/webhook.js` (POST /forms/stripe/webhook)
  - Created `functions/forms/stripe/session-status.js` (GET /forms/stripe/session-status)
  - Updated `contracts/registry.json` — added stripeEndpoints array with 3 new entries
  - Updated `wrangler.toml` — added [vars] section with placeholder env var comments
  - Updated `public/onboarding.html` — selectPlan now calls create-session and redirects;
    processing/error states added; vl_payment_state tracked in sessionStorage
  - Updated `public/success.html` — polls session-status on load; full state machine
    (processing → completed | error | timeout)
  - Updated `.claude/CLAUDE.md` and `.claude/registry.json` — null fields resolved
  - Installed stripe npm package (v20.4.1)
- Files read during this task: contracts/prod1_v1.json, contracts/price1_v1.json,
  contracts/price2_v1.json, contracts/onboarding.json, contracts/registry.json,
  .claude/registry.json, .claude/CLAUDE.md, public/onboarding.html, public/success.html,
  wrangler.toml
- Open questions resolved:
  - Stripe lives in Pages Functions in this repo (not api.virtuallaunch.pro, not external service)
  - Checkout Sessions used — Payment Links retired from frontend use
  - vlp_ref passed via client_reference_id in Checkout Session; also in session.metadata.vlp_ref
  - Free plan: mode "payment", $0, payment_method_collection "if_required"
  - Paid plan: mode "subscription", $2.99/mo, payment_method_collection "always"
  - success.html polls session-status endpoint (not sessionStorage-only)
  - selectPlan('free') initiates Stripe Checkout (free $0 one_time, payment_method_collection: if_required)
- Nulls remaining: none — all fields resolved; see registry.json audit log for confirmation
