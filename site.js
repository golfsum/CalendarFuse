(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const menuButton = $('#menuButton');
  const siteNav = $('#siteNav');

  function closeMenu() {
    siteNav?.classList.remove('open');
    document.body.classList.remove('menu-open');
    menuButton?.setAttribute('aria-expanded', 'false');
  }

  menuButton?.addEventListener('click', () => {
    const open = siteNav?.classList.toggle('open');
    document.body.classList.toggle('menu-open', Boolean(open));
    menuButton.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  $$('#siteNav a').forEach((link) => link.addEventListener('click', closeMenu));

  $$('.faq-question').forEach((button) => {
    button.addEventListener('click', () => {
      const item = button.closest('.faq-item');
      const open = item.classList.toggle('open');
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  const lightbox = $('#lightbox');
  const lightboxImage = $('#lightboxImage');
  const lightboxClose = $('#lightboxClose');

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('open');
    document.body.classList.remove('modal-open');
    lightbox.setAttribute('aria-hidden', 'true');
  }

  $$('.screenshot-button').forEach((button) => {
    button.addEventListener('click', () => {
      const image = $('img', button);
      if (!image || !lightbox || !lightboxImage) return;
      lightboxImage.src = image.src;
      lightboxImage.alt = image.alt;
      lightbox.classList.add('open');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      lightboxClose?.focus();
    });
  });

  lightboxClose?.addEventListener('click', closeLightbox);
  lightbox?.addEventListener('click', (event) => { if (event.target === lightbox) closeLightbox(); });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeLightbox();
      closeMenu();
    }
  });

  $$('.current-year').forEach((el) => { el.textContent = String(new Date().getFullYear()); });

  const supportForm = $('#supportForm');
  supportForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(supportForm);
    const name = String(data.get('name') || '').trim();
    const email = String(data.get('email') || '').trim();
    const topic = String(data.get('topic') || 'Support request').trim();
    const message = String(data.get('message') || '').trim();
    const subject = encodeURIComponent(`CalendarFuse support: ${topic}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\nTopic: ${topic}\n\n${message}`);
    window.location.href = `mailto:support@calendarfuse.com?subject=${subject}&body=${body}`;
  });
})();
