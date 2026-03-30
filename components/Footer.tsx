import Link from 'next/link';
import styles from './Footer.module.css';

const productLinks = [
  { href: '/onboarding', label: 'Get Started' },
  { href: '/developers', label: 'Browse Developers' },
  { href: '/find-developers', label: 'Find Developers' },
  { href: '/reviews', label: 'Reviews' },
  { href: '/support', label: 'Support' },
];

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.grid}>
          <div>
            <Link href="/" className={styles.logo}>
              <span className={styles.logoMark}>VLP</span>
              <div>
                <div className={styles.logoName}>Virtual Launch Pro</div>
                <div className={styles.logoSub}>Job Match &amp; Intro</div>
              </div>
            </Link>
            <p className={styles.tagline}>Connecting talented developers with premium U.S. clients.</p>
          </div>

          <div>
            <h3 className={styles.colHead}>Product</h3>
            <ul className={styles.list}>
              {productLinks.map(l => (
                <li key={l.href}>
                  <Link href={l.href} className={styles.link}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className={styles.colHead}>Company</h3>
            <ul className={styles.list}>
              <li><a href="https://www.facebook.com/jamie.l.williams.10" target="_blank" rel="noopener noreferrer" className={styles.link}>Facebook</a></li>
              <li><a href="https://www.linkedin.com/in/virtuallaunchpro/" target="_blank" rel="noopener noreferrer" className={styles.link}>LinkedIn</a></li>
              <li><a href="https://t.me/virtuallaunchpro" target="_blank" rel="noopener noreferrer" className={styles.link}>Telegram</a></li>
            </ul>
          </div>

          <div>
            <h3 className={styles.colHead}>Support</h3>
            <ul className={styles.list}>
              <li><a href="tel:+16198005457" className={styles.link}>+1 (619) 800-5457</a></li>
              <li><a href="https://t.me/virtuallaunchpro" target="_blank" rel="noopener noreferrer" className={styles.link}>@virtuallaunchpro</a></li>
            </ul>
          </div>
        </div>

        <div className={styles.bottom}>
          <p className={styles.copy}>© 2024 Virtual Launch Pro. All rights reserved.</p>
          <p className={styles.copy}>Helping developers launch their freelance careers with the right clients.</p>
        </div>
      </div>
    </footer>
  );
}
