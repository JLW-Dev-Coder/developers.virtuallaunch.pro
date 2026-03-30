import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BackgroundEffects from '@/components/BackgroundEffects';
import ReviewsClient from './ReviewsClient';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Reviews — Virtual Launch Pro',
  description: 'Hear from developers who landed amazing projects through Virtual Launch Pro.',
};

export default function ReviewsPage() {
  return (
    <div className={styles.app}>
      <BackgroundEffects />
      <Header />
      <main className={styles.main}>
        <div className={styles.inner}>
          <div className={styles.heroHead}>
            <div className={styles.iconWrap}>
              <svg viewBox="0 0 24 24" fill="white" width="28" height="28">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            </div>
            <h1 className={styles.title}>Developer Success Stories</h1>
            <p className={styles.sub}>Hear from developers who landed amazing projects through Virtual Launch Pro.</p>
          </div>
          <ReviewsClient />
        </div>
      </main>
      <section className={styles.ctaSection}>
        <div className={styles.ctaInner}>
          <h2 className={styles.ctaTitle}>Ready to land your next project?</h2>
          <p className={styles.ctaSub}>Join developers already getting matched with vetted U.S. clients.</p>
          <div className={styles.ctaButtons}>
            <a href="/onboarding" className={styles.ctaPrimary}>Get Started Today</a>
            <a href="/support" className={styles.ctaSecondary}>Learn More</a>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
