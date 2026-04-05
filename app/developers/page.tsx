import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BackgroundEffects from '@/components/BackgroundEffects';
import DevelopersList from './DevelopersList';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Browse Developers — Virtual Launch Pro',
  description: 'Browse our network of vetted developers available for U.S. client projects.',
};

export default function DevelopersPage() {
  return (
    <div className={styles.app}>
      <BackgroundEffects />
      <Header />
      <main className={styles.main}>
        <div className={styles.inner}>
          <div className={styles.heroHead}>
            <div className={styles.iconWrap}>
              <svg viewBox="0 0 24 24" fill="white" width="28" height="28">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
              </svg>
            </div>
            <h1 className={styles.title}>Available Developers</h1>
            <p className={styles.sub}>Browse our vetted network of talented developers ready for your next project.</p>
          </div>
          <DevelopersList />
        </div>
      </main>
      <section className={styles.ctaSection}>
        <div className={styles.ctaInner}>
          <h2 className={styles.ctaTitle}>Find developers who specialize in exactly what you need</h2>
          <p className={styles.ctaSub}>Browse vetted profiles or tell us what you&apos;re building — we&apos;ll match you.</p>
          <div className={styles.ctaButtons}>
            <a href="/find-developers" className={styles.ctaPrimary}>Find a Developer</a>
            <a href="/pricing" className={styles.ctaSecondary}>View Pricing</a>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
