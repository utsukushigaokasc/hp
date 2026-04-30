const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');

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
      badge.setAttribute('aria-hidden', 'true');
      badge.textContent = number;
      card.append(badge);
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

  // stagger index for CSS transition-delay
  const cards = [...list.children];
  cards.forEach((el, i) => el.style.setProperty('--i', i));

  // IO fallback for browsers without view-timeline
  if (REDUCED_MOTION.matches || !('IntersectionObserver' in window)) {
    cards.forEach((el) => el.classList.add('is-in'));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

  cards.forEach((el) => io.observe(el));
}
