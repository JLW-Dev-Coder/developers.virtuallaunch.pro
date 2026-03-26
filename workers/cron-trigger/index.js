// workers/cron-trigger/index.js
// Standalone Cloudflare Worker — cron trigger for VLP Pages project
// Deployed as: developers-virtuallaunch-pro-api (jamie-williams.workers.dev)
// Schedule: 0 9 * * 1 (Sunday 9am UTC — Cloudflare interprets 1 as Sunday)
// Trigger: POST /cron/job-match on developers.virtuallaunch.pro

export default {
  async scheduled(event, env, ctx) {
    const eventId = crypto.randomUUID();

    try {
      const response = await fetch(
        'https://developers.virtuallaunch.pro/cron/job-match',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-cron-secret': env.CRON_SECRET
          },
          body: JSON.stringify({
            eventId,
            jobId: 'scheduled-run'
          })
        }
      );

      const data = await response.json();
      console.log('Cron job-match result:', JSON.stringify(data));
    } catch (err) {
      console.error('Cron trigger failed:', err.message);
    }
  }
};
