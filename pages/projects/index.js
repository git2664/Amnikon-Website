/* Horizontal case-study browsing and the shared accessible project dialog. */
document.addEventListener('DOMContentLoaded', () => {
  const track = document.querySelector('.case-grid');
  const controls = document.querySelector('.case-controls');
  if (track && controls) {
    const cards = [...track.querySelectorAll('.case-card')];
    const previous = controls.querySelector('.case-previous');
    const next = controls.querySelector('.case-next');
    const status = controls.querySelector('.case-position');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const step = () => cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : track.clientWidth;
    function move(left) { track.scrollTo({left, behavior:motion.matches ? 'auto' : 'smooth'}); }
    function update() {
      const max = Math.max(0, track.scrollWidth - track.clientWidth);
      previous.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= max - 2;
      const first = Math.min(cards.length, Math.round(track.scrollLeft / step()) + 1);
      const visible = Math.max(1, Math.round(track.clientWidth / step()));
      const last = Math.min(cards.length, first + visible - 1);
      status.textContent = (first === last ? first : first + '–' + last) + ' of ' + cards.length;
    }
    controls.hidden = false;
    previous.addEventListener('click', () => move(track.scrollLeft - step()));
    next.addEventListener('click', () => move(track.scrollLeft + step()));
    track.addEventListener('scroll', update, {passive:true});
    track.addEventListener('keydown', event => {
      if (event.target !== track || event.altKey || event.ctrlKey || event.metaKey) return;
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      event.preventDefault();
      move(event.key === 'Home' ? 0 : event.key === 'End' ? track.scrollWidth : track.scrollLeft + (event.key === 'ArrowRight' ? step() : -step()));
    });
    let drag = null;
    track.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'mouse' || event.button !== 0 || event.target.closest('button,a')) return;
      drag = {id:event.pointerId,x:event.clientX,left:track.scrollLeft,active:false};
    });
    track.addEventListener('pointermove', event => {
      if (!drag || event.pointerId !== drag.id) return;
      if (!drag.active && Math.abs(event.clientX - drag.x) < 6) return;
      if (!drag.active) {drag.active = true;track.classList.add('is-dragging');track.setPointerCapture(event.pointerId);}
      event.preventDefault();
      track.scrollLeft = drag.left - (event.clientX - drag.x);
    });
    function finishDrag() {
      if (!drag) return;
      if (track.hasPointerCapture(drag.id)) track.releasePointerCapture(drag.id);
      drag = null;track.classList.remove('is-dragging');update();
    }
    track.addEventListener('pointerup', finishDrag);
    track.addEventListener('pointercancel', finishDrag);
    track.addEventListener('lostpointercapture', () => {drag = null;track.classList.remove('is-dragging');});
    track.addEventListener('pointerleave', () => {if (drag && !drag.active) drag = null;});
    track.querySelectorAll('img').forEach(image => {image.draggable = false;});
    window.addEventListener('resize', update);
    if ('ResizeObserver' in window) new ResizeObserver(update).observe(track);
    update();
  }
  const modal = document.querySelector('.project-modal');
  const close = document.querySelector('.close-modal');
  if (!modal || !window.AmnikonUI) return;
  const dialog = window.AmnikonUI.modal(modal, {openClass:'active',initialFocus:close});
  document.querySelectorAll('.project-btn').forEach(button => {
    button.addEventListener('click', () => {
      const data = button.dataset;
      document.getElementById('modal-title').textContent = data.title || '';
      const image = document.getElementById('modal-image');
      image.src = data.image || '';
      image.alt = data.title || 'Project illustration';
      document.getElementById('modal-description').textContent = data.description || '';
      ['challenge','solution','outcome','source'].forEach(key => {
        document.getElementById('modal-' + key).textContent = data[key] || '';
      });
      const tech = document.getElementById('modal-tech');
      tech.replaceChildren();
      (data.technologies || '').split(',').map(t => t.trim()).filter(Boolean).forEach(text => {
        const badge = document.createElement('span');
        badge.textContent = text;
        tech.appendChild(badge);
      });
      dialog.open(button);
    });
  });
  close?.addEventListener('click', dialog.close);
});
