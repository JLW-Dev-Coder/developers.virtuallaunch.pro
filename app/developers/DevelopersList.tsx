'use client';

import { useEffect, useState } from 'react';
import { getDevelopers, type Developer } from '@/lib/api';
import styles from './page.module.css';

function SkeletonCard() {
  return (
    <div className={styles.card}>
      <div className="skeleton" style={{ height: 24, width: '60%', marginBottom: 12 }} />
      <div className="skeleton" style={{ height: 16, width: '40%', marginBottom: 16 }} />
      <div className="skeleton" style={{ height: 56, marginBottom: 16 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 24, width: 60, borderRadius: 999 }} />)}
      </div>
    </div>
  );
}

function DevCard({ dev }: { dev: Developer }) {
  const skills = dev.skills ? Object.entries(dev.skills).filter(([, v]) => v > 0).slice(0, 5) : [];
  const initials = dev.full_name
    ? dev.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.avatar}>{initials}</div>
        <div>
          <h3 className={styles.devName}>{dev.full_name ?? 'Developer'}</h3>
          {dev.location && <p className={styles.devLocation}>{dev.location}</p>}
        </div>
      </div>
      {dev.bio && <p className={styles.devBio}>{dev.bio}</p>}
      <div className={styles.skillsRow}>
        {skills.map(([name]) => (
          <span key={name} className={styles.skillTag}>{name.replace('skill_', '')}</span>
        ))}
      </div>
      {dev.hourly_rate && (
        <div className={styles.rate}>${dev.hourly_rate}/hr</div>
      )}
    </div>
  );
}

export default function DevelopersList() {
  const [devs, setDevs] = useState<Developer[] | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    getDevelopers()
      .then(d => setDevs(d.results ?? []))
      .catch(() => setError(true));
  }, []);

  const filtered = devs?.filter(d => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.full_name?.toLowerCase().includes(q) ||
      Object.keys(d.skills ?? {}).some(k => k.toLowerCase().includes(q))
    );
  }) ?? [];

  return (
    <>
      <div className={styles.searchRow}>
        <input
          className={`vlp-input ${styles.searchInput}`}
          placeholder="Search by name or skill…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {error && (
        <div className={styles.errorState}>
          <p>Could not load developers. Please try again later.</p>
        </div>
      )}

      {!devs && !error && (
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {devs && filtered.length === 0 && (
        <div className={styles.emptyState}>
          <svg viewBox="0 0 24 24" fill="#1e293b" width="48" height="48">
            <path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zM8 11c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
          </svg>
          <p>No developers found.</p>
        </div>
      )}

      {devs && filtered.length > 0 && (
        <div className={styles.grid}>
          {filtered.map(d => <DevCard key={d.ref_number} dev={d} />)}
        </div>
      )}
    </>
  );
}
