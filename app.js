(() => {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const panel = document.querySelector('.nav-panel');
  const toggle = document.querySelector('.nav-toggle');
  if (panel && toggle) {
    toggle.addEventListener('click', () => {
      const open = panel.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    panel.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        panel.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  const header = document.querySelector('.site-header');
  let lastY = window.scrollY;
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      if (header) {
        if (y > 200 && y > lastY) header.classList.add('is-hidden');
        else header.classList.remove('is-hidden');
      }
      lastY = y;
      ticking = false;
    });
    ticking = true;
  }, { passive: true });

  const reveals = document.querySelectorAll(
    '.story, .events, .gallery, .testimonial, .location, .contact'
  );
  reveals.forEach(el => el.classList.add('reveal'));

  const io = new IntersectionObserver(
    entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
  );
  reveals.forEach(el => io.observe(el));
})();
