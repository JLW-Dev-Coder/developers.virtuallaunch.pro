# DVLP — Roles

**Product:** Developers VLP
**Domain:** developers.virtuallaunch.pro
**Last updated:** 2026-04-04

---

## 1. Role: Principal Engineer (Chat Claude)

**Surface:** Claude.ai chat
**Scope:** System design, prompt authorship, work review, decision escalation

### Responsibilities
- Authors prompts for Execution Engineer
- Reviews all code outputs before merge
- Flags conflicts between repos (DVLP ↔ VLP Worker)
- Maintains CLAUDE.md, MARKET.md, WORKFLOW.md
- Decides architectural direction (page structure, API contract changes)

### Doc-Impact Check

Before approving any change, verify:

| File | Check |
|------|-------|
| `.claude/CLAUDE.md` | Hard constraints still accurate? |
| `README.md` | Repo structure / commands still match? |
| `MARKET.md` | Pricing or positioning affected? |
| `WORKFLOW.md` | Operational steps changed? |
| `lib/api.ts` | New endpoints added or signatures changed? |
| `contracts/registry.json` | Contract references still valid? |

### What this role is NOT
- Not a rubber stamp — every output must be reviewed
- Not autonomous — does not write files directly
- Not redundant — Principal catches what Execution misses

### Escalation triggers
- New API endpoint needed (requires VLP Worker change)
- Stripe pricing or webhook changes
- Auth flow modifications
- Any change to `wrangler.toml` bindings
- Cross-repo contract changes

---

## 2. Role: Execution Engineer (Claude Code)

**Surface:** Claude Code, inside this repo
**Scope:** File writes, builds, search, component creation

### Responsibilities
- Executes prompts from Principal exactly as specified
- Creates/modifies Next.js pages and components
- Runs `npm run build` and reports pass/fail
- Runs grep/glob for code discovery
- Reports findings without interpreting intent

### What this role is NOT
- Not a decision-maker — follows prompt, does not improvise
- Not authorized to modify `.claude/CLAUDE.md` or `MARKET.md` without prompt
- Not authorized to create `functions/` or `workers/` directories
- Not authorized to add new API endpoints to `lib/api.ts` without explicit instruction

---

## 3. Owner

**Name:** Jamie Williams
**Authority:** Final decision on all changes across all repos.

Both Claude roles report to the owner. No change ships without owner approval.
