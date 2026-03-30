'use client';

import { useEffect, useState } from 'react';
import { getDeveloper, updateDeveloper, type Developer } from '@/lib/api';
import styles from '../operator.module.css';

export default function DeveloperDetailView({ ref_number, onBack }: { ref_number: string; onBack: () => void }) {
  const [record, setRecord] = useState<Developer | null>(null);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState(false);
  const [patch, setPatch] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    getDeveloper(ref_number).then(d => setRecord(d.record)).catch(() => setError(true));
  }, [ref_number]);

  async function save() {
    if (!record) return;
    setSaving(true); setSaveMsg('');
    try {
      await updateDeveloper({ ref_number: record.ref_number ?? ref_number, ...patch });
      setRecord(prev => prev ? { ...prev, ...patch } : prev);
      setEditing(false); setPatch({});
      setSaveMsg('Saved successfully.');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch {
      setSaveMsg('Save failed.');
    }
    setSaving(false);
  }

  function field(key: string, label: string) {
    const val = editing ? (patch[key] ?? String(record?.[key] ?? '')) : String(record?.[key] ?? '—');
    return (
      <div className={styles.formField}>
        <div className={styles.formLabel}>{label}</div>
        {editing ? (
          <input className="vlp-input" value={val}
            onChange={e => setPatch(p => ({ ...p, [key]: e.target.value }))} />
        ) : (
          <div style={{ fontSize: '0.8rem', color: '#e2e8f0', padding: '4px 0' }}>{val}</div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className={styles.viewHead}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn-secondary btn-sm" onClick={onBack}>← Back</button>
          <h2 className={styles.viewTitle}>{record ? String(record.full_name ?? ref_number) : 'Loading…'}</h2>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {editing ? (
            <>
              <button className="btn-secondary btn-sm" onClick={() => { setEditing(false); setPatch({}); }}>Cancel</button>
              <button className="btn-primary btn-sm" onClick={save} disabled={saving}>
                {saving ? <span className="spinner" /> : 'Save'}
              </button>
            </>
          ) : (
            <button className="btn-primary btn-sm" onClick={() => setEditing(true)}>Edit</button>
          )}
        </div>
      </div>

      {saveMsg && <div style={{ marginBottom: 12, fontSize: '0.8rem', color: saveMsg.includes('fail') ? '#fca5a5' : '#6ee7b7' }}>{saveMsg}</div>}
      {error && <div className={styles.errorBox}>Could not load developer record.</div>}

      {!record && !error && (
        <div className={styles.formCard}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 48, marginBottom: 12 }} />)}
        </div>
      )}

      {record && (
        <div className={styles.formCard}>
          <div className={styles.formGrid}>
            <div className={styles.formRow2}>
              {field('full_name', 'Full Name')}
              {field('email', 'Email')}
            </div>
            <div className={styles.formRow2}>
              {field('phone', 'Phone')}
              {field('location', 'Location')}
            </div>
            {field('bio', 'Bio')}
            <div className={styles.formRow2}>
              {field('status', 'Status')}
              {field('hourly_rate', 'Hourly Rate (USD)')}
            </div>
            <div className={styles.formRow2}>
              {field('availability', 'Availability')}
              {field('cronSchedule', 'Cron Schedule (days)')}
            </div>
            {record.skills && (
              <div>
                <div className={styles.formLabel}>Skills</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 4 }}>
                  {Object.entries(record.skills).filter(([,v]) => v > 0).map(([k]) => (
                    <span key={k} className="badge badge-active">{k.replace('skill_', '')}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
