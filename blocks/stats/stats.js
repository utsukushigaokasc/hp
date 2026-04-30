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
    numEl.textContent = num;

    const labelEl = document.createElement('span');
    labelEl.className = 'stats-label';
    labelEl.textContent = label;

    tile.append(numEl, labelEl);
    list.append(tile);
  });

  block.textContent = '';
  block.append(list);
}
