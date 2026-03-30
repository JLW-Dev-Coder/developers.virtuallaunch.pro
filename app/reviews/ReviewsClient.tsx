'use client';

import { useEffect, useState } from 'react';
import { getReviews, submitReview, type Review } from '@/lib/api';
import styles from './page.module.css';

function generateEventId() {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 7).toUpperCase();
  return 'VLP-' + ts + rnd;
}

function Stars({ n, size = 14 }: { n: number; size?: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24" fill={i < n ? '#10b981' : '#475569'} width={size} height={size}
          style={{ opacity: i < n ? 1 : 0.3 }}>
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      ))}
    </div>
  );
}

function ReviewCard({ r, delay }: { r: Review; delay: number }) {
  return (
    <div className={styles.reviewCard} style={{ animationDelay: `${delay}s` }}>
      <div className={styles.reviewHeader}>
        <div>
          <h3 className={styles.reviewAuthor}>{r.author_name}</h3>
          {r.author_role && <p className={styles.reviewRole}>{r.author_role}</p>}
        </div>
        <Stars n={r.rating} />
      </div>
      <p className={styles.reviewText}>{r.review_text}</p>
    </div>
  );
}

export default function ReviewsClient() {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [rating, setRating] = useState(0);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    getReviews()
      .then(d => setReviews(d.reviews ?? []))
      .catch(() => { setLoadError(true); setReviews([]); });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!firstName || !lastName) { setFormError('Please enter your first and last name.'); return; }
    if (!email)   { setFormError('Please enter your email address.'); return; }
    if (!role)    { setFormError('Please enter your role or company.'); return; }
    if (!rating)  { setFormError('Please select a star rating.'); return; }
    if (!text)    { setFormError('Please write a review.'); return; }

    setSubmitting(true);
    try {
      const payload: Review = {
        eventId: generateEventId(),
        author_name: `${firstName} ${lastName}`,
        author_email: email,
        author_role: role,
        rating,
        review_text: text,
      };
      await submitReview(payload);
      setReviews(prev => [payload, ...(prev ?? [])]);
      setFirstName(''); setLastName(''); setEmail(''); setRole(''); setText(''); setRating(0);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 5000);
    } catch {
      setFormError('Submission failed. Please try again.');
    }
    setSubmitting(false);
  }

  return (
    <>
      {loadError && (
        <div className={styles.errorState}>Could not load reviews.</div>
      )}

      {!reviews && !loadError && (
        <div className={styles.loadingState}>Loading reviews…</div>
      )}

      {reviews && reviews.length === 0 && (
        <div className={styles.emptyReviews}>
          <svg viewBox="0 0 24 24" fill="#334155" width="48" height="48">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
          <p>Be the first to review!</p>
        </div>
      )}

      {reviews && reviews.length > 0 && (
        <div className={styles.reviewsGrid}>
          {reviews.map((r, i) => <ReviewCard key={r.eventId} r={r} delay={i * 0.05} />)}
        </div>
      )}

      {/* Form */}
      <div className={styles.formCard}>
        <h2 className={styles.formTitle}>Share Your Experience</h2>
        <p className={styles.formSub}>Worked with Virtual Launch Pro? We&apos;d love to hear about it!</p>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.nameRow}>
            <div className={styles.field}>
              <label className={styles.label}>First Name *</label>
              <input className={`vlp-input field-focus`} placeholder="Jane" value={firstName}
                onChange={e => setFirstName(e.target.value)} required />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Last Name *</label>
              <input className={`vlp-input field-focus`} placeholder="Smith" value={lastName}
                onChange={e => setLastName(e.target.value)} required />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Email Address *</label>
            <input type="email" className={`vlp-input field-focus`} placeholder="jane@example.com"
              value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Role / Company *</label>
            <input className={`vlp-input field-focus`} placeholder="e.g. Full Stack Developer"
              value={role} onChange={e => setRole(e.target.value)} required />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Rating *</label>
            <div className={styles.starRow}>
              {[1, 2, 3, 4, 5].map(n => (
                <button type="button" key={n}
                  className={`${styles.starBtn} ${n <= rating ? styles.starActive : ''}`}
                  onClick={() => setRating(n)}>
                  <svg viewBox="0 0 24 24" fill="#10b981" width="20" height="20">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Your Review *</label>
            <textarea className={`vlp-input field-focus`} rows={4} placeholder="Tell us about your experience…"
              value={text} onChange={e => setText(e.target.value)} required
              style={{ resize: 'vertical' }} />
          </div>
          {formError && <div className={styles.formError}>{formError}</div>}
          {submitted && (
            <div className={styles.formSuccess}>
              <svg viewBox="0 0 24 24" fill="#10b981" width="16" height="16">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              Thank you! Your review has been posted.
            </div>
          )}
          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            {submitting ? <span className="spinner" /> : 'Submit Review'}
          </button>
        </form>
      </div>
    </>
  );
}
