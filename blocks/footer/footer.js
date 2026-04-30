import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

const FALLBACK_TEXT = '© 2026 Tokyo United FC';

function renderFallback(block) {
  block.textContent = '';
  const wrapper = document.createElement('div');
  wrapper.className = 'footer-fallback';
  wrapper.textContent = FALLBACK_TEXT;
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

  const footer = document.createElement('div');
  while (fragment.firstElementChild) footer.append(fragment.firstElementChild);
  block.append(footer);
}
