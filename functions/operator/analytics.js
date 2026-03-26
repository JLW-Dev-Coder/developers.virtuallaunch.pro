// functions/operator/analytics.js
// GET /operator/analytics — submission counts across all four form collections,
// time-bucketed metrics, and Cloudflare page view data via Analytics API.
// Response shape: contracts/operator-analytics.json > response.success

import { verifyOperatorToken } from './_verifyToken.js';

// ── helpers ───────────────────────────────────────────────────────────────────

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin':  origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

// ── date helpers ──────────────────────────────────────────────────────────────

function defaultWindow() {
  const to   = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().slice(0, 10),
    to:   to.toISOString().slice(0, 10)
  };
}

function inWindow(createdAt, from, to) {
  if (!createdAt) return false;
  const d = createdAt.slice(0, 10);
  return d >= from && d <= to;
}

/**
 * Return a bucket label for a given ISO date string.
 * bucket: 'day' → 'YYYY-MM-DD', 'week' → 'YYYY-Www', 'month' → 'YYYY-MM'
 */
function bucketLabel(isoDate, bucket) {
  const d = new Date(isoDate);
  if (bucket === 'month') return isoDate.slice(0, 7);
  if (bucket === 'week') {
    // ISO week: find Monday of the week
    const day  = d.getUTCDay() || 7;            // Sun→7
    const mon  = new Date(d);
    mon.setUTCDate(d.getUTCDate() - (day - 1));
    // ISO week number
    const jan4 = new Date(Date.UTC(mon.getUTCFullYear(), 0, 4));
    const wk   = Math.ceil(((mon - jan4) / 86400000 + jan4.getUTCDay() + 1) / 7);
    return `${mon.getUTCFullYear()}-W${String(wk).padStart(2, '0')}`;
  }
  return isoDate.slice(0, 10);
}

// ── R2 prefix scan ────────────────────────────────────────────────────────────

/**
 * Fetch all objects under a prefix from R2 and return parsed records.
 * Gracefully returns [] if the prefix has no objects.
 */
async function listRecords(r2, prefix) {
  const records = [];
  try {
    let list = await r2.list({ prefix });
    const objects = [...list.objects];
    while (list.truncated) {
      list = await r2.list({ prefix, cursor: list.cursor });
      objects.push(...list.objects);
    }

    for (const obj of objects) {
      try {
        const item = await r2.get(obj.key);
        if (!item) continue;
        const rec = await item.json();
        records.push(rec);
      } catch {
        // skip unparseable record
      }
    }
  } catch {
    // prefix not found or R2 error — return empty
  }
  return records;
}

// ── Cloudflare Analytics API ──────────────────────────────────────────────────

async function fetchCloudflarePageViews(env, from, to) {
  if (!env.CF_API_TOKEN || !env.CF_ZONE_ID) {
    return { source: 'Cloudflare Analytics API', data: null, error: 'unavailable' };
  }

  const query = `{
  viewer {
    zones(filter: { zoneTag: $zoneId }) {
      httpRequests1dGroups(
        limit: 30
        filter: { date_geq: $from, date_leq: $to }
        orderBy: [date_ASC]
      ) {
        dimensions { date }
        sum { requests pageViews }
      }
    }
  }
}`;

  try {
    const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${env.CF_API_TOKEN}`,
        'Content-Type':  'application/json'
      },
      body: JSON.stringify({
        query,
        variables: { zoneId: env.CF_ZONE_ID, from, to }
      })
    });

    if (!res.ok) {
      console.error('Cloudflare Analytics API HTTP error:', res.status);
      return { source: 'Cloudflare Analytics API', data: null, error: 'unavailable' };
    }

    const payload = await res.json();

    if (payload.errors && payload.errors.length > 0) {
      console.error('Cloudflare Analytics API errors:', JSON.stringify(payload.errors));
      return { source: 'Cloudflare Analytics API', data: null, error: 'unavailable' };
    }

    const groups = payload?.data?.viewer?.zones?.[0]?.httpRequests1dGroups ?? [];
    const data   = groups.map(g => ({
      date:      g.dimensions.date,
      requests:  g.sum.requests,
      pageViews: g.sum.pageViews
    }));

    return { source: 'Cloudflare Analytics API', data };
  } catch (err) {
    console.error('Cloudflare Analytics API fetch failed:', err.message);
    return { source: 'Cloudflare Analytics API', data: null, error: 'unavailable' };
  }
}

// ── handler ───────────────────────────────────────────────────────────────────

export async function onRequestGet({ request, env }) {
  const CORS = corsHeaders(request);

  const auth = await verifyOperatorToken(request, env);
  if (!auth.valid) {
    return json({ ok: false, error: 'unauthorized' }, 401, CORS);
  }

  const url     = new URL(request.url);
  const params  = url.searchParams;
  const window_ = defaultWindow();
  const from    = params.get('from') || window_.from;
  const to      = params.get('to')   || window_.to;
  const bucket  = ['day', 'week', 'month'].includes(params.get('bucket'))
    ? params.get('bucket') : 'day';

  // Fetch R2 records + Cloudflare Analytics in parallel
  const [onboardingRecs, findDevRecs, supportRecs, reviewRecs, pageViews] =
    await Promise.all([
      listRecords(env.ONBOARDING_R2, 'onboarding-records/'),
      listRecords(env.ONBOARDING_R2, 'find-developer-records/'),
      listRecords(env.ONBOARDING_R2, 'support-records/'),
      listRecords(env.ONBOARDING_R2, 'review-records/'),
      fetchCloudflarePageViews(env, from, to)
    ]);

  // Filter to date window
  const inW = r => inWindow(r.createdAt || r.submittedAt || r.eventId, from, to);

  const onboardingFiltered  = onboardingRecs.filter(inW);
  const findDevFiltered     = findDevRecs.filter(inW);
  const supportFiltered     = supportRecs.filter(inW);
  const reviewsFiltered     = reviewRecs.filter(inW);

  // Aggregate totals
  const submissions = {
    onboarding:     onboardingFiltered.length,
    findDevelopers: findDevFiltered.length,
    support:        supportFiltered.length,
    reviews:        reviewsFiltered.length,
    total:          onboardingFiltered.length + findDevFiltered.length +
                    supportFiltered.length + reviewsFiltered.length
  };

  // Build time series
  const bucketMap = {};
  const addToBucket = (recs, field) => {
    for (const r of recs) {
      const dateStr = r.createdAt || r.submittedAt;
      if (!dateStr) continue;
      const label = bucketLabel(dateStr.slice(0, 10), bucket);
      if (!bucketMap[label]) {
        bucketMap[label] = { bucket: label, onboarding: 0, findDevelopers: 0, support: 0, reviews: 0 };
      }
      bucketMap[label][field]++;
    }
  };

  addToBucket(onboardingFiltered,  'onboarding');
  addToBucket(findDevFiltered,     'findDevelopers');
  addToBucket(supportFiltered,     'support');
  addToBucket(reviewsFiltered,     'reviews');

  const timeSeries = Object.values(bucketMap).sort((a, b) => a.bucket.localeCompare(b.bucket));

  return json({
    ok: true,
    window: { from, to },
    submissions,
    timeSeries,
    pageViews
  }, 200, CORS);
}

export async function onRequestOptions({ request }) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}
