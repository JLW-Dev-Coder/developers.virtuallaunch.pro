'use client';

import { useEffect, useRef } from 'react';
import styles from './page.module.css';

const CAL_LINK = 'virtuallaunchpro/intro';

type CalFn = (action: string, opts?: Record<string, unknown>) => void;
interface CalGlobal {
  Cal?: CalFn;
}

export default function BookCallCard() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || typeof window === 'undefined') return;
    initialized.current = true;

    const w = window as unknown as CalGlobal & { document: Document };
    if (w.Cal) return;

    const script = document.createElement('script');
    script.src = 'https://app.cal.com/embed/embed.js';
    script.async = true;
    script.onload = () => {
      // The embed.js script attaches a global Cal() function once loaded.
      const cal = (window as unknown as CalGlobal).Cal;
      if (cal) {
        cal('init', { origin: 'https://cal.com' });
        cal('ui', { theme: 'dark', styles: { branding: { brandColor: '#10b981' } } });
      }
    };
    document.head.appendChild(script);
  }, []);

  function openPopup() {
    if (typeof window === 'undefined') return;
    const cal = (window as unknown as CalGlobal).Cal;
    if (cal) {
      cal('modal', { calLink: CAL_LINK, config: { theme: 'dark' } });
    } else {
      window.open(`https://cal.com/${CAL_LINK}`, '_blank', 'noopener');
    }
  }

  return (
    <section id="book-call" className={styles.bookCallSection}>
      <div className={styles.bookCallCard}>
        <div className={styles.bookCallIcon}>
          <svg viewBox="0 0 24 24" fill="white" width="24" height="24">
            <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z" />
          </svg>
        </div>
        <div className={styles.bookCallBody}>
          <h3 className={styles.bookCallTitle}>Book a Call With Our Team</h3>
          <p className={styles.bookCallDesc}>
            Talk directly with the VLP team. We&apos;ll answer your questions, walk you through the platform,
            and help you get matched with the right opportunities.
          </p>
        </div>
        <button type="button" onClick={openPopup} className={styles.bookCallBtn}>
          Schedule Now
        </button>
      </div>
    </section>
  );
}
