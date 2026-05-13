function formatDate(s) {
  const m = String(s || '').match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return s || '';
  return `${m[1]}年${parseInt(m[2], 10)}月${parseInt(m[3], 10)}日`;
}

function parseLimit(block) {
  const raw = block.textContent.trim();
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 5;
}

async function getNewsPaths() {
  const resp = await fetch('/sitemap.xml');
  if (!resp.ok) return [];
  const text = await resp.text();
  const doc = new DOMParser().parseFromString(text, 'text/xml');
  return [...doc.querySelectorAll('loc')]
    .map((el) => new URL(el.textContent).pathname)
    .filter((p) => /^\/news\/\d{4}\//.test(p));
}

async function getArticleMeta(path) {
  try {
    const resp = await fetch(path);
    if (!resp.ok) return null;
    const html = await resp.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const title = doc.querySelector('head > title')?.textContent?.trim() || path;
    const date = doc.querySelector('head > meta[name="date"]')?.getAttribute('content') || '';
    return { path, title, date };
  } catch (e) {
    return null;
  }
}

export default async function decorate(block) {
  const limit = parseLimit(block);
  block.textContent = '';

  const paths = await getNewsPaths();
  const items = (await Promise.all(paths.map(getArticleMeta)))
    .filter((i) => i && i.date)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, limit);

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
    link.textContent = item.title;

    li.append(time, link);
    ul.append(li);
  });
  block.append(ul);
}
