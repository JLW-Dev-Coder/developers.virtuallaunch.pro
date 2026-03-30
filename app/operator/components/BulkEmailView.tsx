'use client';

import { useEffect, useState } from 'react';
import { getCannedResponses, sendBulkEmail, type CannedResponse } from '@/lib/api';
import styles from '../operator.module.css';

function generateEventId() {
  return 'VLP-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2,7).toUpperCase();
}

export default function BulkEmailView() {
  const [templates, setTemplates] = useState<CannedResponse[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [dryRun, setDryRun] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ recipientCount?: number; sent?: number; failed?: number; dryRun?: boolean } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getCannedResponses().then(d => setTemplates(d.templates ?? [])).catch(() => {});
  }, []);

  function selectTemplate(id: string) {
    setTemplateId(id);
    if (!id) { setSubject(''); setBody(''); return; }
    const t = templates.find(t => t.templateId === id);
    if (t) { setSubject(t.subject); setBody(t.body); }
  }

  async function handleSend() {
    if (!subject) { setError('Subject is required.'); return; }
    if (!body && !templateId) { setError('Body or template is required.'); return; }
    setError(''); setSending(true); setResult(null);
    try {
      const filters: Record<string, unknown> = {};
      if (statusFilter) filters.status = statusFilter;
      const res = await sendBulkEmail({
        eventId: generateEventId(), subject, body: body || undefined,
        templateId: templateId || undefined, dryRun, filters,
      });
      setResult(res);
    } catch {
      setError('Failed to send bulk email.');
    }
    setSending(false);
  }

  return (
    <div>
      <div className={styles.viewHead}><h2 className={styles.viewTitle}>Bulk Email</h2></div>
      <div className={styles.formCard} style={{ maxWidth: 560 }}>
        <div className={styles.formGrid}>
          <div className={styles.formField}>
            <div className={styles.formLabel}>Template (optional)</div>
            <select className="vlp-input" value={templateId} onChange={e => selectTemplate(e.target.value)}>
              <option value="">Custom…</option>
              {templates.map(t => <option key={t.templateId} value={t.templateId}>{t.label}</option>)}
            </select>
          </div>
          <div className={styles.formField}>
            <div className={styles.formLabel}>Subject *</div>
            <input className="vlp-input" value={subject} onChange={e => setSubject(e.target.value)} />
          </div>
          <div className={styles.formField}>
            <div className={styles.formLabel}>Body</div>
            <textarea className="vlp-input" rows={5} value={body}
              onChange={e => setBody(e.target.value)} style={{ resize: 'vertical' }} />
          </div>
          <div className={styles.formRow2}>
            <div className={styles.formField}>
              <div className={styles.formLabel}>Filter by status</div>
              <select className="vlp-input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div className={styles.formField}>
              <div className={styles.formLabel}>Mode</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 8 }}>
                <div className={`toggle-track ${!dryRun ? 'on' : ''}`} onClick={() => setDryRun(p => !p)}>
                  <div className="toggle-knob" />
                </div>
                <span style={{ fontSize: '0.78rem', color: dryRun ? '#6ee7b7' : '#94a3b8' }}>
                  {dryRun ? 'Dry Run (preview only)' : 'Live Send'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {error && <div style={{ marginTop: 10, fontSize: '0.8rem', color: '#fca5a5' }}>{error}</div>}

        {result && (
          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(16,185,129,.08)', border: '1px solid rgba(16,185,129,.2)', fontSize: '0.8rem', color: '#6ee7b7' }}>
            {result.dryRun
              ? `Dry run: ${result.recipientCount ?? 0} recipient(s) would receive this email.`
              : `Sent to ${result.sent ?? 0} recipient(s). Failed: ${result.failed ?? 0}.`}
          </div>
        )}

        <div style={{ marginTop: 14 }}>
          <button className={dryRun ? 'btn-secondary' : 'btn-primary'} onClick={handleSend} disabled={sending}>
            {sending ? <span className="spinner" /> : dryRun ? 'Preview (Dry Run)' : 'Send Bulk Email'}
          </button>
        </div>
      </div>
    </div>
  );
}
