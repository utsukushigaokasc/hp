export default async function decorate(block) {
  block.closest('.section')?.classList.add('full-bleed');
  const rows = [...block.children];
  const picture = block.querySelector('picture');

  const content = document.createElement('div');
  content.className = 'hero-content';

  rows.forEach((row) => {
    const inner = row.firstElementChild || row;
    if (inner.querySelector('picture')) return;
    const heading = inner.querySelector('h1, h2, h3, h4, h5, h6');
    const link = inner.querySelector('a');
    if (heading) {
      heading.classList.add('hero-title');
      content.append(heading);
    } else if (link) {
      const wrap = document.createElement('p');
      wrap.className = 'hero-cta';
      wrap.append(link);
      content.append(wrap);
    } else {
      const text = inner.textContent.trim();
      if (text) {
        const p = document.createElement('p');
        p.className = 'hero-subtitle';
        p.textContent = text;
        content.append(p);
      }
    }
  });

  block.textContent = '';

  if (picture) {
    const media = document.createElement('div');
    media.className = 'hero-media';
    media.append(picture);
    block.append(media);
  }
  block.append(content);
  block.querySelector('a.button')?.classList.add('primary');
}
