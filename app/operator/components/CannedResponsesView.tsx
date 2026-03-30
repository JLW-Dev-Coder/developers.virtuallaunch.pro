'use client';

import { useEffect, useState } from 'react';
import { getCannedResponses, createCannedResponse, updateCannedResponse, deleteCannedResponse, type CannedResponse } from '@/lib/api';
import styles from '../operator.module.css';

function generateEventId() {
  return 'VLP-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2,7).toUpperCase();
}

export default function CannedResponsesView() {
  const [templates, setTemplates] = useState<CannedResponse[] | null>(null);
  const [error, setError] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ label: '', userType: 'developer', subject: '', body: '' });
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  function load() {
    setTemplates(null); setError(false);
    getCannedResponses().then(d => setTemplates(d.templates ?? [])).catch(() => setError(true));
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!form.label || !form.subject || !form.body) { setMsg('All fields required.'); return; }
    setSaving(true); setMsg('');
    try {
      await createCannedResponse({ eventId: generateEventId(), ...form });
      setCreating(false); setForm({ label: '', userType: 'developer', subject: '', body: '' });
      load();
    } catch { setMsg('Create failed.'); }
    setSaving(false);
  }

  async function handleUpdate(id: string) {
    setSaving(true);
    try {
      await updateCannedResponse(id, editForm);
      setEditId(null); setEditForm({});
      load();
    } catch { setMsg('Update failed.'); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this template?')) return;
    try {
      await deleteCannedResponse(id);
      load();
    } catch (e: unknown) {
      const body = (e as { body?: { error?: string } })?.body;
      if (body?.error === 'protected') setMsg('Cannot delete a default template.');
      else setMsg('Delete failed.');
    }
  }

  return (
    <div>
      <div className={styles.viewHead}>
        <h2 className={styles.viewTitle}>Canned Responses</h2>
        <button className="btn-primary btn-sm" onClick={() => setCreating(true)}>+ New Template</button>
      </div>

      {msg && <div style={{ marginBottom: 10, fontSize: '0.8rem', color: '#fca5a5' }}>{msg}</div>}
      {error && <div className={styles.errorBox}>Could not load templates.</div>}

      {creating && (
        <div className={styles.formCard} style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f1f5f9', marginBottom: 12 }}>New Template</h3>
          <div className={styles.formGrid}>
            <div className={styles.formRow2}>
              <div className={styles.formField}>
                <div className={styles.formLabel}>Label *</div>
                <input className="vlp-input" value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} />
              </div>
              <div className={styles.formField}>
                <div className={styles.formLabel}>User Type</div>
                <select className="vlp-input" value={form.userType} onChange={e => setForm(p => ({ ...p, userType: e.target.value }))}>
                  <option value="developer">Developer</option>
                  <option value="client">Client</option>
                </select>
              </div>
            </div>
            <div className={styles.formField}>
              <div className={styles.formLabel}>Subject *</div>
              <input className="vlp-input" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} />
            </div>
            <div className={styles.formField}>
              <div className={styles.formLabel}>Body *</div>
              <textarea className="vlp-input" rows={4} value={form.body}
                onChange={e => setForm(p => ({ ...p, body: e.target.value }))} style={{ resize: 'vertical' }} />
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {!templates && !error && [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 8 }} />)}
        {templates && templates.map(t => (
          <div key={t.templateId} className={styles.formCard}>
            {editId === t.templateId ? (
              <div className={styles.formGrid}>
                <div className={styles.formRow2}>
                  <div className={styles.formField}>
                    <div className={styles.formLabel}>Label</div>
                    <input className="vlp-input" value={editForm.label ?? t.label}
                      onChange={e => setEditForm(p => ({ ...p, label: e.target.value }))} />
                  </div>
                  <div className={styles.formField}>
                    <div className={styles.formLabel}>Subject</div>
                    <input className="vlp-input" value={editForm.subject ?? t.subject}
                      onChange={e => setEditForm(p => ({ ...p, subject: e.target.value }))} />
                  </div>
                </div>
                <div className={styles.formField}>
                  <div className={styles.formLabel}>Body</div>
                  <textarea className="vlp-input" rows={3} value={editForm.body ?? t.body}
                    onChange={e => setEditForm(p => ({ ...p, body: e.target.value }))} style={{ resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-secondary btn-sm" onClick={() => { setEditId(null); setEditForm({}); }}>Cancel</button>
                  <button className="btn-primary btn-sm" onClick={() => handleUpdate(t.templateId)} disabled={saving}>Save</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f1f5f9' }}>{t.label}</span>
                    <span className={`badge badge-${t.userType === 'developer' ? 'active' : 'open'}`}>{t.userType}</span>
                    {t.isDefault && <span className="badge badge-pending">default</span>}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{t.subject}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button className="btn-secondary btn-sm" onClick={() => { setEditId(t.templateId); setEditForm({}); }}>Edit</button>
                  {!t.isDefault && <button className="btn-danger btn-sm" onClick={() => handleDelete(t.templateId)}>Delete</button>}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
