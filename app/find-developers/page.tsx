'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BackgroundEffects from '@/components/BackgroundEffects';
import { submitMatchIntake } from '@/lib/api';
import styles from './page.module.css';

function generateEventId() {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 7).toUpperCase();
  return 'VLP-' + ts + rnd;
}

const PROJECT_TYPES = ['Web Application', 'Mobile App', 'API / Backend', 'E-commerce', 'Data / Analytics', 'AI / ML', 'Other'];
const BUDGETS = ['Under $5K', '$5K–$15K', '$15K–$50K', '$50K–$150K', '$150K+'];
const TIMELINES = ['ASAP', '1–3 months', '3–6 months', '6–12 months', 'Flexible'];
const SKILL_PREFS = ['Frontend', 'Backend', 'Full Stack', 'Mobile', 'Data / ML', 'DevOps'];
const EXP_LEVELS = ['Junior', 'Mid-Level', 'Senior', 'Lead / Principal'];

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function FindDevelopersPage() {
  const [form, setForm] = useState({
    companyName: '', contactName: '', email: '', phone: '',
    projectTypes: [] as string[], projectDesc: '', budget: '', timeline: '',
    skillsPreference: '', experienceLevel: '', additionalNotes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  function set(field: string, value: string | string[]) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function toggleProjectType(t: string) {
    setForm(prev => ({
      ...prev,
      projectTypes: prev.projectTypes.includes(t)
        ? prev.projectTypes.filter(x => x !== t)
        : [...prev.projectTypes, t],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.companyName || !form.contactName || !form.email || form.projectTypes.length === 0
      || !form.projectDesc || !form.budget || !form.timeline || !form.skillsPreference || !form.experienceLevel) {
      setError('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    try {
      await submitMatchIntake({
        eventId: generateEventId(),
        ...form,
        projectType: form.projectTypes.join(', '),
      });
      setDone(true);
    } catch {
      setError('Submission failed. Please try again.');
    }
    setSubmitting(false);
  }

  return (
    <div className={styles.app}>
      <BackgroundEffects />
      <Header />
      <main className={styles.main}>
        {/* Hero */}
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.eyebrow}>For Businesses</div>
            <h1 className={styles.title}>Find the <span className="gradient-text">Right Developer</span></h1>
            <p className={styles.sub}>Tell us what you need. We&apos;ll match you with a vetted developer from our network — ready to start fast.</p>
          </div>
        </section>

        {/* Form */}
        <section className={styles.formSection}>
          <div className={styles.formInner}>
            {done ? (
              <div className={styles.successCard}>
                <div className={styles.successIcon}>
                  <svg viewBox="0 0 24 24" fill="white" width="36" height="36">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                </div>
                <h2 className={styles.successTitle}>Request Received!</h2>
                <p className={styles.successSub}>We&apos;ll review your requirements and match you with the right developer within 1–2 business days.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className={styles.form} noValidate>
                <h2 className={styles.formTitle}>Developer Match Request</h2>
                <p className={styles.formSub}>Fill out the form below and we&apos;ll find your perfect match.</p>

                <div className={styles.row2}>
                  <div className={styles.field}>
                    <label className={styles.label}>Company Name *</label>
                    <input className="vlp-input field-focus" placeholder="Acme Corp" value={form.companyName}
                      onChange={e => set('companyName', e.target.value)} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Your Name *</label>
                    <input className="vlp-input field-focus" placeholder="Jane Smith" value={form.contactName}
                      onChange={e => set('contactName', e.target.value)} />
                  </div>
                </div>
                <div className={styles.row2}>
                  <div className={styles.field}>
                    <label className={styles.label}>Email *</label>
                    <input type="email" className="vlp-input field-focus" placeholder="jane@acme.com"
                      value={form.email} onChange={e => set('email', e.target.value)} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Phone</label>
                    <input type="tel" className="vlp-input field-focus" placeholder="(555) 000-0000"
                      value={form.phone}
                      onChange={e => set('phone', e.target.value)}
                      onBlur={e => set('phone', normalizePhone(e.target.value))} />
                  </div>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Project Type * <span style={{ fontWeight: 400, color: '#64748b' }}>(select all that apply)</span></label>
                  <div className={styles.checkboxGrid}>
                    {PROJECT_TYPES.map(t => {
                      const checked = form.projectTypes.includes(t);
                      return (
                        <label key={t} className={`${styles.checkboxChip} ${checked ? styles.checkboxChecked : ''}`}>
                          <input type="checkbox" checked={checked} onChange={() => toggleProjectType(t)} />
                          <span>{t}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Project Description *</label>
                  <textarea className="vlp-input field-focus" rows={4}
                    placeholder="Describe what you want to build…"
                    value={form.projectDesc} onChange={e => set('projectDesc', e.target.value)}
                    style={{ resize: 'vertical' }} />
                </div>
                <div className={styles.row2}>
                  <div className={styles.field}>
                    <label className={styles.label}>Budget *</label>
                    <select className="vlp-input field-focus" value={form.budget}
                      onChange={e => set('budget', e.target.value)}>
                      <option value="">Select…</option>
                      {BUDGETS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Timeline *</label>
                    <select className="vlp-input field-focus" value={form.timeline}
                      onChange={e => set('timeline', e.target.value)}>
                      <option value="">Select…</option>
                      {TIMELINES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className={styles.row2}>
                  <div className={styles.field}>
                    <label className={styles.label}>Skills Needed *</label>
                    <select className="vlp-input field-focus" value={form.skillsPreference}
                      onChange={e => set('skillsPreference', e.target.value)}>
                      <option value="">Select…</option>
                      {SKILL_PREFS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Experience Level *</label>
                    <select className="vlp-input field-focus" value={form.experienceLevel}
                      onChange={e => set('experienceLevel', e.target.value)}>
                      <option value="">Select…</option>
                      {EXP_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Additional Notes</label>
                  <textarea className="vlp-input field-focus" rows={3}
                    placeholder="Anything else we should know…"
                    value={form.additionalNotes} onChange={e => set('additionalNotes', e.target.value)}
                    style={{ resize: 'vertical' }} />
                </div>
                {error && <div className={styles.errorMsg}>{error}</div>}
                <button type="submit" className={styles.submitBtn} disabled={submitting}>
                  {submitting ? <span className="spinner" /> : 'Submit Request'}
                </button>
              </form>
            )}
          </div>
        </section>
      </main>
      <section className={styles.ctaSection}>
        <div className={styles.ctaInner}>
          <h2 className={styles.ctaTitle}>Find developers who specialize in exactly what you need</h2>
          <p className={styles.ctaSub}>Browse vetted profiles or tell us what you&apos;re building — we&apos;ll match you.</p>
          <div className={styles.ctaButtons}>
            <a href="/developers" className={styles.ctaPrimary}>Find a Developer</a>
            <a href="/pricing" className={styles.ctaSecondary}>View Pricing</a>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
