// 04. Таможня: разворот паспорта, на который при скролле «падают» штампы.
// Абзацы, начинающиеся с **Жирного.**, становятся карточками; клик по штампу раскрывает карточку.
import { renderMarkdown } from '../content/render.js';
import { nodesFrom, prose, h } from '../ui/util.js';
import { gsap, REDUCED, isMobile, dur } from '../ui/motion.js';


export function render(el) {
  const nodes = nodesFrom(renderMarkdown('04-tamozhnya.md'));
  const isStampPara = (n) => n.tagName === 'P' && n.firstElementChild?.tagName === 'STRONG' && n.firstChild === n.firstElementChild;
  const stampParas = nodes.filter(isStampPara);
  const firstIdx = nodes.indexOf(stampParas[0]);
  const lastIdx = nodes.indexOf(stampParas[stampParas.length - 1]);
  const before = nodes.slice(0, firstIdx);
  const after = nodes.slice(lastIdx + 1);

  const stamps = stampParas.map((p, i) => {
    const word = p.firstElementChild.textContent.replace(/[.:]\s*$/, '').trim();
    return { word, p, i };
  });

  const passport = h(`
  <div class="passport">
    <div class="passport__spread">
      <div class="passport__page"><span class="passport__label" aria-hidden="true">Visas · Визы</span></div>
      <div class="passport__page"><span class="passport__label" aria-hidden="true">Стр. 17</span></div>
    </div>
    <p class="passport__hint">Нажмите на штамп, чтобы прочитать</p>
  </div>`);
  const pages = passport.querySelectorAll('.passport__page');
  const cards = document.createElement('div');
  cards.className = 'customs-cards';

  stamps.forEach(({ word, p, i }) => {
    const id = `customs-${i}`;
    const btn = h(`<button type="button" class="stamp stamp--${(i % 4) + 1}" aria-expanded="false" aria-controls="${id}">
      <span class="stamp__meta">Пункт досмотра ${i + 1}</span><span class="stamp__word">${word}</span><span class="stamp__meta">МШ · 2026</span></button>`);
    pages[i < Math.ceil(stamps.length / 2) ? 0 : 1].append(btn);
    const card = document.createElement('div');
    card.className = 'customs-card';
    card.id = id;
    card.hidden = true;
    card.style.setProperty('--c', getComputedStyle(document.documentElement).getPropertyValue(['--c-stamp', '--c-route', '--c-ink', '--c-passport'][i % 4]));
    card.append(p);
    cards.append(card);
  });

  const inner = document.createElement('div');
  inner.className = 'stop__inner';
  inner.append(prose(before), passport, cards, prose(after));
  el.append(inner);
  return { passport, cards };
}

export function animate(el, { passport }) {
  const buttons = [...passport.querySelectorAll('.stamp')];
  const open = (btn) => {
    buttons.forEach((b) => {
      const on = b === btn && b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', String(on));
      const card = document.getElementById(b.getAttribute('aria-controls'));
      card.hidden = !on;
      if (on && !REDUCED) gsap.fromTo(card, { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: dur('fast') + 0.1, ease: 'power2.out' });
    });
  };
  buttons.forEach((b) => b.addEventListener('click', () => open(b)));
  open(buttons[0]); // первая карточка открыта, чтобы текст был виден и без клика

  const rots = [-9, 6, -4, 11];
  if (REDUCED) { buttons.forEach((b, i) => gsap.set(b, { rotation: rots[i % 4] })); return; }

  // Штампы «падают» с удара: большой и прозрачный → резкий удар, паспорт вздрагивает
  const spread = passport.querySelector('.passport__spread');
  const tl = gsap.timeline({ defaults: { ease: 'power4.in' } });
  buttons.forEach((b, i) => {
    tl.fromTo(b, { scale: 2.6, opacity: 0, rotation: rots[i % 4] - 25, y: -40 }, { scale: 1, opacity: 1, rotation: rots[i % 4], y: 0, duration: 0.45 }, i * 0.55)
      .to(spread, { y: 5, duration: 0.06, ease: 'power1.out' }, i * 0.55 + 0.45)
      .to(spread, { y: 0, duration: 0.25, ease: 'elastic.out(1, 0.4)' }, i * 0.55 + 0.51);
  });

  if (isMobile()) {
    // На телефоне — без закрепления: штампы падают по очереди при появлении
    tl.pause();
    gsap.timeline({ scrollTrigger: { trigger: spread, start: 'top 70%', once: true, onEnter: () => tl.play() } });
  } else {
    // На десктопе паспорт закрепляется, штампы падают синхронно со скроллом
    gsap.set(buttons, { opacity: 0 });
    tl.pause();
    gsap.to(tl, {
      progress: 1, ease: 'none',
      scrollTrigger: { trigger: passport, start: 'center 55%', end: '+=70%', scrub: 0.4, pin: true, anticipatePin: 1 },
    });
  }
}
