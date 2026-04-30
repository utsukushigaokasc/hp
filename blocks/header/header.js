import { getMetadata, decorateIcons } from '../../scripts/aem.js';

const isDesktop = window.matchMedia('(min-width: 900px)');

const BRAND_FALLBACK = 'Tokyo United FC';

function renderBrandOnly(block) {
  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-expanded', 'false');

  const brand = document.createElement('div');
  brand.className = 'nav-brand';
  brand.textContent = BRAND_FALLBACK;
  nav.append(brand);

  const wrapper = document.createElement('div');
  wrapper.className = 'nav-wrapper';
  wrapper.append(nav);
  block.append(wrapper);
}

function toggleMenu(nav, expanded) {
  nav.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  const button = nav.querySelector('.nav-hamburger button');
  if (button) {
    button.setAttribute('aria-label', expanded ? 'Close navigation' : 'Open navigation');
  }
  document.body.style.overflowY = expanded && !isDesktop.matches ? 'hidden' : '';
}

function closeOnEscape(e) {
  if (e.code !== 'Escape') return;
  const nav = document.getElementById('nav');
  if (!nav) return;
  if (nav.getAttribute('aria-expanded') === 'true') {
    toggleMenu(nav, false);
    nav.querySelector('.nav-hamburger button')?.focus();
  }
}

export default async function decorate(block) {
  block.textContent = '';

  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta).pathname : '/nav';

  let html;
  try {
    const resp = await fetch(`${navPath}.plain.html`);
    if (!resp.ok) {
      renderBrandOnly(block);
      return;
    }
    html = await resp.text();
  } catch (e) {
    renderBrandOnly(block);
    return;
  }

  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.innerHTML = html;
  nav.setAttribute('aria-expanded', 'false');

  const sectionEls = [...nav.children];
  const classes = sectionEls.length === 1
    ? ['sections']
    : ['brand', 'sections', 'tools'];
  classes.forEach((c, i) => {
    const section = sectionEls[i];
    if (section) section.classList.add(`nav-${c}`);
  });

  if (!nav.querySelector('.nav-brand')) {
    const brand = document.createElement('div');
    brand.className = 'nav-brand';
    brand.textContent = BRAND_FALLBACK;
    nav.prepend(brand);
  }

  const hamburger = document.createElement('div');
  hamburger.className = 'nav-hamburger';
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.querySelector('button').addEventListener('click', () => {
    const expanded = nav.getAttribute('aria-expanded') === 'true';
    toggleMenu(nav, !expanded);
  });
  nav.append(hamburger);

  isDesktop.addEventListener('change', () => toggleMenu(nav, false));
  window.addEventListener('keydown', closeOnEscape);

  decorateIcons(nav);

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}
