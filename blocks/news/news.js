function formatDate(s) {
  const m = String(s || '').match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return s || '';
  return `${m[1]}年${parseInt(m[2], 10)}月${parseInt(m[3], 10)}日`;
}

function parseLimit(block) {
  const raw = block.textContent.trim().toLowerCase();
  if (raw === 'all' || raw === '0') return Infinity;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 5;
}

export default async function decorate(block) {
  const limit = parseLimit(block);
  block.textContent = '';

  let allItems = [];
  try {
    const resp = await fetch('/news/query-index.json');
    if (resp.ok) {
      const json = await resp.json();
      allItems = (json.data || []).filter((i) => i.date);
    }
  } catch (e) {
    // network/parse error — render empty state
  }

  allItems.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const items = Number.isFinite(limit) ? allItems.slice(0, limit) : allItems;

  if (items.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'news-empty';
    empty.textContent = 'お知らせはまだありません。';
    block.append(empty);
    return;
  }

  const ul = document.createElement('ul');
  ul.className = 'news-list';
  items.forEach((item) => {
    const li = document.createElement('li');

    const time = document.createElement('time');
    time.dateTime = item.date;
    time.textContent = formatDate(item.date);

    const link = document.createElement('a');
    link.href = item.path;
    link.textContent = item.title || item.path;

    li.append(time, link);
    ul.append(li);
  });
  block.append(ul);

  if (allItems.length > items.length) {
    const more = document.createElement('p');
    more.className = 'news-more';
    const moreLink = document.createElement('a');
    moreLink.href = '/news/';
    moreLink.textContent = 'すべて見る →';
    more.append(moreLink);
    block.append(more);
  }
}
