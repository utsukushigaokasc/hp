import { getMetadata, decorateIcons } from '../../scripts/aem.js';

const isDesktop = window.matchMedia('(min-width: 1024px)');

const BRAND_FALLBACK = '美しが丘SC';

function buildBrandLink(text) {
  const link = document.createElement('a');
  link.href = '/';
  link.setAttribute('aria-label', `${text} home`);
  const img = document.createElement('img');
  img.src = '/icons/logo.png';
  img.alt = '';
  img.width = 40;
  img.height = 40;
  img.loading = 'eager';
  img.decoding = 'async';
  img.className = 'nav-brand-logo';
  const label = document.createElement('span');
  label.className = 'nav-brand-text';
  label.textContent = text;
  link.append(img, label);
  return link;
}

function makeBrandEl(text) {
  const brand = document.createElement('div');
  brand.className = 'nav-brand';
  brand.append(buildBrandLink(text));
  return brand;
}

function renderBrandOnly(block) {
  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-expanded', 'false');

  nav.append(makeBrandEl(BRAND_FALLBACK));

  const wrapper = document.createElement('div');
  wrapper.className = 'nav-wrapper';
  wrapper.append(nav);
  block.append(wrapper);
}

/**
 * Extract a brand element from a section's first child if it looks like a
 * standalone brand (a heading or a paragraph with a single <strong> token
 * and no other prose). Returns the brand text or null.
 */
function extractBrandText(section) {
  if (!section) return null;
  const first = section.firstElementChild;
  if (!first) return null;

  // h1–h6 directly == brand
  if (/^H[1-6]$/.test(first.tagName)) {
    const text = first.textContent.trim();
    if (text) {
      first.remove();
      return text;
    }
  }

  // <p><strong>BRAND</strong></p> with no siblings inside the <p>
  if (first.tagName === 'P') {
    const strong = first.querySelector('strong');
    const onlyChild = first.children.length === 1 && first.firstElementChild === strong;
    const noStrayText = first.textContent.trim() === (strong?.textContent || '').trim();
    if (strong && onlyChild && noStrayText) {
      const text = strong.textContent.trim();
      first.remove();
      return text;
    }
  }

  return null;
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

  // If the doc author put the brand and links inside one wrapper section
  // (single <div> with <p><strong>BRAND</strong></p> + <ul>...), pull the
  // brand out into its own first section so we never render it twice.
  let sectionEls = [...nav.children];
  if (sectionEls.length === 1) {
    const only = sectionEls[0];
    const brandText = extractBrandText(only);
    if (brandText) {
      const brandSection = makeBrandEl(brandText);
      nav.prepend(brandSection);
      sectionEls = [...nav.children];
    }
  }

  const classes = sectionEls.length === 1
    ? ['sections']
    : ['brand', 'sections', 'tools'];
  classes.forEach((c, i) => {
    const section = sectionEls[i];
    if (!section) return;
    // skip if we already created a structured brand element above
    if (c === 'brand' && section.classList.contains('nav-brand')) return;
    section.classList.add(`nav-${c}`);
  });

  // Defensive: if the brand section is a wrapper that ALSO contains a
  // heading / strong, normalize it so only plain brand text remains.
  const brandSection = nav.querySelector('.nav-brand');
  if (brandSection && !brandSection.querySelector('a')) {
    const text = brandSection.textContent.trim() || BRAND_FALLBACK;
    brandSection.replaceChildren();
    brandSection.append(buildBrandLink(text));
  }

  if (!nav.querySelector('.nav-brand')) {
    nav.prepend(makeBrandEl(BRAND_FALLBACK));
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
