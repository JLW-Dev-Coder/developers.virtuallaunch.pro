'use client';

import { useEffect, useState } from 'react';
import { getAnalytics, type AnalyticsData } from '@/lib/api';
import styles from '../operator.module.css';

function SkeletonStat() {
  return <div className={styles.statCard}><div className="skeleton" style={{ height: 40, marginBottom: 8 }} /><div className="skeleton" style={{ height: 12, width: '60%' }} /></div>;
}

export default function AnalyticsView() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getAnalytics().then(r => setData(r.data)).catch(() => setError(true));
  }, []);

  return (
    <div>
      <div className={styles.viewHead}>
        <h2 className={styles.viewTitle}>Analytics</h2>
        <button className="btn-primary btn-sm" onClick={() => { setData(null); setError(false); getAnalytics().then(r => setData(r.data)).catch(() => setError(true)); }}>
          Refresh
        </button>
      </div>

      {error && <div className={styles.errorBox}>Could not load analytics.</div>}

      <div className={styles.statsGrid}>
        {!data && !error ? (
          [1,2,3,4].map(i => <SkeletonStat key={i} />)
        ) : data ? (
          <>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{data.submissions ?? '—'}</div>
              <div className={styles.statLabel}>Total Submissions</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{data.active ?? '—'}</div>
              <div className={styles.statLabel}>Active Developers</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{data.pending ?? '—'}</div>
              <div className={styles.statLabel}>Pending Review</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{data.published ?? '—'}</div>
              <div className={styles.statLabel}>Published Profiles</div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
