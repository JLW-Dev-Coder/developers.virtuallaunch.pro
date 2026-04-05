# DVLP — Market Position

**Product:** Developers VLP
**Domain:** developers.virtuallaunch.pro
**Last updated:** 2026-04-04
**Position:** Curated developer marketplace connecting freelance developers with premium U.S. clients.

---

## Product Definition

**What it does:** Provides a platform where freelance developers can create profiles, get matched with client projects, and manage their availability. Businesses can browse developers, submit project requirements, and get matched.

**Core promise:** Quality over quantity — a curated, vetted network rather than a race-to-the-bottom marketplace.

**Revenue model:**
- Free tier: Basic profile listing
- Paid tier: $2.99/mo — enhanced visibility, priority matching, premium features

---

## Target Audience

### Primary: Freelance Developers
- Mid-to-senior developers seeking U.S. clients
- Tired of competing on price on commodity platforms
- Want a curated network that values quality
- Looking for recurring project flow, not one-off gigs

### Secondary: U.S. Businesses
- Small-to-mid businesses needing development talent
- Want pre-vetted developers, not open marketplace chaos
- Value reliability and communication over lowest price
- Project types: web, mobile, automation, integrations

---

## Problems Solved

| Pain Point | DVLP Solution |
|-----------|---------------|
| Commodity platforms undervalue developers | Curated network, quality positioning |
| Businesses waste time vetting candidates | Pre-screened profiles with skill verification |
| No recurring project flow for freelancers | Operator-managed matching + cron notifications |
| Platform fees eat into developer earnings | Low monthly fee, no per-project commission |
| Generic profiles don't stand out | Structured onboarding capturing real skills + availability |

---

## Pricing

| Tier | Price | Includes |
|------|-------|---------|
| Free | $0 | Basic profile, directory listing, job notifications |
| Pro | $2.99/mo | Enhanced visibility, priority matching, premium badge |

Both plans go through Stripe Checkout Sessions. No payment method required for free tier.

---

## Competitive Landscape

| Competitor | Differentiator |
|-----------|---------------|
| Upwork | DVLP is curated, not open marketplace. No race to bottom. |
| Toptal | DVLP has lower barrier to entry. $2.99 vs enterprise pricing. |
| Fiverr | DVLP focuses on ongoing relationships, not one-off gigs. |
| Direct outreach | DVLP provides structure, matching, and operator support. |

---

## Go-to-Market

**Channels:**
- Organic search (developer-focused landing pages)
- Developer communities and forums
- Referral from existing developers
- Client-side: businesses finding developers through the directory

**Messaging:**
- To developers: "Get matched with premium U.S. clients. No bidding wars."
- To clients: "Find vetted developers who deliver. Skip the noise."

---

## Tone and Voice

- Professional but approachable — not corporate, not casual
- Confident, not hype — "quality network" not "revolutionary platform"
- Direct — short sentences, clear CTAs
- No emojis in marketing copy
- Brand color: Emerald green (#10b981) — signals growth, trust, go

---

## Risks and Challenges

| Risk | Mitigation |
|------|-----------|
| Low initial developer supply | Operator-managed outreach + onboarding flow |
| Client acquisition chicken-and-egg | Start with developer supply, market to clients second |
| Churn on $2.99 tier | Demonstrate value via matching + notifications |
| Quality perception | Manual curation by operator, publish_profile gating |

---

## Content Assets

| Asset | Status | Location |
|-------|--------|----------|
| Landing page | Live | `/` |
| Developer directory | Live | `/developers` |
| Reviews page | Live | `/reviews` |
| Pricing page | Live | `/pricing` |
| Onboarding flow | Live | `/onboarding` → `/success` |
| Find developers (client) | Live | `/find-developers` |
| Affiliate dashboard | Live | `/affiliate` |

---

## Ecosystem Context

DVLP is one product in the VirtualLaunch Pro ecosystem:

| Product | Domain | Cross-sell |
|---------|--------|-----------|
| VLP Hub | virtuallaunch.pro | Parent platform, shared auth |
| TaxMonitor | taxmonitor.pro | Different vertical, shared infra |
| Transcript | transcript.taxmonitor.pro | Sibling product |
| TaxTools | taxtools.taxmonitor.pro | Sibling product |

---

## Cited Sources

- Stripe Checkout Sessions documentation
- Cloudflare Pages deployment model
- Next.js 15 App Router static export
