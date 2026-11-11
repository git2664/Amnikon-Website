/* Shared modal lifecycle: one active dialog, inert background, focus containment and restoration. */
window.AmnikonUI = {
  activeModal: null,
  modal(element, { openClass = 'open', initialFocus, onClose } = {}) {
    // Keep dialogs outside page sections so the entire background can become inert.
    document.body.appendChild(element);
    element.hidden = true;
    element.setAttribute('role', 'dialog');
    element.setAttribute('aria-modal', 'true');
    element.tabIndex = -1;
    let opener, previousOverflow, background = [];
    const focusable = () => [...element.querySelectorAll('a[href], button, input, select, textarea, video[controls], [tabindex]')]
      .filter(node => node.tabIndex >= 0 && !node.disabled && !node.closest('[hidden], [inert]') && node.getClientRects().length);
    function close() {
      if (element.hidden) return;
      element.hidden = true;
      element.classList.remove(openClass);
      background.forEach(([node, wasInert]) => { node.inert = wasInert; });
      background = [];
      document.body.style.overflow = previousOverflow;
      window.AmnikonUI.activeModal = null;
      onClose?.();
      if (opener?.isConnected && !opener.closest('[inert], [hidden]')) opener.focus();
    }
    function open(trigger = document.activeElement) {
      if (!element.hidden) return;
      window.AmnikonUI.activeModal?.close();
      opener = trigger;
      previousOverflow = document.body.style.overflow;
      element.hidden = false;
      element.classList.add(openClass);
      background = [...document.body.children].filter(node => node !== element).map(node => [node, node.inert]);
      background.forEach(([node]) => { node.inert = true; });
      document.body.style.overflow = 'hidden';
      window.AmnikonUI.activeModal = { close };
      (initialFocus || focusable()[0] || element).focus();
    }
    element.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
      if (e.key !== 'Tab') return;
      const nodes = focusable(), first = nodes[0], last = nodes[nodes.length - 1];
      if (!first) { e.preventDefault(); element.focus(); }
      else if (e.shiftKey && (document.activeElement === first || document.activeElement === element)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    element.addEventListener('click', e => { if (e.target === element) close(); });
    return { open, close };
  }
};

/* ============================================================
   AMNIKON — Global JavaScript
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const main = document.querySelector('main');
  if (main) {
    main.id ||= 'main-content'; main.tabIndex = -1;
    const skip = document.createElement('a');
    skip.href = '#' + main.id; skip.className = 'skip-link'; skip.textContent = 'Skip to main content';
    skip.addEventListener('click', () => main.focus());
    document.body.prepend(skip);
  }


  /* ──────────────────────────────────────────────
     1. NAVBAR — Scroll shrink + hamburger + dropdowns
  ────────────────────────────────────────────── */
  const navbar     = document.querySelector('.navbar');
  const hamburger  = document.querySelector('.nav-hamburger');
  const navMenu    = document.querySelector('.nav-menu');
  const navActions = document.querySelector('.nav-actions');

  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
  }

  if (hamburger && navMenu) {
    const mobile = window.matchMedia('(max-width: 992px)');
    const dropdowns = [...navbar.querySelectorAll('.has-dropdown')];
    function setDropdown(item, open) {
      item.classList.toggle('open', open);
      item.querySelector('.nav-disclosure').setAttribute('aria-expanded', String(open));
      item.querySelector('.dropdown-menu').hidden = !open;
    }
    function closeDropdowns() { dropdowns.forEach(item => setDropdown(item, false)); }
    function setMenu(open, restore = false) {
      hamburger.classList.toggle('open', open);
      hamburger.setAttribute('aria-expanded', String(open));
      hamburger.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      navMenu.classList.toggle('mobile-open', open);
      navMenu.hidden = mobile.matches && !open;
      if (!open) closeDropdowns();
      if (restore) hamburger.focus();
    }
    hamburger.addEventListener('click', () => setMenu(hamburger.getAttribute('aria-expanded') !== 'true'));
    dropdowns.forEach(item => {
      const button = item.querySelector('.nav-disclosure');
      button.addEventListener('click', () => {
        const open = button.getAttribute('aria-expanded') !== 'true';
        closeDropdowns(); setDropdown(item, open);
      });
      item.addEventListener('mouseenter', () => {
        if (!mobile.matches) { closeDropdowns(); setDropdown(item, true); }
      });
      item.addEventListener('mouseleave', () => {
        if (!mobile.matches && !item.contains(document.activeElement)) setDropdown(item, false);
      });
    });
    navbar.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      const item = e.target.closest('.has-dropdown.open');
      if (item) { setDropdown(item, false); item.querySelector('button').focus(); }
      else if (mobile.matches && hamburger.getAttribute('aria-expanded') === 'true') setMenu(false, true);
      else closeDropdowns();
      e.preventDefault();
    });
    navbar.addEventListener('focusout', e => {
      dropdowns.forEach(item => { if (!item.contains(e.relatedTarget)) setDropdown(item, false); });
      if (!navbar.contains(e.relatedTarget)) setMenu(false);
    });
    document.addEventListener('click', e => { if (!navbar.contains(e.target)) setMenu(false); });
    mobile.addEventListener('change', () => {
      const focusHidden = mobile.matches && navMenu.contains(document.activeElement);
      setMenu(false, focusHidden);
    });
    setMenu(false);
  }

  /* ──────────────────────────────────────────────
     2. ACTIVE NAV LINK — highlight current page
  ────────────────────────────────────────────── */
  const currentPath = window.location.pathname.replace(/\\/g, '/');
  document.querySelectorAll('.nav-menu a').forEach(link => {
    const href = link.getAttribute('href') || '';
    if (href && currentPath.includes(href.replace('../', '').replace('.html', ''))) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });

  /* ──────────────────────────────────────────────
     3. SCROLL REVEAL — Intersection Observer
  ────────────────────────────────────────────── */
  const revealSelectors = '.reveal, .reveal-left, .reveal-right, .reveal-stagger';
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll(revealSelectors).forEach(el => observer.observe(el));

  /* ──────────────────────────────────────────────
     4. COUNTER ANIMATION
  ────────────────────────────────────────────── */
  function animateCounter(el) {
    const target   = parseFloat(el.dataset.target) || 0;
    const suffix   = el.dataset.suffix || '';
    const decimal  = el.dataset.decimal === 'true';
    const duration = 2000;
    const steps    = 60;
    const increment = target / steps;
    let current    = 0;
    let step       = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(increment * step, target);
      el.textContent = (decimal ? current.toFixed(1) : Math.floor(current)) + suffix;
      if (step >= steps) clearInterval(timer);
    }, duration / steps);
  }

  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.counter').forEach(el => counterObserver.observe(el));

  /* ──────────────────────────────────────────────
     5. VIDEO MODAL
  ────────────────────────────────────────────── */
  const openVideoBtn  = document.getElementById('openVideo');
  const videoModal    = document.getElementById('videoModal');
  const modalVideo    = document.getElementById('modalVideo');
  const closeModal    = document.querySelector('.modal-close');

  if (videoModal) {
    const videoDialog = window.AmnikonUI.modal(videoModal, {
      openClass: 'open', initialFocus: closeModal,
      onClose: () => { if (modalVideo) { modalVideo.pause(); modalVideo.currentTime = 0; } }
    });
    openVideoBtn?.addEventListener('click', () => {
      videoDialog.open(openVideoBtn);
      modalVideo?.play()?.catch(() => {});
    });
    closeModal?.addEventListener('click', videoDialog.close);
  }

  /* ──────────────────────────────────────────────
     6. CHATBOT
  ────────────────────────────────────────────── */
  const chatToggle  = document.getElementById('chatbot-toggle');
  const chatWindow  = document.getElementById('chatbot-window');
  const chatInput   = document.getElementById('chatbot-input');
  const chatSend    = document.getElementById('chatbot-send');
  const chatMsgs    = document.getElementById('chatbot-messages');

  function addMessage(text, type = 'bot', link) {
    if (!chatMsgs) return;
    const msg = document.createElement('div');
    msg.className = `chat-msg ${type}`;
    msg.textContent = text;
    if (link) {
      const more = document.createElement('a');
      more.href = link;
      more.textContent = link === '/pages/support/support.html' ? 'Request a Consultation' : 'Read more';
      msg.appendChild(document.createElement('br'));
      msg.appendChild(more);
    }
    chatMsgs.appendChild(msg);
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
    return msg;
  }

  const commonWords = new Set('a an and are as at be can could do does for from have how i in is it me my of on or our please the to us we what when where which who why with you your'.split(' '));
  const aliases = { jobs: 'careers', job: 'careers', openings: 'vacancies', vacancy: 'vacancies', cv: 'resume', resumes: 'resume', cybersecurity: 'security', emails: 'email' };
  const terms = value => (String(value).toLowerCase().match(/[a-z0-9]+/g) || [])
    .filter(word => word.length > 2 && !commonWords.has(word))
    .map(word => aliases[word] || word);
  const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
  let siteIndexPromise;

  async function siteIndex() {
    if (!siteIndexPromise) siteIndexPromise = (async () => {
      const response = await fetch('/sitemap.xml');
      if (!response.ok) throw new Error('Sitemap unavailable');
      const sitemap = new DOMParser().parseFromString(await response.text(), 'application/xml');
      const paths = [...sitemap.querySelectorAll('url > loc')]
        .map(node => new URL(node.textContent).pathname)
        .filter(path => path.startsWith('/pages/') && path.endsWith('.html'));
      const pages = await Promise.all(paths.map(async path => {
        try {
          const pageResponse = await fetch(path);
          if (!pageResponse.ok) return [];
          const page = new DOMParser().parseFromString(await pageResponse.text(), 'text/html');
          const main = page.querySelector('main');
          if (!main) return [];
          const title = clean(page.title.replace(/^AMNIKON TECHNOLOGIES\s*\|\s*/i, ''));
          let heading = title;
          return [...main.querySelectorAll('h1, h2, h3, p, li')].flatMap(node => {
            if (node.closest('nav, form, footer, [hidden], [aria-hidden="true"]')) return [];
            const value = clean(node.textContent);
            if (/^H[1-3]$/.test(node.tagName)) { heading = value || heading; return []; }
            if (value.length < 35 || value.length > 1000) return [];
            return [{ path, title, heading, text: value.slice(0, 420) }];
          });
        } catch { return []; }
      }));
      return pages.flat();
    })();
    return siteIndexPromise;
  }

  async function answerFromSite(question) {
    const query = [...new Set(terms(question))];
    if (!query.length) return null;
    const entries = await siteIndex();
    let best = null;
    for (const entry of entries) {
      const body = entry.text.toLowerCase();
      const heading = entry.heading.toLowerCase();
      const title = entry.title.toLowerCase();
      const matched = query.filter(word => body.includes(word) || heading.includes(word) || title.includes(word));
      if (matched.length < Math.min(2, query.length)) continue;
      const score = matched.length * 4 + query.reduce((sum, word) => sum +
        (body.includes(word) ? 2 : 0) + (heading.includes(word) ? 3 : 0) + (title.includes(word) ? 2 : 0), 0);
      if (!best || score > best.score) best = { ...entry, score };
    }
    return best;
  }

  async function sendMessage() {
    const text = chatInput?.value.trim();
    if (!text || chatSend.disabled) return;
    addMessage(text, 'user');
    chatInput.value = '';
    chatSend.disabled = true;
    const pending = addMessage('Searching our website…');
    try {
      const result = await answerFromSite(text);
      if (result) {
        pending.textContent = `From ${result.heading}: ${result.text}`;
        const link = document.createElement('a');
        link.href = result.path;
        link.textContent = 'Read more';
        pending.appendChild(document.createElement('br'));
        pending.appendChild(link);
      } else {
        pending.textContent = 'I could not find an answer on our website. Please contact us for more information.';
        const link = document.createElement('a');
        link.href = '/pages/support/support.html';
        link.textContent = 'Request a Consultation';
        pending.appendChild(document.createElement('br'));
        pending.appendChild(link);
      }
    } catch {
      pending.textContent = 'I could not search the website right now. Please contact us for more information.';
      const link = document.createElement('a');
      link.href = '/pages/support/support.html';
      link.textContent = 'Request a Consultation';
      pending.appendChild(document.createElement('br'));
      pending.appendChild(link);
    } finally {
      chatSend.disabled = false;
      chatMsgs.scrollTop = chatMsgs.scrollHeight;
    }
  }

  function setChat(open, restore = false) {
    if (!chatWindow || !chatToggle) return;
    chatWindow.hidden = !open;
    chatWindow.classList.toggle('open', open);
    chatToggle.classList.toggle('open', open);
    chatToggle.setAttribute('aria-expanded', String(open));
    chatToggle.setAttribute('aria-label', open ? 'Close chat' : 'Open chat');
    if (open) chatInput?.focus();
    else if (restore) chatToggle.focus();
  }
  chatToggle?.addEventListener('click', () => setChat(chatWindow.hidden));
  document.getElementById('chatbot-close')?.addEventListener('click', () => setChat(false, true));
  document.addEventListener('pointerdown', e => {
    if (chatWindow?.hidden || chatWindow?.contains(e.target) || chatToggle?.contains(e.target)) return;
    setChat(false);
  });
  chatWindow?.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); setChat(false, true); }
  });

  chatSend?.addEventListener('click', sendMessage);
  chatInput?.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });

  /* ──────────────────────────────────────────────
     7. CORE VALUES TABS (About page)
  ────────────────────────────────────────────── */
  const valueItems = document.querySelectorAll('.value-item');
  const valuePanels = document.querySelectorAll('.value-panel');

  if (valueItems.length) {
    valueItems[0].parentElement.setAttribute('role', 'tablist');
    valueItems[0].parentElement.setAttribute('aria-label', 'Our core values');
    function selectValue(item) {
      valueItems.forEach(tab => {
        const selected = tab === item;
        tab.classList.toggle('active', selected);
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
        const panel = document.getElementById('panel-' + tab.dataset.value);
        if (panel) { panel.hidden = !selected; panel.classList.toggle('active', selected); }
      });
    }
    valueItems.forEach((item, index) => {
      item.id = 'value-' + item.dataset.value;
      item.setAttribute('role', 'tab');
      item.setAttribute('aria-controls', 'panel-' + item.dataset.value);
      const panel = document.getElementById('panel-' + item.dataset.value);
      if (panel) {
        panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', item.id); panel.tabIndex = 0;
      }
      item.addEventListener('click', () => selectValue(item));
      item.addEventListener('keydown', e => {
        let next;
        if (e.key === 'ArrowRight') next = (index + 1) % valueItems.length;
        if (e.key === 'ArrowLeft') next = (index + valueItems.length - 1) % valueItems.length;
        if (e.key === 'Home') next = 0;
        if (e.key === 'End') next = valueItems.length - 1;
        if (e.key === 'Enter' || e.key === ' ') next = index;
        if (next !== undefined) { e.preventDefault(); selectValue(valueItems[next]); valueItems[next].focus(); }
      });
    });
    selectValue([...valueItems].find(item => item.classList.contains('active')) || valueItems[0]);
  }

  /* ──────────────────────────────────────────────
     8. LOGO SLIDER — pause on hover
  ────────────────────────────────────────────── */
  const logoTrack = document.querySelector('.logo-track');
  if (logoTrack) {
    logoTrack.addEventListener('mouseenter', () => logoTrack.style.animationPlayState = 'paused');
    logoTrack.addEventListener('mouseleave', () => logoTrack.style.animationPlayState = 'running');
  }

});
