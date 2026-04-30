import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

const FALLBACK_TEXT = '(c) 2026 Tokyo United FC';

function buildWordmark() {
  const mark = document.createElement('div');
  mark.className = 'footer-wordmark';
  mark.setAttribute('aria-hidden', 'true');
  mark.textContent = 'TOKYO UNITED FC';
  return mark;
}

function renderFallback(block) {
  block.textContent = '';
  const wrapper = document.createElement('div');
  wrapper.className = 'footer-fallback';
  wrapper.textContent = FALLBACK_TEXT;
  block.append(wrapper);
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
  block.append(buildWordmark());
}
