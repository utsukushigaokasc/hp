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

const SECTION_ANCHOR_MAP = [
  ['美しが丘SCについて', 'about'],
  ['About', 'about'],
  ['体験会', 'trial'],
  ['体験・入会', 'trial'],
  ['活動グラウンド', 'grounds'],
  ['練習スケジュール', 'schedule'],
  ['スケジュール', 'schedule'],
  ['お知らせ', 'news'],
  ['ニュース', 'news'],
  ['よくある質問', 'faq'],
  ['FAQ', 'faq'],
];

/**
 * If the document has all of its content inside a single top-level <div>
 * (no Section Metadata separators), split it into multiple sibling
 * <div>s so each h2 lands in its own section. The hero block also gets
 * its own section. This must run BEFORE decorateSections().
 */
function splitImplicitSections(main) {
  const tops = [...main.children].filter((c) => c.tagName === 'DIV');
  if (tops.length !== 1) return;
  const root = tops[0];

  // collect break points: any direct child that's an H2 OR a hero block.
  const kids = [...root.children];
  const breaks = [];
  kids.forEach((el, i) => {
    const isHero = el.tagName === 'DIV' && el.classList.contains('hero');
    const isH2 = el.tagName === 'H2';
    if (isHero || isH2) breaks.push({ i, type: isHero ? 'hero' : 'h2' });
  });

  if (breaks.length < 2) return;

  // Build groups: [start, end) ranges between break points (and the leading
  // chunk before the first break, if any).
  const groups = [];
  if (breaks[0].i > 0) groups.push({ start: 0, end: breaks[0].i });
  for (let b = 0; b < breaks.length; b += 1) {
    const start = breaks[b].i;
    const end = b + 1 < breaks.length ? breaks[b + 1].i : kids.length;
    groups.push({ start, end });
  }

  const newDivs = groups.map(({ start, end }) => {
    const div = document.createElement('div');
    for (let k = start; k < end; k += 1) div.append(kids[k]);
    return div;
  });

  root.replaceWith(...newDivs);
}

function slugFor(text) {
  const match = SECTION_ANCHOR_MAP.find(([prefix]) => text.startsWith(prefix));
  return match ? match[1] : null;
}

/**
 * Tag both the section *and* every h2 inside it with anchor ids derived
 * from the heading text. Authors often place multiple h2s in a single
 * section without Section Metadata separators; we still want #trial,
 * #news, #faq, etc. to scroll to the right heading.
 */
function tagSectionAnchors(main) {
  main.querySelectorAll('.section').forEach((section) => {
    const headings = [...section.querySelectorAll('h2')];
    if (!headings.length) return;
    headings.forEach((h2) => {
      const text = h2.textContent.trim();
      const slug = slugFor(text);
      if (!slug) return;
      if (!h2.id) h2.id = slug;
    });
    if (!section.id) {
      const firstSlug = slugFor(headings[0].textContent.trim());
      if (firstSlug) section.id = firstSlug;
    }
  });
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
  splitImplicitSections(main);
  decorateButtons(main);
  decorateIcons(main);
  decorateSections(main);
  decorateBlocks(main);
  tagSectionAnchors(main);
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
