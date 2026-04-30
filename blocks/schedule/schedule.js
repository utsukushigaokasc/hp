/**
 * Schedule block — renders an authored grid (rows of equal-width columns)
 * as a clean, accessible table. The first row is treated as the header.
 *
 * Authors compose this in a doc the same way they would a Fixtures table,
 * but with a flexible column count. Typical use: 対象 / 曜日 / 時間.
 */
export default async function decorate(block) {
  const section = block.closest('.section');
  if (section && !section.id) section.setAttribute('id', 'schedule');

  const rawRows = [...block.children];
  if (!rawRows.length) return;

  const table = document.createElement('table');
  table.className = 'schedule-table';

  const [headerRow, ...bodyRows] = rawRows;

  const thead = document.createElement('thead');
  const headerTr = document.createElement('tr');
  [...headerRow.children].forEach((cell) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = (cell.textContent || '').trim();
    headerTr.append(th);
  });
  thead.append(headerTr);
  table.append(thead);

  const tbody = document.createElement('tbody');
  bodyRows.forEach((row) => {
    const tr = document.createElement('tr');
    [...row.children].forEach((cell, i) => {
      const td = document.createElement('td');
      td.textContent = (cell.textContent || '').trim();
      // expose header label for stacked mobile layout
      const label = (headerRow.children[i]?.textContent || '').trim();
      if (label) td.setAttribute('data-label', label);
      tr.append(td);
    });
    tbody.append(tr);
  });
  table.append(tbody);

  block.textContent = '';
  block.append(table);
}
