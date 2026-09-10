// Shared progressive enhancements. The page remains navigable without JavaScript.
const siteNavigation = document.querySelector('.site-nav');
function updateNavigationOffset() {
  if (!siteNavigation) return;
  const height = Math.ceil(siteNavigation.getBoundingClientRect().height);
  document.documentElement.style.setProperty('--site-nav-height', `${height}px`);
}

document.querySelectorAll('.site-nav').forEach((nav) => {
  const toggle = nav.querySelector('.menu-toggle');
  const links = nav.querySelector('.nav-links');
  if (!toggle || !links) return;
  nav.dataset.enhanced = 'true';
  toggle.hidden = false;
  const closeMenu = () => {
    nav.dataset.menuOpen = 'false';
    toggle.setAttribute('aria-expanded', 'false');
    // Update synchronously before the browser follows a section link.
    updateNavigationOffset();
  };
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    nav.dataset.menuOpen = String(open);
    updateNavigationOffset();
  });
  links.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMenu();
  });
  nav.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      toggle.focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (!nav.contains(event.target)) closeMenu();
  });
});

// One offset follows the real header height, including wrapping and text zoom.
updateNavigationOffset();
if (siteNavigation && typeof ResizeObserver !== 'undefined') {
  const navigationObserver = new ResizeObserver(updateNavigationOffset);
  navigationObserver.observe(siteNavigation);
}
window.addEventListener('resize', updateNavigationOffset, { passive: true });

document.querySelectorAll('[data-image-dialog]').forEach((trigger) => {
  const dialog = document.getElementById(trigger.dataset.imageDialog);
  if (!dialog) return;
  trigger.addEventListener('click', () => {
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else {
      const image = dialog.querySelector('img');
      if (image) window.location.assign(image.src);
    }
  });
  dialog.querySelector('[data-dialog-close]')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
});

document.querySelectorAll('[data-video-id]').forEach((container) => {
  const trigger = container.querySelector('.video-launch');
  if (!trigger || !/^[A-Za-z0-9_-]{11}$/.test(container.dataset.videoId)) return;
  trigger.addEventListener('click', (event) => {
    // Preserve opening in a separate tab with modifier keys.
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const frame = document.createElement('iframe');
    frame.src = `https://www.youtube.com/embed/${container.dataset.videoId}?autoplay=1`;
    frame.title = container.dataset.videoTitle;
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.allowFullscreen = true;
    container.replaceChildren(frame);
    frame.focus();
  });
});
