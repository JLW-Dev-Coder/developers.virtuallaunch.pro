# developers.virtuallaunch.pro

**Product:** Developers VLP (DVLP)
**Domain:** [developers.virtuallaunch.pro](https://developers.virtuallaunch.pro)
**Purpose:** Freelancer/client matching marketplace — connects talented developers with U.S. businesses seeking development talent.

---

## System Overview

DVLP is the developer-facing frontend of VirtualLaunch Pro. It handles:
- Developer onboarding and profile management
- Client intake (find-developers flow)
- Stripe-powered plan selection (Free + $2.99/mo)
- Public developer directory and reviews
- Operator dashboard for managing the marketplace

This repo is **frontend-only**. All API logic lives in the VLP Worker at `api.virtuallaunch.pro`.

---

## Architecture

```
Browser → developers.virtuallaunch.pro (Cloudflare Pages)
                    ↓ fetch (credentials: include)
            api.virtuallaunch.pro (VLP Worker)
                    ↓
            Cloudflare R2 / KV / Stripe / Gmail / Resend
```

| Layer | Technology | Location |
|-------|-----------|----------|
| Frontend | Next.js 15.1.12 (App Router, static export) | This repo |
| Hosting | Cloudflare Pages | `out/` directory |
| API | VLP Worker | `api.virtuallaunch.pro` |
| Storage | Cloudflare R2 (`onboarding-records`) | VLP Worker |
| Sessions | Cloudflare KV (`OPERATOR_SESSIONS`) | VLP Worker |
| Payments | Stripe Checkout Sessions | VLP Worker |
| Email | Gmail API (transactional) + Resend (bulk) | VLP Worker |

---

## Responsibilities

| This repo owns | VLP Worker owns |
|----------------|-----------------|
| All page rendering and UX | All API endpoints (`/v1/dvlp/*`) |
| Static asset generation | Stripe webhook handling |
| Client-side form validation | R2/KV data operations |
| API client (`lib/api.ts`) | Email dispatch |
| CSS design system | Auth session management |

---

## Repo Structure

```
app/                    # Next.js pages (App Router)
components/             # Shared React components (Header, Footer, Guards)
lib/                    # API client
contracts/              # Reference copies of API contracts (read-only)
scripts/                # Operational scripts
public/                 # Static assets
out/                    # Build output (Cloudflare Pages serves this)
.claude/                # Claude context and canonicals
```

---

## Core Workflows

### Developer Onboarding
1. Developer fills form on `/onboarding`
2. `submitOnboarding()` → VLP Worker creates record in R2
3. `createCheckout()` → Stripe Checkout session
4. Stripe redirects to `/success`
5. `/success` polls `getSessionStatus()` until webhook confirms payment

### Client Intake
1. Client fills form on `/find-developers`
2. `submitMatchIntake()` → VLP Worker stores request

### Operator Dashboard
1. Operator signs in via `/sign-in` (magic link)
2. `AuthGuard` + `AdminGuard` gate `/operator`
3. Dashboard calls operator endpoints for submissions, developers, jobs, tickets, analytics

---

## Data Contracts

Contracts live in `contracts/` as reference copies. The VLP Worker is authoritative.

| Contract | Purpose |
|----------|---------|
| `onboarding.json` | Developer signup payload |
| `registry.json` | Full endpoint registry |
| `reviews.json` | Public review shape |
| `find-developers.json` | Client intake payload |
| `operator-*.json` | Operator endpoint shapes |

---

## Setup / Local Development

```bash
npm install
npm run dev          # Start dev server on localhost:3000
npm run build        # Static export to out/
npm run lint         # ESLint
```

Requires Node.js 18+.

---

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local development server |
| `npm run build` | Production static export |
| `npm run lint` | Run ESLint |
| `node scripts/seed-canned-responses.js` | Seed default canned responses to R2 |
| `node scripts/backfill-email-index.js` | Backfill email index in R2 |

---

## Environment / Config

### wrangler.toml (Pages bindings)

| Binding | Type | Value |
|---------|------|-------|
| `ONBOARDING_R2` | R2 | `onboarding-records` |
| `OPERATOR_SESSIONS` | KV | Session + dedupe store |
| `EMAIL_FROM` | var | `team@virtuallaunch.pro` |
| `CF_ZONE_ID` | var | Cloudflare zone ID |

### Secrets (Cloudflare dashboard)

`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_FREE`, `STRIPE_PRICE_PAID`, `CF_API_TOKEN`, `CRON_SECRET`, `RESEND_API_KEY`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_CLIENT_EMAIL`

---

## Deployment

- **Platform:** Cloudflare Pages
- **Build:** `npm run build` → static export to `out/`
- **Trigger:** Git push to `main` triggers automatic deploy
- **Domain:** `developers.virtuallaunch.pro`
- **Config:** `wrangler.toml` (bindings only, no Worker)

---

## Constraints / Rules

1. No backend code in this repo — all API via VLP Worker
2. Never hardcode secrets or API keys
3. All fetch calls go through `lib/api.ts`
4. `contracts/` is read-only reference — do not modify
5. Payment state requires webhook confirmation, never client-side only
6. `wrangler.toml` is Pages config only — no Worker name or `main` field

---

## Related Systems

| System | Domain | Role |
|--------|--------|------|
| VLP Hub | virtuallaunch.pro | Parent platform, VLP Worker host |
| VLP Worker | api.virtuallaunch.pro | All DVLP backend routes |
| TaxMonitor | taxmonitor.pro | Sibling product |
| Transcript | transcript.taxmonitor.pro | Sibling product |
| TaxTools | taxtools.taxmonitor.pro | Sibling product |

---

## Glossary

| Term | Definition |
|------|-----------|
| DVLP | Developers VLP — this product |
| VLP Worker | Cloudflare Worker at api.virtuallaunch.pro |
| ref_number | Unique reference per onboarding record |
| operator | Authenticated admin managing the marketplace |
| onboarding record | Developer profile stored in R2 |
| canned response | Reusable email template stored in R2 |
