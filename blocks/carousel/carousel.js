import { fetchPlaceholders } from '../../scripts/aem.js';

const AUTO_ROTATE_INTERVAL = 6000;

function startAutoRotate(block) {
  if (block.dataset.autoRotateTimer) return;
  if (block.dataset.autoRotatePaused === 'true') return;
  if (block.dataset.autoRotateVisible !== 'true') return;
  const slides = block.querySelectorAll('.carousel-slide');
  if (slides.length < 2) return;
  const timerId = window.setInterval(() => {
    const current = parseInt(block.dataset.activeSlide, 10) || 0;
    const next = (current + 1) % slides.length;
    // eslint-disable-next-line no-use-before-define
    showSlide(block, next);
  }, AUTO_ROTATE_INTERVAL);
  block.dataset.autoRotateTimer = String(timerId);
}

function stopAutoRotate(block) {
  if (!block.dataset.autoRotateTimer) return;
  window.clearInterval(parseInt(block.dataset.autoRotateTimer, 10));
  delete block.dataset.autoRotateTimer;
}

function bindAutoRotate(block) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduceMotion.matches) return;

  const slides = block.querySelectorAll('.carousel-slide');
  if (slides.length < 2) return;

  block.dataset.autoRotatePaused = 'false';
  block.dataset.autoRotateVisible = 'false';

  const pause = () => {
    block.dataset.autoRotatePaused = 'true';
    stopAutoRotate(block);
  };
  const resume = () => {
    block.dataset.autoRotatePaused = 'false';
    startAutoRotate(block);
  };

  block.addEventListener('mouseenter', pause);
  block.addEventListener('mouseleave', resume);
  block.addEventListener('focusin', pause);
  block.addEventListener('focusout', (e) => {
    if (!block.contains(e.relatedTarget)) resume();
  });

  const visibilityObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        block.dataset.autoRotateVisible = 'true';
        startAutoRotate(block);
      } else {
        block.dataset.autoRotateVisible = 'false';
        stopAutoRotate(block);
      }
    });
  }, { threshold: 0.25 });
  visibilityObserver.observe(block);
}

function updateActiveSlide(slide) {
  const block = slide.closest('.carousel');
  const slideIndex = parseInt(slide.dataset.slideIndex, 10);
  block.dataset.activeSlide = slideIndex;

  const slides = block.querySelectorAll('.carousel-slide');

  slides.forEach((aSlide, idx) => {
    aSlide.setAttribute('aria-hidden', idx !== slideIndex);
    aSlide.querySelectorAll('a').forEach((link) => {
      if (idx !== slideIndex) {
        link.setAttribute('tabindex', '-1');
      } else {
        link.removeAttribute('tabindex');
      }
    });
  });

  const indicators = block.querySelectorAll('.carousel-slide-indicator');
  indicators.forEach((indicator, idx) => {
    const button = indicator.querySelector('button');
    if (idx !== slideIndex) {
      button.removeAttribute('disabled');
      button.removeAttribute('aria-current');
    } else {
      button.setAttribute('disabled', true);
      button.setAttribute('aria-current', true);
    }
  });
}

function showSlide(block, slideIndex = 0) {
  const slides = block.querySelectorAll('.carousel-slide');
  let realSlideIndex = slideIndex < 0 ? slides.length - 1 : slideIndex;
  if (slideIndex >= slides.length) realSlideIndex = 0;
  const activeSlide = slides[realSlideIndex];

  activeSlide.querySelectorAll('a').forEach((link) => link.removeAttribute('tabindex'));
  block.querySelector('.carousel-slides').scrollTo({
    top: 0,
    left: activeSlide.offsetLeft,
    behavior: 'smooth',
  });
}

function bindEvents(block) {
  const slideIndicators = block.querySelector('.carousel-slide-indicators');
  if (!slideIndicators) return;

  slideIndicators.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', (e) => {
      const slideIndicator = e.currentTarget.parentElement;
      showSlide(block, parseInt(slideIndicator.dataset.targetSlide, 10));
    });
  });

  block.querySelector('.slide-prev').addEventListener('click', () => {
    showSlide(block, parseInt(block.dataset.activeSlide, 10) - 1);
  });
  block.querySelector('.slide-next').addEventListener('click', () => {
    showSlide(block, parseInt(block.dataset.activeSlide, 10) + 1);
  });

  const slideObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) updateActiveSlide(entry.target);
    });
  }, { threshold: 0.5 });
  block.querySelectorAll('.carousel-slide').forEach((slide) => {
    slideObserver.observe(slide);
  });
}

