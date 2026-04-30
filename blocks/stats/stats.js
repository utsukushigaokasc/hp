const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');

/**
 * Parse a stat number string like "12", "1,200", "98%", "3.5K" into
 * { value, prefix, suffix } so we can animate the numeric part and
 * preserve any decoration like %, +, K, etc.
 */
function parseStatNumber(text) {
  const match = text.match(/(-?\d[\d,]*(?:\.\d+)?)/);
  if (!match) return null;
  const numericRaw = match[1].replace(/,/g, '');
  const value = parseFloat(numericRaw);
  if (Number.isNaN(value)) return null;
  const prefix = text.slice(0, match.index);
  const suffix = text.slice(match.index + match[1].length);
  const hasComma = match[1].includes(',');
  const decimals = (numericRaw.split('.')[1] || '').length;
  return {
    value, prefix, suffix, hasComma, decimals,
  };
}

function format(n, parsed) {
  const fixed = parsed.decimals ? n.toFixed(parsed.decimals) : Math.round(n).toString();
  const display = parsed.hasComma
    ? Number(fixed).toLocaleString(undefined, {
      minimumFractionDigits: parsed.decimals,
      maximumFractionDigits: parsed.decimals,
    })
    : fixed;
  return `${parsed.prefix}${display}${parsed.suffix}`;
}

function easeOutCubic(t) {
  return 1 - ((1 - t) ** 3);
}

function animateCount(el, parsed) {
  const duration = 1200;
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = easeOutCubic(t);
    el.textContent = format(parsed.value * eased, parsed);
    if (t < 1) window.requestAnimationFrame(step);
    else el.textContent = format(parsed.value, parsed);
  };
  window.requestAnimationFrame(step);
}

export default async function decorate(block) {
  const list = document.createElement('ul');
  list.className = 'stats-grid';

  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (!cells.length) return;
    const num = (cells[0]?.textContent || '').trim();
    const label = (cells[1]?.textContent || '').trim();
    if (!num && !label) return;

    const tile = document.createElement('li');
    tile.className = 'stats-tile';

    const numEl = document.createElement('span');
    numEl.className = 'stats-num';
    const parsed = parseStatNumber(num);
    if (parsed) {
      // start at 0 in the same format so layout doesn't jump on animate
      numEl.textContent = format(0, parsed);
      numEl.dataset.target = num;
    } else {
      numEl.textContent = num;
    }

    const labelEl = document.createElement('span');
    labelEl.className = 'stats-label';
    labelEl.textContent = label;

    tile.append(numEl, labelEl);
    list.append(tile);
  });

  block.textContent = '';
  block.append(list);

  // count-up via IO @ 0.4 threshold; fire once then unobserve
  const numEls = block.querySelectorAll('.stats-num[data-target]');
  if (!numEls.length) return;

  if (REDUCED_MOTION.matches || !('IntersectionObserver' in window)) {
    numEls.forEach((el) => { el.textContent = el.dataset.target; });
    block.classList.add('is-in');
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      block.classList.add('is-in');
      numEls.forEach((el) => {
        const parsed = parseStatNumber(el.dataset.target);
        if (parsed) animateCount(el, parsed);
      });
      io.disconnect();
    });
  }, { threshold: 0.4 });

  io.observe(block);
}
