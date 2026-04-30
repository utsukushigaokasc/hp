export default async function decorate(block) {
  const section = block.closest('.section');
  if (section) section.setAttribute('id', 'fixtures');

  const rows = [...block.children];
  if (!rows.length) return;

  const table = document.createElement('table');
  table.className = 'fixtures-table';
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  const [headerRow, ...bodyRows] = rows;

  const headTr = document.createElement('tr');
  [...headerRow.children].forEach((cell) => {
    const th = document.createElement('th');
    th.textContent = (cell.textContent || '').trim();
    headTr.append(th);
  });
  thead.append(headTr);

  bodyRows.forEach((row) => {
    const tr = document.createElement('tr');
    [...row.children].forEach((cell, idx) => {
      const td = document.createElement('td');
      const text = (cell.textContent || '').trim();
      td.textContent = text;
      if (idx === 3) td.classList.add('fixtures-score');
      tr.append(td);
    });
    tbody.append(tr);
  });

  table.append(thead, tbody);
  block.textContent = '';
  block.append(table);
}
