#!/usr/bin/env node
// scripts/dedupe-onboarding-records.js
// Cleans up duplicate onboarding records in R2, keeping the newest per email address.
//
// Usage:
//   CLOUDFLARE_ACCOUNT_ID=<id> CLOUDFLARE_API_TOKEN=<token> node scripts/dedupe-onboarding-records.js
//
// Dry run runs first and prints what would be deleted.
// You must confirm before any deletions are made.
//
// Requirements:
//   - CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN env vars must be set
//   - wrangler must be installed and authenticated (for get/delete operations)

import { createInterface } from 'readline';
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

function deleteObject(key) {
  execSync(
    `wrangler r2 object delete ${BUCKET}/${key}`,
    { encoding: 'utf8', stdio: ['pipe', 'pipe', 'inherit'] }
  );
}

// ── Prompt helper ─────────────────────────────────────────────────────────────

function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nScanning R2 bucket "${BUCKET}" for duplicate onboarding records...\n`);

  // 1. List all onboarding record keys
  const keys = await listObjects('onboarding-records/');
  console.log(`Found ${keys.length} object(s) under onboarding-records/\n`);

  if (keys.length === 0) {
    console.log('No records found. Nothing to do.');
    return;
  }

  // 2. Fetch each record and extract email + metadata
  console.log('Fetching records to check for duplicate emails...');
  const records = [];
  let fetchErrors = 0;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    process.stdout.write(`  [${i + 1}/${keys.length}] ${key} ... `);

    const record = getObject(key);
    if (!record) {
      console.log('(skipped — null or unreadable)');
      fetchErrors++;
      continue;
    }

    const email = typeof record.email === 'string' ? record.email.toLowerCase().trim() : null;
    if (!email) {
      console.log('(skipped — no email field)');
      fetchErrors++;
      continue;
    }

    records.push({
      key,
      email,
      eventId:   record.eventId   || null,
      createdAt: record.createdAt || null,
      full_name: record.full_name || '(unknown)'
    });

    console.log('ok');
  }

  console.log(`\nFetched ${records.length} readable record(s). ${fetchErrors} skipped.\n`);

  // 3. Group by normalized email
  const byEmail = {};
  for (const r of records) {
    if (!byEmail[r.email]) byEmail[r.email] = [];
    byEmail[r.email].push(r);
  }

  // 4. Identify duplicates — for each email, keep newest by createdAt
  const toDelete = [];

  for (const [email, group] of Object.entries(byEmail)) {
    if (group.length <= 1) continue;

    // Sort descending by createdAt; records without createdAt go to the end
    group.sort((a, b) => {
      if (!a.createdAt && !b.createdAt) return 0;
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      return b.createdAt.localeCompare(a.createdAt);
    });

    const keeper = group[0];
    const dupes  = group.slice(1);

    console.log(`  EMAIL: ${email}  (${group.length} records)`);
    console.log(`    KEEP:   ${keeper.key}  (createdAt: ${keeper.createdAt || 'unknown'})`);
    for (const d of dupes) {
      console.log(`    DELETE: ${d.key}  (createdAt: ${d.createdAt || 'unknown'}, eventId: ${d.eventId || 'unknown'})`);
      toDelete.push(d);
    }
    console.log('');
  }

  if (toDelete.length === 0) {
    console.log('No duplicates found. Nothing to delete.');
    return;
  }

  // 5. Dry run summary
  console.log('─'.repeat(60));
  console.log('DRY RUN SUMMARY');
  console.log('─'.repeat(60));
  console.log(`Records to delete:         ${toDelete.length}`);
  console.log(`Receipts to delete:        ${toDelete.filter(d => d.eventId).length}  (receipts/form/{eventId}.json)`);
  console.log('─'.repeat(60));
  console.log('\nRecords that would be deleted:');
  for (const d of toDelete) {
    console.log(`  • ${d.key}`);
    if (d.eventId) {
      console.log(`    receipt: receipts/form/${d.eventId}.json`);
    }
  }
  console.log('');

  const answer = await prompt('Proceed with deletion? [yes/no]: ');

  if (answer !== 'yes') {
    console.log('\nAborted. No records were deleted.');
    return;
  }

  // 6. Delete confirmed
  console.log('\nDeleting...\n');
  let deleted  = 0;
  let receipts = 0;
  let errors   = 0;

  for (const d of toDelete) {
    // Delete main record
    try {
      deleteObject(d.key);
      console.log(`  ✓  deleted ${d.key}`);
      deleted++;
    } catch (err) {
      console.error(`  ✗  failed to delete ${d.key}: ${err.message}`);
      errors++;
    }

    // Delete corresponding receipt
    if (d.eventId) {
      const receiptKey = `receipts/form/${d.eventId}.json`;
      try {
        deleteObject(receiptKey);
        console.log(`  ✓  deleted ${receiptKey}`);
        receipts++;
      } catch (err) {
        console.error(`  ✗  failed to delete ${receiptKey}: ${err.message}`);
        errors++;
      }
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log('Done.');
  console.log(`  Records deleted:  ${deleted}`);
  console.log(`  Receipts deleted: ${receipts}`);
  console.log(`  Errors:           ${errors}`);
  console.log('─'.repeat(60));

  if (errors > 0) process.exit(1);
}

main().catch(err => {
  console.error('Script error:', err.message);
  process.exit(1);
});
