(async function () {
  const path = window.location.pathname;

  // --- Inject Header ---
  const headerPlaceholder = document.getElementById('site-header');
  if (headerPlaceholder) {
    const res = await fetch('/partials/header.html');
    const html = await res.text();
    headerPlaceholder.outerHTML = html;
  }

  // --- Inject Footer ---
  const footerPlaceholder = document.getElementById('site-footer');
  if (footerPlaceholder) {
    const res = await fetch('/partials/footer.html');
    const html = await res.text();
    footerPlaceholder.outerHTML = html;

    // --- Dynamic Product Links ---
    const productLinks = document.getElementById('footer-product-links');
    if (productLinks) {
      const isIndex = path === '/' || path.includes('index.html');
      const isOnboarding = path.includes('onboarding.html');

      // Base links always shown
      const links = [
        { label: 'Features', href: isIndex ? '#features' : '/index.html#features' },
        { label: 'How It Works', href: isIndex ? '#how-it-works' : '/index.html#how-it-works' },
        { label: 'Reviews', href: '/reviews.html' },
        { label: 'Support', href: '/support.html' },
      ];

      // Page-specific additions
      if (isOnboarding) {
        links.push({ label: 'Get Started', href: '/onboarding.html' });
      } else if (path.includes('find-developers.html')) {
        links.push({ label: 'Find Developers', href: '/find-developers.html' });
      } else if (path.includes('operator.html')) {
        links.push({ label: 'Operator Portal', href: '/operator.html' });
      }

      productLinks.innerHTML = links
        .map(l => `<li><a href="${l.href}" class="text-xs text-slate-400 hover:text-emerald-400 transition">${l.label}</a></li>`)
        .join('');
    }
  }
})();
