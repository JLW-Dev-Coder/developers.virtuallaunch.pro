import Link from 'next/link';
import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BackgroundEffects from '@/components/BackgroundEffects';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Virtual Launch Pro — Work with U.S. Clients',
  description: 'Connecting talented developers with premium U.S. clients. Set your own rates, choose your projects, scale on your terms.',
};

const features = [
  { title: 'Personalized Job Matches', desc: 'Projects matched to your skills, experience, and hourly rate.' },
  { title: 'Direct Introductions', desc: 'Warm introductions to pre-vetted U.S. clients ready to hire.' },
  { title: 'Profile Amplification', desc: 'Your expertise showcased to top-tier client prospects.' },
  { title: 'Time-Saving Automation', desc: 'Zero cold outreach. Clients come to you.' },
  { title: 'Real-Time Notifications', desc: 'Instant alerts when new opportunities match your profile.' },
];

const painPoints = [
  { title: 'Low-Quality Leads', desc: "Endless platforms with tire-kickers, scope creep, and clients who don't value your expertise." },
  { title: 'Rate Pressure', desc: 'Race-to-the-bottom bidding wars that undervalue your skills and time.' },
  { title: 'Communication Friction', desc: "Vague requirements, scope changes, and clients who don't understand development." },
];

const qualifications = [
  { title: 'Proven Track Record', desc: 'Portfolio, GitHub, or references showing real projects you have shipped.' },
  { title: 'Strong Communication', desc: 'Professional English skills to work directly with U.S. clients.' },
  { title: 'Specialized Expertise', desc: 'Deep focus in one or more technical domains.' },
  { title: 'Reliability & Availability', desc: 'Consistent availability with a professional, accountable work ethic.' },
];

export default function HomePage() {
  return (
    <div className={styles.app}>
      <BackgroundEffects beacon />
      <Header />

      <main className={styles.main}>
        {/* Hero */}
        <section className={styles.hero}>
          <div className={styles.heroGrid}>
            <div className={styles.heroContent}>
              <div className={styles.heroBadge}>
                <svg width="16" height="16" fill="#10b981" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Premium U.S. clients seeking vetted developers. Flexible rates, full control.</span>
              </div>
              <h1 className={`future-headline ${styles.heroTitle}`}>
                Work with U.S. <span className="gradient-text">Clients</span>
              </h1>
              <p className={styles.heroSub}>
                Virtual Launch Pro connects talented developers with high-quality U.S. clients seeking specialized expertise. Set your own rates, choose your projects, scale on your terms.
              </p>
              <div className={styles.heroCtas}>
                <Link href="/onboarding" className={styles.ctaPrimary}>Get Started</Link>
                <a href="#how-it-works" className={styles.ctaSecondary}>How It Works</a>
              </div>
              <div className={styles.heroStats}>
                {[['Your Control', 'Set your own rates'], ['Built for', 'Developers'], ['What you get', 'Real opportunities']].map(([eyebrow, label]) => (
                  <div key={label} className={styles.statCard}>
                    <div className="future-eyebrow">{eyebrow}</div>
                    <div className={styles.statLabel}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.heroVisual}>
              <div className={styles.iconGrid}>
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className={styles.iconItem} style={{ animationDelay: `${i * 0.3}s` }}>
                    <svg viewBox="0 0 24 24" fill="#10b981" width="28" height="28">
                      <circle cx="12" cy="12" r="9" stroke="#10b981" strokeWidth="1.5" fill="none" />
                      <circle cx="12" cy="12" r="3" fill="#10b981" />
                    </svg>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className={styles.section}>
          <div className={styles.sectionInner}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>Why <span className="gradient-text">Developers Love Us</span></h2>
              <p className={styles.sectionSub}>We handle the search so you can focus on what you do best: building amazing things.</p>
            </div>
            <div className={styles.featuresGrid}>
              {features.map(f => (
                <div key={f.title} className={styles.featureCard}>
                  <div className={styles.featureIcon}>
                    <svg viewBox="0 0 24 24" fill="#10b981" width="20" height="20">
                      <path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z" />
                    </svg>
                  </div>
                  <h3 className={styles.featureTitle}>{f.title}</h3>
                  <p className={styles.featureDesc}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pain Points */}
        <section className={styles.painSection}>
          <div className={styles.sectionInner}>
            <h2 className={styles.painTitle}>
              <span>Finding Good Clients is Exhausting.</span>
              <span className={styles.painSub}> We handle the search so you code.</span>
            </h2>
            <div className={styles.painGrid}>
              {painPoints.map(p => (
                <div key={p.title} className={styles.painCard}>
                  <div className={styles.painIcon}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" width="24" height="24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className={styles.painCardTitle}>{p.title}</h3>
                  <p className={styles.painCardDesc}>{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Qualifications */}
        <section className={styles.section}>
          <div className={styles.sectionInner}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>What We <span className="gradient-text">Look For</span></h2>
              <p className={styles.sectionSub}>Professional standards. Real qualifications. Developers we&apos;re proud to recommend.</p>
            </div>
            <div className={styles.qualGrid}>
              {qualifications.map(q => (
                <div key={q.title} className={styles.qualItem}>
                  <div className={styles.qualIcon}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" width="20" height="20">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className={styles.qualTitle}>{q.title}</h3>
                    <p className={styles.qualDesc}>{q.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing / How It Works */}
        <section id="how-it-works" className={styles.pricingSection}>
          <div className={styles.sectionInner}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>Simple, <span className="gradient-text">Transparent Pricing</span></h2>
              <p className={styles.sectionSub}>Start free or go premium. Either way, you get matched with real clients.</p>
            </div>
            <div className={styles.pricingGrid}>
              <div className={styles.pricingCard}>
                <div className="future-eyebrow" style={{ marginBottom: '0.5rem' }}>Starter</div>
                <div className={styles.pricingAmount}>Free</div>
                <p className={styles.pricingDesc}>Get listed and receive occasional job matches.</p>
                <ul className={styles.pricingFeatures}>
                  <li>Profile listing</li>
                  <li>Monthly job notifications</li>
                  <li>Basic support</li>
                </ul>
                <Link href="/onboarding" className={styles.pricingCta}>Get Started Free</Link>
              </div>
              <div className={`${styles.pricingCard} ${styles.pricingCardFeatured}`}>
                <div className={styles.popularBadge}>Most Popular</div>
                <div className="future-eyebrow" style={{ marginBottom: '0.5rem' }}>Premium</div>
                <div className={styles.pricingAmount}>$2.99<span className={styles.pricingPer}>/mo</span></div>
                <p className={styles.pricingDesc}>Priority matching, more client intros, and faster response times.</p>
                <ul className={styles.pricingFeatures}>
                  <li>Priority job matching</li>
                  <li>Weekly notifications</li>
                  <li>Featured profile placement</li>
                  <li>Dedicated support</li>
                </ul>
                <Link href="/onboarding" className={styles.pricingCtaPrimary}>Get Started</Link>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className={styles.ctaSection}>
          <div className={styles.ctaInner}>
            <h2 className={styles.ctaTitle}>Ready to land your next project?</h2>
            <p className={styles.ctaSub}>Join developers already getting matched with vetted U.S. clients. Start earning within days—not months.</p>
            <div className={styles.ctaButtons}>
              <Link href="/onboarding" className={styles.ctaPrimary}>Get Started Today</Link>
              <Link href="/support" className={styles.ctaSecondary}>Learn More</Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
