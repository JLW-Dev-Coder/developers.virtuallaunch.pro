'use client';

import { useEffect, useState } from 'react';
import { getOperatorJobs, createJob, updateJob, type Job } from '@/lib/api';
import styles from '../operator.module.css';

function generateEventId() {
  return 'VLP-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2,7).toUpperCase();
}

export default function JobsView() {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState('');
  const [creating, setCreating] = useState(false);
  const [newJob, setNewJob] = useState({ title: '', desc: '', company: '' });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, string>>({});

  function load(s = filter) {
    setJobs(null); setError(false);
    getOperatorJobs(s || undefined).then(d => setJobs(d.results ?? [])).catch(() => setError(true));
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreate() {
    if (!newJob.title || !newJob.desc) return;
    setSaving(true);
    try {
      const eventId = generateEventId();
      await createJob({ eventId, jobId: eventId, jobTitle: newJob.title, jobDescription: newJob.desc, company: newJob.company, status: 'open' });
      setCreating(false); setNewJob({ title: '', desc: '', company: '' });
      load();
    } catch { /* ignore */ }
    setSaving(false);
  }

  async function handleUpdate(jobId: string) {
    setSaving(true);
    try {
      await updateJob(jobId, editData);
      setEditId(null); setEditData({});
      load();
    } catch { /* ignore */ }
    setSaving(false);
  }

  return (
    <div>
      <div className={styles.viewHead}>
        <h2 className={styles.viewTitle}>Jobs</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="vlp-input" style={{ width: 130, fontSize: '0.78rem', padding: '6px 10px' }}
            value={filter} onChange={e => { setFilter(e.target.value); load(e.target.value); }}>
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
          <button className="btn-primary btn-sm" onClick={() => setCreating(true)}>+ New Job</button>
        </div>
      </div>

      {creating && (
        <div className={styles.formCard} style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f1f5f9', marginBottom: 12 }}>New Job Post</h3>
          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <div className={styles.formLabel}>Title *</div>
              <input className="vlp-input" value={newJob.title} onChange={e => setNewJob(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div className={styles.formField}>
              <div className={styles.formLabel}>Company</div>
              <input className="vlp-input" value={newJob.company} onChange={e => setNewJob(p => ({ ...p, company: e.target.value }))} />
            </div>
            <div className={styles.formField}>
              <div className={styles.formLabel}>Description *</div>
              <textarea className="vlp-input" rows={3} value={newJob.desc}
                onChange={e => setNewJob(p => ({ ...p, desc: e.target.value }))} style={{ resize: 'vertical' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn-secondary btn-sm" onClick={() => setCreating(false)}>Cancel</button>
            <button className="btn-primary btn-sm" onClick={handleCreate} disabled={saving}>
              {saving ? <span className="spinner" /> : 'Create'}
            </button>
          </div>
        </div>
      )}

      {error && <div className={styles.errorBox}>Could not load jobs.</div>}
      <div className={styles.tableWrap}>
        <table>
          <thead><tr><th>ID</th><th>Title</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
          <tbody>
            {!jobs && !error && [1,2,3].map(i => <tr key={i}><td colSpan={5}><div className="skeleton" style={{ height: 14 }} /></td></tr>)}
            {jobs && jobs.length === 0 && <tr><td colSpan={5}><div className={styles.empty}><p>No jobs found.</p></div></td></tr>}
            {jobs && jobs.map(j => (
              <tr key={j.jobId}>
                {editId === j.jobId ? (
                  <>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#6ee7b7' }}>{j.jobId}</td>
                    <td><input className="vlp-input" style={{ width: '100%' }} value={editData.jobTitle ?? j.jobTitle} onChange={e => setEditData(p => ({ ...p, jobTitle: e.target.value }))} /></td>
                    <td>
                      <select className="vlp-input" style={{ fontSize: '0.78rem', padding: '4px 8px' }}
                        value={editData.status ?? j.status}
                        onChange={e => setEditData(p => ({ ...p, status: e.target.value }))}>
                        <option value="open">open</option>
                        <option value="closed">closed</option>
                      </select>
                    </td>
                    <td style={{ color: '#64748b', fontSize: '0.72rem' }}>{new Date(j.createdAt).toLocaleDateString()}</td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-secondary btn-sm" onClick={() => { setEditId(null); setEditData({}); }}>Cancel</button>
                      <button className="btn-primary btn-sm" onClick={() => handleUpdate(j.jobId)} disabled={saving}>Save</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#6ee7b7' }}>{j.jobId}</td>
                    <td>{j.jobTitle}</td>
                    <td><span className={`badge badge-${j.status}`}>{j.status}</span></td>
                    <td style={{ color: '#64748b', fontSize: '0.72rem' }}>{new Date(j.createdAt).toLocaleDateString()}</td>
                    <td><button className="btn-secondary btn-sm" onClick={() => { setEditId(j.jobId); setEditData({}); }}>Edit</button></td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
