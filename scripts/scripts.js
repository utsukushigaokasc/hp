import {
  sampleRUM,
  loadHeader,
  loadFooter,
  decorateButtons,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForLCP,
  loadBlocks,
  loadCSS,
} from './aem.js';

const LCP_BLOCKS = [];

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');
const COARSE_POINTER = window.matchMedia('(pointer: coarse)');

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Tag headings + lead paragraphs in main with data-reveal so the global
 * IntersectionObserver can fade them in. Block-level reveals (roster cards,
 * fixture rows, etc.) are tagged inside their own block decorators.
 */
function autoTagReveals(main) {
  main.querySelectorAll('.section > div > h1, .section > div > h2, .section > div > h3').forEach((el) => {
    if (!el.hasAttribute('data-reveal')) el.setAttribute('data-reveal', '');
  });
  main.querySelectorAll('.section > div > p').forEach((el) => {
    if (!el.hasAttribute('data-reveal')) el.setAttribute('data-reveal', '');
  });
}

/**
 * Single page-wide IntersectionObserver. Adds .is-in to anything tagged
 * [data-reveal] once it crosses the threshold, then unobserves it.
 * Reduced-motion users get the final state immediately.
 */
function initRevealObserver(root = document) {
  const targets = root.querySelectorAll('[data-reveal]');
  if (!targets.length) return;

  if (REDUCED_MOTION.matches || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-in'));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -5% 0px' });

  targets.forEach((el) => io.observe(el));
}

/**
 * Single rAF-throttled passive scroll listener writing window.scrollY to
 * the --scroll custom property on :root. Used by hero parallax and any
 * future scroll-driven CSS. Early-returns on coarse pointers and
 * reduced-motion environments.
 */
function initScrollProperty() {
  if (REDUCED_MOTION.matches || COARSE_POINTER.matches) return;

  const root = document.documentElement;
  let ticking = false;

  const update = () => {
    root.style.setProperty('--scroll', window.scrollY);
    ticking = false;
  };

  // prime the value
  update();

  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  }, { passive: true });
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  decorateButtons(main);
  decorateIcons(main);
  decorateSections(main);
  decorateBlocks(main);
  autoTagReveals(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    document.body.classList.add('appear');
    await waitForLCP(LCP_BLOCKS);
  }

  try {
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  const main = doc.querySelector('main');
  await loadBlocks(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadHeader(doc.querySelector('header'));
  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();

  // wire scroll-driven effects after blocks are mounted
  initRevealObserver(doc);
  initScrollProperty();

  sampleRUM('lazy');
  sampleRUM.observe(main.querySelectorAll('div[data-block-name]'));
  sampleRUM.observe(main.querySelectorAll('picture > img'));
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
