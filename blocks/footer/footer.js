import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

const FALLBACK_TEXT = '© 2026 美しが丘SC';

function buildLogo() {
  const wrap = document.createElement('div');
  wrap.className = 'footer-logo';
  const img = document.createElement('img');
  img.src = '/icons/logo.png';
  img.alt = '美しが丘SC';
  img.width = 48;
  img.height = 48;
  img.loading = 'lazy';
  img.decoding = 'async';
  wrap.append(img);
  return wrap;
}

function renderFallback(block) {
  block.textContent = '';
  const wrapper = document.createElement('div');
  wrapper.className = 'footer-fallback';
  wrapper.append(buildLogo());
  const text = document.createElement('p');
  text.textContent = FALLBACK_TEXT;
  wrapper.append(text);
  block.append(wrapper);
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta || '/footer';

  block.textContent = '';

  let fragment;
  try {
    fragment = await loadFragment(footerPath);
  } catch (e) {
    renderFallback(block);
    return;
  }

  if (!fragment || !fragment.firstElementChild) {
    renderFallback(block);
    return;
  }

  const inner = document.createElement('div');
  inner.className = 'footer-inner';
  while (fragment.firstElementChild) inner.append(fragment.firstElementChild);

  // Merge logo into the brand line. The first <p> normally holds the
  // brand label (<strong>美しが丘SC</strong>); slot the crest in front of
  // it so the two read as one mark instead of two stacked elements.
  const brandLine = inner.querySelector('p:first-child');
  if (brandLine) {
    brandLine.classList.add('footer-brand');
    brandLine.prepend(buildLogo());
  } else {
    inner.prepend(buildLogo());
  }

  block.append(inner);
}
