#!/usr/bin/env node
// scripts/backfill-email-index.js
// Writes the email index (onboarding-email-index/{email}.json) for all existing
// onboarding records that are not yet indexed.
//
// For emails with multiple records: writes the index entry for the newest record
// (by createdAt). Skips any email that already has an index entry. Safe to re-run.
//
// Usage:
//   CLOUDFLARE_ACCOUNT_ID=<id> CLOUDFLARE_API_TOKEN=<token> node scripts/backfill-email-index.js
//
// Requirements:
//   - CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN env vars must be set
//   - wrangler must be installed and authenticated (for get/put operations)

import { execSync } from 'child_process';

const BUCKET = 'onboarding-records';

// ── Wrangler helpers ───────────────────────────────────────────────────────────

// List uses the Cloudflare REST API — wrangler r2 object list does not exist in
// Wrangler 4.x. CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN must be set.
async function r2ListPage(prefix, cursor) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken  = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) {
    throw new Error('CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN must be set');
  }

  const params = new URLSearchParams({ prefix });
  if (cursor) params.set('cursor', cursor);

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${BUCKET}/objects?${params}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type':  'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`R2 list failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  // CF REST API shape: { result: { objects: [...], truncated, cursor }, success, errors }
  return json.result || json;
}

async function listObjects(prefix) {
  const keys = [];
  let cursor;

  do {
    const res = await r2ListPage(prefix, cursor);
    for (const obj of (res.objects || [])) {
      keys.push(obj.key);
    }
    cursor = res.truncated ? res.cursor : undefined;
  } while (cursor);

  return keys;
}

function getObject(key) {
  try {
    const out = execSync(
      `wrangler r2 object get ${BUCKET}/${key} --pipe`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'inherit'] }
    );
    return JSON.parse(out);
  } catch (_err) {
    // Object not found or unreadable
    return null;
  }
}

function putObject(key, value) {
  execSync(
    `wrangler r2 object put ${BUCKET}/${key} --pipe --content-type application/json`,
    { encoding: 'utf8', input: JSON.stringify(value), stdio: ['pipe', 'pipe', 'inherit'] }
  );
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nBackfilling email index in R2 bucket "${BUCKET}"...\n`);

  // 1. List all onboarding records
  const keys = await listObjects('onboarding-records/');
  console.log(`Found ${keys.length} record(s) under onboarding-records/\n`);

  if (keys.length === 0) {
    console.log('No records to backfill.');
    return;
  }

  // 2. Fetch all records
  console.log('Fetching records...');
  const records = [];

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    process.stdout.write(`  [${i + 1}/${keys.length}] ${key} ... `);

    const record = getObject(key);
    if (!record) {
      console.log('(skipped — null or unreadable)');
      continue;
    }

    const email = typeof record.email === 'string' ? record.email.toLowerCase().trim() : null;
    if (!email) {
      console.log('(skipped — no email field)');
      continue;
    }

    records.push({
      key,
      email,
      eventId:   record.eventId   || null,
      createdAt: record.createdAt || null
    });

    console.log('ok');
  }

  console.log(`\nLoaded ${records.length} readable record(s).\n`);

  // 3. Group by email, keep newest per email
  const byEmail = {};
  for (const r of records) {
    if (!byEmail[r.email]) byEmail[r.email] = [];
    byEmail[r.email].push(r);
  }

  const candidates = [];
  for (const [email, group] of Object.entries(byEmail)) {
    group.sort((a, b) => {
      if (!a.createdAt && !b.createdAt) return 0;
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      return b.createdAt.localeCompare(a.createdAt);
    });
    candidates.push({ email, record: group[0] });
  }

  console.log(`Unique emails: ${candidates.length}\n`);

  // 4. For each email, check if index exists; write if absent
  let written = 0;
  let skipped = 0;
  let errors  = 0;

  for (const { email, record } of candidates) {
    const indexKey    = `onboarding-email-index/${email}.json`;
    const existingIdx = getObject(indexKey);

    if (existingIdx) {
      console.log(`  skip  ${indexKey}  (already exists)`);
      skipped++;
      continue;
    }

    if (!record.eventId) {
      console.log(`  skip  ${email}  (record has no eventId — cannot write index)`);
      skipped++;
      continue;
    }

    const entry = {
      eventId:    record.eventId,
      ref_number: record.eventId,
      createdAt:  record.createdAt || new Date().toISOString()
    };

    try {
      putObject(indexKey, entry);
      console.log(`  ✓  wrote ${indexKey}  (eventId: ${record.eventId})`);
      written++;
    } catch (err) {
      console.error(`  ✗  failed ${indexKey}: ${err.message}`);
      errors++;
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log('Done.');
  console.log(`  Index entries written: ${written}`);
  console.log(`  Skipped (existing):    ${skipped}`);
  console.log(`  Errors:                ${errors}`);
  console.log('─'.repeat(60));

  if (errors > 0) process.exit(1);
}

main().catch(err => {
  console.error('Script error:', err.message);
  process.exit(1);
});