function createSlide(row, slideIndex, carouselId) {
  const slide = document.createElement('li');
  slide.dataset.slideIndex = slideIndex;
  slide.setAttribute('id', `carousel-${carouselId}-slide-${slideIndex}`);
  slide.classList.add('carousel-slide');

  const imageDiv = document.createElement('div');
  imageDiv.classList.add('carousel-slide-image');
  const contentDiv = document.createElement('div');
  contentDiv.classList.add('carousel-slide-content');

  // Pull every <picture> out of the row regardless of which cell the author
  // placed it in. The first one becomes the slide background; any extras
  // are dropped (they would only fight with the background image).
  const pictures = [...row.querySelectorAll('picture')];
  if (pictures.length) {
    imageDiv.append(pictures[0]);
    pictures.slice(1).forEach((p) => p.remove());
  }

  // Move every remaining child out of the row's columns into content,
  // skipping empty cells. Then drop empty wrapper paragraphs that only
  // contained the picture we just hoisted.
  row.querySelectorAll(':scope > div').forEach((col) => {
    while (col.firstChild) contentDiv.append(col.firstChild);
  });
  contentDiv.querySelectorAll('p').forEach((p) => {
    p.normalize();
    if (!p.textContent.trim() && !p.querySelector('a, picture, img, strong, em')) {
      p.remove();
    }
  });

  slide.append(imageDiv);
  slide.append(contentDiv);

  const labeledBy = slide.querySelector('h1, h2, h3, h4, h5, h6');
  if (labeledBy) {
    slide.setAttribute('aria-labelledby', labeledBy.getAttribute('id'));
  }

  return slide;
}

let carouselId = 0;
export default async function decorate(block) {
  carouselId += 1;
  block.setAttribute('id', `carousel-${carouselId}`);
  const rows = block.querySelectorAll(':scope > div');
  const isSingleSlide = rows.length < 2;

  const placeholders = await fetchPlaceholders();

  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', placeholders.carousel || 'Carousel');

  const container = document.createElement('div');
  container.classList.add('carousel-slides-container');

  const slidesWrapper = document.createElement('ul');
  slidesWrapper.classList.add('carousel-slides');
  block.prepend(slidesWrapper);

  let slideIndicators;
  if (!isSingleSlide) {
    const slideIndicatorsNav = document.createElement('nav');
    slideIndicatorsNav.setAttribute('aria-label', placeholders.carouselSlideControls || 'Carousel Slide Controls');
    slideIndicators = document.createElement('ol');
    slideIndicators.classList.add('carousel-slide-indicators');
    slideIndicatorsNav.append(slideIndicators);
    block.append(slideIndicatorsNav);

    const slideNavButtons = document.createElement('div');
    slideNavButtons.classList.add('carousel-navigation-buttons');
    slideNavButtons.innerHTML = `
      <button type="button" class= "slide-prev" aria-label="${placeholders.previousSlide || 'Previous Slide'}"></button>
      <button type="button" class="slide-next" aria-label="${placeholders.nextSlide || 'Next Slide'}"></button>
    `;

    container.append(slideNavButtons);
  }

  rows.forEach((row, idx) => {
    const slide = createSlide(row, idx, carouselId);
    slidesWrapper.append(slide);

    if (slideIndicators) {
      const indicator = document.createElement('li');
      indicator.classList.add('carousel-slide-indicator');
      indicator.dataset.targetSlide = idx;
      indicator.innerHTML = `<button type="button" aria-label="${placeholders.showSlide || 'Show Slide'} ${idx + 1} ${placeholders.of || 'of'} ${rows.length}"></button>`;
      slideIndicators.append(indicator);
    }
    row.remove();
  });

  container.append(slidesWrapper);
  block.prepend(container);

  if (!isSingleSlide) {
    bindEvents(block);
    bindAutoRotate(block);
  }
}
