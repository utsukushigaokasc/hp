const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');

const MONTHS_EN = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

/**
 * Pull a Date out of common authored shapes:
 *   "2026-04-30", "2026/04/30", "Apr 30 2026", "4月30日", "4/30"
 * If we can't parse, return null and we'll fall back to the raw string.
 */
function parseDate(text) {
  if (!text) return null;
  const t = text.trim();
  // ISO-ish
  const iso = t.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    if (!Number.isNaN(d.getTime())) return d;
  }
  // Japanese 4月30日
  const jp = t.match(/(\d{1,2})月(\d{1,2})日/);
  if (jp) {
    const d = new Date(new Date().getFullYear(), Number(jp[1]) - 1, Number(jp[2]));
    if (!Number.isNaN(d.getTime())) return d;
  }
  // Native fallback
  const n = new Date(t);
  if (!Number.isNaN(n.getTime())) return n;
  return null;
}

function buildDateBlock(raw) {
  const wrap = document.createElement('div');
  wrap.className = 'fixtures-date';
  const date = parseDate(raw);
  if (date) {
    const day = document.createElement('span');
    day.className = 'fixtures-day';
    day.textContent = String(date.getDate()).padStart(2, '0');
    const month = document.createElement('span');
    month.className = 'fixtures-month';
    month.textContent = MONTHS_EN[date.getMonth()];
    wrap.append(day, month);
  } else {
    wrap.textContent = raw;
  }
  return wrap;
}

function attachReveal(rows) {
  if (REDUCED_MOTION.matches || !('IntersectionObserver' in window)) {
    rows.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -5% 0px' });
  rows.forEach((el) => io.observe(el));
}

export default async function decorate(block) {
  const section = block.closest('.section');
  if (section) section.setAttribute('id', 'fixtures');

  const rawRows = [...block.children];
  if (!rawRows.length) return;

  // first row = header, rest = matches
  const [, ...bodyRows] = rawRows;

  const list = document.createElement('ol');
  list.className = 'fixtures-list';

  bodyRows.forEach((row, i) => {
    const cells = [...row.children].map((c) => (c.textContent || '').trim());
    const [date, comp, home, score, away, venue] = cells;
    if (!date && !home && !away) return;

    const item = document.createElement('li');
    item.className = 'fixtures-row';
    item.style.setProperty('--i', i);

    item.append(buildDateBlock(date || ''));

    const center = document.createElement('div');
    center.className = 'fixtures-center';

    if (comp) {
      const pill = document.createElement('span');
      pill.className = 'fixtures-comp';
      pill.textContent = comp;
      center.append(pill);
    }

    const matchup = document.createElement('div');
    matchup.className = 'fixtures-matchup';

    const homeEl = document.createElement('span');
    homeEl.className = 'fixtures-team fixtures-home';
    homeEl.textContent = home || '';

    const scoreEl = document.createElement('span');
    scoreEl.className = 'fixtures-score';
    scoreEl.textContent = score || 'vs';

    const awayEl = document.createElement('span');
    awayEl.className = 'fixtures-team fixtures-away';
    awayEl.textContent = away || '';

    matchup.append(homeEl, scoreEl, awayEl);
    center.append(matchup);
    item.append(center);

    if (venue) {
      const v = document.createElement('div');
      v.className = 'fixtures-venue';
      v.textContent = venue;
      item.append(v);
    }

    list.append(item);
  });

  block.textContent = '';
  block.append(list);

  attachReveal([...list.children]);
}
