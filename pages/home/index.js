/* One connected homepage sequence: image expands, then benefit cards reveal over it. */
(() => {
  const sequence = document.querySelector('.home-story-sequence');
  const stage = sequence?.querySelector('.home-story-stage');
  const frame = sequence?.querySelector('.home-story-frame');
  const shade = sequence?.querySelector('.home-story-shade');
  const cards = [...(sequence?.querySelectorAll('.why-item') || [])];
  if (sequence && stage && frame && cards.length && window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add('(min-width: 993px)', () => {
      sequence.classList.add('is-animated');
      gsap.set(cards, { opacity: 0, y: 60, force3D: false });
      gsap.set(shade, { opacity: 0 });
      const imageRun = 1200, cardRun = 550;
      const timeline = gsap.timeline({
        scrollTrigger: {
          id: 'home-image-and-cards', trigger: sequence, start: 'top top',
          end: () => '+=' + (imageRun + cards.length * cardRun),
          pin: stage, scrub: 1.2, anticipatePin: 1, invalidateOnRefresh: true
        }
      });
      // Explicit start/end measurements survive refreshes and browser zoom changes.
      timeline.fromTo(frame, {
        width: () => Math.min(700, Math.max(500, stage.clientWidth * 0.38)),
        height: () => Math.min(420, Math.max(310, stage.clientWidth * 0.24)),
        borderRadius: 24
      }, {
        width: () => stage.clientWidth,
        height: () => stage.clientHeight,
        borderRadius: 0, duration: 1100, ease: 'power2.inOut'
      }, 0)
        .to({}, { duration: 100 }, 1100)
        .to(shade, { opacity: 0.2, duration: 200, ease: 'none' }, imageRun);
      cards.forEach((card, index) => {
        const start = imageRun + index * cardRun;
        timeline.fromTo(card, { opacity: 0, y: 60 }, { opacity: 1, y: 0, force3D: false, duration: 400, ease: 'power3.out' }, start)
          .to({}, { duration: 150 }, start + 400);
      });
      return () => sequence.classList.remove('is-animated');
    });
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
  }
  // Shared accessible video dialog remains owned by global.js.
  const word = document.getElementById('dynamic-word');
  if (word) {
    const words = ['DISCOUNT TIRE', 'RAVID IT', 'DRINKPAK', 'XORIANT', 'GEOMETRY', 'NEUROCONSULT', 'ANX DESIGN STUDIO'];
    let index = 0; word.textContent = words[index];
    setInterval(() => {
      word.style.opacity = 0;
      setTimeout(() => { index = (index + 1) % words.length; word.textContent = words[index]; word.style.opacity = 1; }, 300);
    }, 2500);
  }
})();
