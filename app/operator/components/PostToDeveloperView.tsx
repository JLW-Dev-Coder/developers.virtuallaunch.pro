'use client';

import { useEffect, useState } from 'react';
import { getOperatorDevelopers, getOperatorJobs, postToDeveloper, type Developer, type Job } from '@/lib/api';
import styles from '../operator.module.css';

function generateEventId() {
  return 'VLP-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2,7).toUpperCase();
}

export default function PostToDeveloperView() {
  const [devs, setDevs] = useState<Pick<Developer, 'ref_number' | 'full_name' | 'status' | 'publish_profile'>[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedDev, setSelectedDev] = useState('');
  const [selectedJob, setSelectedJob] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [posting, setPosting] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    getOperatorDevelopers({ status: 'active' }).then(d => setDevs(d.results ?? [])).catch(() => {});
    getOperatorJobs('open').then(d => setJobs(d.results ?? [])).catch(() => {});
  }, []);

  const selectedJobObj = jobs.find(j => j.jobId === selectedJob);

  async function handlePost() {
    if (!selectedDev) { setMsg('Select a developer.'); return; }
    const title = customTitle || (selectedJobObj ? selectedJobObj.jobTitle : '');
    const desc  = customDesc  || (selectedJobObj ? selectedJobObj.jobDescription : '');
    if (!title || !desc) { setMsg('Job title and description are required.'); return; }

    setPosting(true); setMsg('');
    try {
      await postToDeveloper({
        eventId: generateEventId(),
        ref_number: selectedDev,
        jobTitle: title,
        jobDescription: desc,
        jobId: selectedJob || undefined,
      });
      setMsg('Post sent successfully!');
      setSelectedDev(''); setSelectedJob(''); setCustomTitle(''); setCustomDesc('');
    } catch {
      setMsg('Failed to send post.');
    }
    setPosting(false);
  }

  return (
    <div>
      <div className={styles.viewHead}>
        <h2 className={styles.viewTitle}>Post to Developer</h2>
      </div>
      <div className={styles.formCard} style={{ maxWidth: 540 }}>
        <div className={styles.formGrid}>
          <div className={styles.formField}>
            <div className={styles.formLabel}>Developer *</div>
            <select className="vlp-input" value={selectedDev} onChange={e => setSelectedDev(e.target.value)}>
              <option value="">Select developer…</option>
              {devs.map(d => <option key={d.ref_number} value={d.ref_number}>{String(d.full_name ?? d.ref_number)}</option>)}
            </select>
          </div>
          <div className={styles.formField}>
            <div className={styles.formLabel}>Job (optional — pre-fills fields)</div>
            <select className="vlp-input" value={selectedJob}
              onChange={e => { setSelectedJob(e.target.value); setCustomTitle(''); setCustomDesc(''); }}>
              <option value="">Custom post…</option>
              {jobs.map(j => <option key={j.jobId} value={j.jobId}>{j.jobTitle}</option>)}
            </select>
          </div>
          <div className={styles.formField}>
            <div className={styles.formLabel}>Job Title {!selectedJob && '*'}</div>
            <input className="vlp-input" placeholder={selectedJobObj?.jobTitle ?? ''}
              value={customTitle} onChange={e => setCustomTitle(e.target.value)} />
          </div>
          <div className={styles.formField}>
            <div className={styles.formLabel}>Description {!selectedJob && '*'}</div>
            <textarea className="vlp-input" rows={4}
              placeholder={selectedJobObj?.jobDescription ?? ''}
              value={customDesc} onChange={e => setCustomDesc(e.target.value)}
              style={{ resize: 'vertical' }} />
          </div>
        </div>
        {msg && <div style={{ marginTop: 10, fontSize: '0.8rem', color: msg.includes('success') ? '#6ee7b7' : '#fca5a5' }}>{msg}</div>}
        <div style={{ marginTop: 12 }}>
          <button className="btn-primary" onClick={handlePost} disabled={posting}>
            {posting ? <span className="spinner" /> : 'Send Post'}
          </button>
        </div>
      </div>
    </div>
  );
}
