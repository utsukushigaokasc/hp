import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

const FALLBACK_TEXT = '© 2026 美しが丘SC';

function buildLogo() {
  const wrap = document.createElement('div');
  wrap.className = 'footer-logo';
  const img = document.createElement('img');
  img.src = '/icons/logo.png';
  img.alt = '美しが丘SC';
  img.width = 72;
  img.height = 72;
  img.loading = 'lazy';
  img.decoding = 'async';
  wrap.append(img);
  return wrap;
}

function buildWordmark() {
  const mark = document.createElement('div');
  mark.className = 'footer-wordmark';
  mark.setAttribute('aria-hidden', 'true');
  mark.textContent = '美しが丘SC';
  return mark;
}

function renderFallback(block) {
  block.textContent = '';
  const wrapper = document.createElement('div');
  wrapper.className = 'footer-fallback';
  wrapper.textContent = FALLBACK_TEXT;
  block.append(wrapper);
  block.prepend(buildLogo());
  block.append(buildWordmark());
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
  block.append(inner);
  block.prepend(buildLogo());
  block.append(buildWordmark());
}
