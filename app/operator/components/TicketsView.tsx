'use client';

import { useEffect, useState } from 'react';
import { getTickets, replyToTicket, type Ticket } from '@/lib/api';
import styles from '../operator.module.css';

function generateEventId() {
  return 'VLP-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2,7).toUpperCase();
}

export default function TicketsView() {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState(false);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState('');

  function load(s = filter) {
    setTickets(null); setError(false);
    const params: Record<string, string> = {};
    if (s) params.status = s;
    getTickets(params).then(d => setTickets(d.results ?? [])).catch(() => setError(true));
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function sendReply(ticketId: string) {
    if (!replyBody) return;
    setSending(true); setMsg('');
    try {
      await replyToTicket(ticketId, { eventId: generateEventId(), body: replyBody });
      setReplyingId(null); setReplyBody('');
      setMsg('Reply sent!');
      setTimeout(() => setMsg(''), 3000);
      load();
    } catch { setMsg('Reply failed.'); }
    setSending(false);
  }

  return (
    <div>
      <div className={styles.viewHead}>
        <h2 className={styles.viewTitle}>Support Tickets</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="vlp-input" style={{ width: 140, fontSize: '0.78rem', padding: '6px 10px' }}
            value={filter} onChange={e => { setFilter(e.target.value); load(e.target.value); }}>
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="closed">Closed</option>
          </select>
          <button className="btn-secondary btn-sm" onClick={() => load()}>Refresh</button>
        </div>
      </div>

      {msg && <div style={{ marginBottom: 10, fontSize: '0.8rem', color: '#6ee7b7' }}>{msg}</div>}
      {error && <div className={styles.errorBox}>Could not load tickets.</div>}

      <div className={styles.tableWrap}>
        <table>
          <thead><tr><th>ID</th><th>Client Ref</th><th>Subject</th><th>Status</th><th>Replies</th><th>Actions</th></tr></thead>
          <tbody>
            {!tickets && !error && [1,2,3].map(i => <tr key={i}><td colSpan={6}><div className="skeleton" style={{ height: 14 }} /></td></tr>)}
            {tickets && tickets.length === 0 && <tr><td colSpan={6}><div className={styles.empty}><p>No tickets found.</p></div></td></tr>}
            {tickets && tickets.map(t => (
              <>
                <tr key={t.ticketId}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#6ee7b7' }}>{t.ticketId.slice(0, 12)}…</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.72rem' }}>{t.clientRef}</td>
                  <td>{t.subject}</td>
                  <td><span className={`badge badge-${t.status}`}>{t.status}</span></td>
                  <td style={{ color: '#64748b' }}>{t.replyCount}</td>
                  <td>
                    <button className="btn-primary btn-sm" onClick={() => { setReplyingId(replyingId === t.ticketId ? null : t.ticketId); setReplyBody(''); }}>
                      {replyingId === t.ticketId ? 'Cancel' : 'Reply'}
                    </button>
                  </td>
                </tr>
                {replyingId === t.ticketId && (
                  <tr key={`reply-${t.ticketId}`}>
                    <td colSpan={6} style={{ padding: '12px 20px', background: 'rgba(16,185,129,.03)' }}>
                      <textarea className="vlp-input" rows={3} placeholder="Write your reply…"
                        value={replyBody} onChange={e => setReplyBody(e.target.value)}
                        style={{ resize: 'vertical', marginBottom: 8 }} />
                      <button className="btn-primary btn-sm" onClick={() => sendReply(t.ticketId)} disabled={sending}>
                        {sending ? <span className="spinner" /> : 'Send Reply'}
                      </button>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
