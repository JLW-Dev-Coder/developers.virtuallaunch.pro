'use client';

import { useState } from 'react';
import styles from './page.module.css';

const API_BASE = 'https://api.virtuallaunch.pro';

interface StatusResult {
  ok: boolean;
  status?: string;
  updatedAt?: string;
  error?: string;
}

interface Post {
  body?: string;
  message?: string;
  createdAt?: string;
  author?: string;
  [key: string]: unknown;
}

export default function TicketLookup() {
  const [ref, setRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StatusResult | null>(null);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [error, setError] = useState('');

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setResult(null);
    setPosts(null);

    const trimmed = ref.trim();
    if (!trimmed) { setError('Enter your reference ID.'); return; }
    if (!/^VLP-[A-Za-z0-9]+$/.test(trimmed)) {
      setError('Reference ID should look like VLP-XXXXXXX.');
      return;
    }

    setLoading(true);
    try {
      const statusRes = await fetch(`${API_BASE}/forms/support/status?clientRef=${encodeURIComponent(trimmed)}`);
      const statusData: StatusResult = await statusRes.json().catch(() => ({ ok: false }));
      if (!statusRes.ok || !statusData.ok) {
        setError(statusData.error === 'not_found' ? 'No record found for that reference ID.' : 'Lookup failed. Please try again.');
        setLoading(false);
        return;
      }
      setResult(statusData);

      try {
        const postsRes = await fetch(`${API_BASE}/forms/support/posts?clientRef=${encodeURIComponent(trimmed)}`);
        const postsData = await postsRes.json().catch(() => ({ ok: false, posts: [] }));
        if (postsData.ok && Array.isArray(postsData.posts)) setPosts(postsData.posts as Post[]);
      } catch { /* ignore */ }
    } catch {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  }

  return (
    <section id="ticket-lookup" className={styles.lookupSection}>
      <div className={styles.lookupCard}>
        <h2 className={styles.lookupTitle}>Check Your Status</h2>
        <p className={styles.lookupSub}>
          Enter the reference ID you received during signup to view your current status and any messages from our team.
        </p>
        <form onSubmit={handleLookup} className={styles.lookupForm}>
          <input
            type="text"
            className="vlp-input field-focus"
            placeholder="VLP-XXXXXXX"
            value={ref}
            onChange={e => setRef(e.target.value.toUpperCase())}
            autoComplete="off"
          />
          <button type="submit" className={styles.lookupBtn} disabled={loading}>
            {loading ? 'Looking up…' : 'Look Up'}
          </button>
        </form>

        {error && <div className={styles.lookupError}>{error}</div>}

        {result?.ok && (
          <div className={styles.lookupResult}>
            <div className={styles.lookupRow}>
              <span className={styles.lookupLabel}>Status</span>
              <span className={styles.lookupBadge}>{result.status ?? 'Unknown'}</span>
            </div>
            {result.updatedAt && (
              <div className={styles.lookupRow}>
                <span className={styles.lookupLabel}>Last Updated</span>
                <span className={styles.lookupValue}>{new Date(result.updatedAt).toLocaleString()}</span>
              </div>
            )}
            {posts && posts.length > 0 && (
              <div className={styles.lookupPosts}>
                <h4 className={styles.lookupPostsTitle}>Recent Messages</h4>
                {posts.map((p, i) => (
                  <div key={i} className={styles.lookupPost}>
                    <p className={styles.lookupPostBody}>{p.body ?? p.message ?? ''}</p>
                    {p.createdAt && (
                      <p className={styles.lookupPostMeta}>
                        {new Date(p.createdAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
            {posts && posts.length === 0 && (
              <p className={styles.lookupEmpty}>No messages yet. We&apos;ll be in touch soon.</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
