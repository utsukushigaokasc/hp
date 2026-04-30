export default async function decorate(block) {
  const list = document.createElement('ul');
  list.className = 'roster-grid';

  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (!cells.length) return;
    const photo = cells[0]?.querySelector('picture, img');
    const number = (cells[1]?.textContent || '').trim();
    const name = (cells[2]?.textContent || '').trim();
    const position = (cells[3]?.textContent || '').trim();
    if (!name && !number && !photo) return;

    const card = document.createElement('li');
    card.className = 'roster-card';

    const media = document.createElement('div');
    media.className = 'roster-media';
    if (photo) media.append(photo);
    if (number) {
      const badge = document.createElement('span');
      badge.className = 'roster-number';
      badge.textContent = number;
      media.append(badge);
    }

    const body = document.createElement('div');
    body.className = 'roster-body';
    const heading = document.createElement('h3');
    heading.className = 'roster-name';
    heading.textContent = name;
    const pos = document.createElement('p');
    pos.className = 'roster-position';
    pos.textContent = position;
    body.append(heading, pos);

    card.append(media, body);
    list.append(card);
  });

  block.textContent = '';
  block.append(list);
}
