'use client';

import { useEffect, useState } from 'react';
import { getOperatorDevelopers, getMessages, sendMessage, type Developer, type Message } from '@/lib/api';
import styles from '../operator.module.css';

function generateEventId() {
  return 'VLP-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2,7).toUpperCase();
}

export default function MessagesView() {
  const [devs, setDevs] = useState<Pick<Developer, 'ref_number' | 'full_name' | 'status' | 'publish_profile'>[]>([]);
  const [selectedRef, setSelectedRef] = useState('');
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    getOperatorDevelopers().then(d => setDevs(d.results ?? [])).catch(() => {});
  }, []);

  function loadMessages(ref: string) {
    setMessages(null); setLoadingMsgs(true);
    getMessages(ref).then(d => { setMessages(d.messages ?? []); }).catch(() => setMessages([])).finally(() => setLoadingMsgs(false));
  }

  function selectDev(ref: string) {
    setSelectedRef(ref);
    if (ref) loadMessages(ref);
    else setMessages(null);
  }

  async function handleSend() {
    if (!selectedRef || !subject || !body) { setMsg('All fields are required.'); return; }
    setSending(true); setMsg('');
    try {
      await sendMessage({ eventId: generateEventId(), ref_number: selectedRef, subject, body });
      setMsg('Message sent!');
      setSubject(''); setBody('');
      loadMessages(selectedRef);
    } catch { setMsg('Failed to send.'); }
    setSending(false);
  }

  return (
    <div>
      <div className={styles.viewHead}><h2 className={styles.viewTitle}>Messages</h2></div>
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1.5fr' }}>
        {/* Composer */}
        <div className={styles.formCard}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f1f5f9', marginBottom: 12 }}>Send Message</h3>
          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <div className={styles.formLabel}>Developer *</div>
              <select className="vlp-input" value={selectedRef} onChange={e => selectDev(e.target.value)}>
                <option value="">Select…</option>
                {devs.map(d => <option key={d.ref_number} value={d.ref_number}>{String(d.full_name ?? d.ref_number)}</option>)}
              </select>
            </div>
            <div className={styles.formField}>
              <div className={styles.formLabel}>Subject *</div>
              <input className="vlp-input" value={subject} onChange={e => setSubject(e.target.value)} />
            </div>
            <div className={styles.formField}>
              <div className={styles.formLabel}>Message *</div>
              <textarea className="vlp-input" rows={5} value={body} onChange={e => setBody(e.target.value)} style={{ resize: 'vertical' }} />
            </div>
          </div>
          {msg && <div style={{ marginTop: 8, fontSize: '0.8rem', color: msg.includes('sent') ? '#6ee7b7' : '#fca5a5' }}>{msg}</div>}
          <div style={{ marginTop: 12 }}>
            <button className="btn-primary btn-sm" onClick={handleSend} disabled={sending}>
              {sending ? <span className="spinner" /> : 'Send'}
            </button>
          </div>
        </div>

        {/* Thread */}
        <div className={styles.formCard}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f1f5f9', marginBottom: 12 }}>Thread</h3>
          {!selectedRef && <p style={{ fontSize: '0.8rem', color: '#475569' }}>Select a developer to view their thread.</p>}
          {loadingMsgs && <div className="skeleton" style={{ height: 80 }} />}
          {messages && messages.length === 0 && <p style={{ fontSize: '0.8rem', color: '#475569' }}>No messages yet.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 400, overflowY: 'auto' }}>
            {messages && messages.map(m => (
              <div key={m.eventId} style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(16,185,129,.12)', border: '1px solid rgba(16,185,129,.18)', color: '#d1fae5', fontSize: '0.8rem', lineHeight: 1.55 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{m.subject}</div>
                <div>{m.body}</div>
                <div style={{ fontSize: '0.68rem', color: '#475569', marginTop: 6 }}>{new Date(m.sentAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
