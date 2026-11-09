/* Optional entrance polish; sector details work natively without JavaScript. */
(() => {
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('sector-enter');
      observer.unobserve(entry.target);
    });
  }, {threshold: .08});
  document.querySelectorAll('.sector-card').forEach(card => observer.observe(card));
})();
