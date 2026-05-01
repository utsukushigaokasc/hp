const SCHEDULE_URL = '/schedule.json';
const WEEKDAY_JP = ['日', '月', '火', '水', '木', '金', '土'];
const SHEETS_EPOCH_MS = Date.UTC(1899, 11, 30);

function pad2(n) {
  return String(n).padStart(2, '0');
}

function normalizeDate(value) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string') return value;
  const ms = SHEETS_EPOCH_MS + Number(value) * 86400000;
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function normalizeTime(value) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string') return value;
  const totalMin = Math.round(Number(value) * 24 * 60);
  return `${pad2(Math.floor(totalMin / 60))}:${pad2(totalMin % 60)}`;
}

function categorySlug(name) {
  if (!name) return 'other';
  const map = {
    全体: 'all',
    U8: 'u8',
    U10: 'u10',
    U12: 'u12',
  };
  return map[name] || 'other';
}

function shortLocation(loc) {
  if (!loc) return '';
  return loc.split(/,\s*日本/)[0].split('〒')[0].trim();
}

function ymdToTs(date, time) {
  const t = time || '00:00';
  return new Date(`${date}T${t}:00+09:00`).getTime();
}

async function fetchSchedule() {
  const res = await fetch(SCHEDULE_URL, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`schedule fetch failed: ${res.status}`);
  const json = await res.json();
  const rows = json.data || [];
  return rows
    .map((r) => ({
      date: normalizeDate(r.date),
      startTime: normalizeTime(r.start_time),
      endTime: normalizeTime(r.end_time),
      allDay: String(r.all_day).toLowerCase() === 'true',
      title: r.title || '',
      location: shortLocation(r.location),
      description: r.description || '',
      category: r.category || '',
    }))
    .filter((r) => r.date && r.title)
    .map((r) => ({ ...r, ts: ymdToTs(r.date, r.startTime) }))
    .sort((a, b) => a.ts - b.ts);
}

function fmtDateMeta(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return {
    year: y, month: m, day: d, weekday: WEEKDAY_JP[dt.getDay()], dow: dt.getDay(),
  };
}

function eventEl(ev) {
  const meta = fmtDateMeta(ev.date);
  const slug = categorySlug(ev.category);
  const isWeekend = meta.dow === 0 || meta.dow === 6;
  const time = ev.allDay
    ? '終日'
    : `${ev.startTime}${ev.endTime ? `–${ev.endTime}` : ''}`;
  const li = document.createElement('li');
  li.className = `sg-event sg-event-cat-${slug}${isWeekend ? ' is-weekend' : ''}`;
  li.dataset.category = slug;
  li.innerHTML = `
    <div class="sg-event-date" aria-hidden="true">
      <span class="sg-event-day">${meta.day}</span>
      <span class="sg-event-weekday">${meta.weekday}</span>
    </div>
    <div class="sg-event-body">
      <div class="sg-event-meta">
        <span class="sg-event-time">${time}</span>
        ${ev.category ? `<span class="sg-event-category">${ev.category}</span>` : ''}
      </div>
      <h3 class="sg-event-title">${ev.title}</h3>
      ${ev.location ? `<p class="sg-event-location">${ev.location}</p>` : ''}
    </div>
  `;
  return li;
}

function groupByMonth(events) {
  const groups = new Map();
  events.forEach((ev) => {
    const ym = ev.date.slice(0, 7);
    if (!groups.has(ym)) groups.set(ym, []);
    groups.get(ym).push(ev);
  });
  return groups;
}

function applyFilter(block, slug) {
  block.querySelectorAll('.sg-tab').forEach((t) => {
    const active = t.dataset.cat === slug;
    t.setAttribute('aria-selected', active ? 'true' : 'false');
    t.classList.toggle('is-active', active);
  });
  block.querySelectorAll('.sg-event').forEach((el) => {
    const cat = el.dataset.category;
    const match = slug === 'all' || cat === slug || cat === 'all';
    el.hidden = !match;
  });
  block.querySelectorAll('.sg-month').forEach((m) => {
    const visible = [...m.querySelectorAll('.sg-event')].some((e) => !e.hidden);
    m.hidden = !visible;
  });
  const list = block.querySelector('.sg-list');
  if (list) {
    const anyVisible = !!block.querySelector('.sg-event:not([hidden])');
    let empty = block.querySelector('.sg-empty');
    if (!anyVisible) {
      if (!empty) {
        empty = document.createElement('p');
        empty.className = 'sg-empty';
        empty.textContent = 'この期間に該当する予定はありません。';
        list.append(empty);
      }
      empty.hidden = false;
    } else if (empty) {
      empty.hidden = true;
    }
  }
}

const TABS = [
  { slug: 'all', label: 'すべて' },
  { slug: 'u8', label: 'U8（年長〜2年）' },
  { slug: 'u10', label: 'U10（3・4年）' },
  { slug: 'u12', label: 'U12（5・6年）' },
];

export default async function decorate(block) {
  block.textContent = '';
  block.classList.add('schedule-grid');

  const tabs = document.createElement('div');
  tabs.className = 'sg-tabs';
  tabs.setAttribute('role', 'tablist');
  TABS.forEach((t) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sg-tab';
    btn.dataset.cat = t.slug;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', t.slug === 'all' ? 'true' : 'false');
    btn.textContent = t.label;
    btn.addEventListener('click', () => applyFilter(block, t.slug));
    tabs.append(btn);
  });
  block.append(tabs);

  const list = document.createElement('div');
  list.className = 'sg-list';
  list.setAttribute('aria-live', 'polite');
  block.append(list);

  let events;
  try {
    events = await fetchSchedule();
  } catch (e) {
    list.innerHTML = '<p class="sg-error">スケジュールを読み込めませんでした。しばらくしてからお試しください。</p>';
    return;
  }

  const todayMs = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00+09:00`).getTime();
  const upcoming = events.filter((ev) => ev.ts >= todayMs);

  if (!upcoming.length) {
    list.innerHTML = '<p class="sg-empty">予定の登録はまだありません。</p>';
    return;
  }

  const groups = groupByMonth(upcoming);
  const ymKeys = [...groups.keys()].sort();
  ymKeys.forEach((ym) => {
    const section = document.createElement('section');
    section.className = 'sg-month';
    const [y, m] = ym.split('-').map(Number);
    const title = document.createElement('h3');
    title.className = 'sg-month-title';
    title.textContent = `${y}年${m}月`;
    section.append(title);
    const ul = document.createElement('ul');
    ul.className = 'sg-events';
    groups.get(ym).forEach((ev) => ul.append(eventEl(ev)));
    section.append(ul);
    list.append(section);
  });

  applyFilter(block, 'all');
}
