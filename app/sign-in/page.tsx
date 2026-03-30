'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import BackgroundEffects from '@/components/BackgroundEffects';
import styles from './page.module.css';

const API_BASE = 'https://api.virtuallaunch.pro';

function SignInContent() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/';

  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) { setError('Please enter your email address.'); return; }
    setError('');
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/v1/auth/magic-link/request`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, redirect }),
      });
      if (!res.ok) throw new Error('Request failed');
      setSent(true);
    } catch {
      setError('Could not send magic link. Please try again.');
    }
    setSending(false);
  }

  function handleGoogle() {
    window.location.href = `${API_BASE}/v1/auth/google/start?redirect=${encodeURIComponent(redirect)}`;
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoMark}>VLP</span>
        </Link>
        <h1 className={styles.title}>Sign in</h1>
        <p className={styles.sub}>to Virtual Launch Pro</p>
      </div>

      {sent ? (
        <div className={styles.sentCard}>
          <div className={styles.sentIcon}>
            <svg viewBox="0 0 24 24" fill="#10b981" width="28" height="28">
              <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
            </svg>
          </div>
          <h2 className={styles.sentTitle}>Check your email</h2>
          <p className={styles.sentSub}>We sent a magic link to <strong>{email}</strong>. Click it to sign in — it expires in 15 minutes.</p>
        </div>
      ) : (
        <>
          {/* Google */}
          <button className={styles.googleBtn} onClick={handleGoogle}>
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
              <path fill="#34A853" d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.615 24 12.255 24z" />
              <path fill="#FBBC05" d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z" />
              <path fill="#EA4335" d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.64 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
            </svg>
            Continue with Google
          </button>

          <div className={styles.divider}>
            <span className={styles.dividerText}>or</span>
          </div>

          {/* Magic Link */}
          <form onSubmit={handleMagicLink} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Email address</label>
              <input
                type="email"
                className={`vlp-input field-focus ${styles.input}`}
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            {error && <div className={styles.errorMsg}>{error}</div>}
            <button type="submit" className={styles.submitBtn} disabled={sending}>
              {sending ? <span className="spinner" /> : 'Send Magic Link'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

export default function SignInPage() {
  return (
    <div className={styles.page}>
      <BackgroundEffects beacon />
      <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><div className="spinner" style={{ width: 24, height: 24 }} /></div>}>
        <SignInContent />
      </Suspense>
    </div>
  );
}
