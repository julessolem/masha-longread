// 00. Обложка: посадочный талон + заголовок с анимацией вариативного шрифта
import { renderMarkdown } from '../content/render.js';
import { nodesFrom } from '../ui/util.js';
import { makeTicket, tilt } from '../ui/ticket.js';
import { gsap, REDUCED, isMobile, dur } from '../ui/motion.js';
import { quantize } from '../ui/varfont.js';
import { u } from '../content/ui.js';

export function render(el) {
  // Обложка уже встроена в index.html при сборке (vite-plugins/content.js); если нет — собираем здесь
  if (!el.querySelector('.cover')) {
    el.innerHTML = '<div class="cover"><div class="cover__text"></div><div class="cover__ticket"></div></div>';
    const text = el.querySelector('.cover__text');
    nodesFrom(renderMarkdown('00-oblozhka.md')).forEach((n) => text.append(n));
    text.insertAdjacentHTML('beforeend', `<a class="scroll-hint" href="#s1"><i aria-hidden="true"></i>${u('cover.hint')}</a>`);
  }
  const h1 = el.querySelector('h1');
  if (h1) {
    h1.id = 's0-h';
    splitLetters(h1);
  }
  let ticket = el.querySelector('.ticket');
  if (!ticket) { ticket = makeTicket(); el.querySelector('.cover__ticket').append(ticket); }
  return { h1, ticket };
}

/** Каждая буква — в отдельном span (для анимации осей веса и ширины). Для читалок — aria-label. */
function splitLetters(h1) {
  const text = h1.textContent;
  h1.setAttribute('aria-label', text);
  h1.dataset.text = text;
  const words = text.split(/(\s+)/);
  h1.innerHTML = words.map((w) => (/\s+/.test(w) ? ' ' : `<span style="white-space:nowrap" aria-hidden="true">${[...w].map((c) => `<span class="ch">${c}</span>`).join('')}</span>`)).join('');
}

export function animate(el, { h1, ticket }) {
  tilt(ticket);
  if (REDUCED || !h1) return;
  const chars = h1.querySelectorAll('.ch');
  // Изоляция: анимация осей шрифта перестраивает только сам заголовок, а не всю страницу.
  // Высота фиксируется по итоговому (самому широкому) состоянию и пересчитывается при ресайзе.
  const lock = () => {
    h1.style.contain = ''; h1.style.height = '';
    h1.classList.add('is-measure'); // временно — итоговые вес и ширина букв
    h1.style.height = `${h1.offsetHeight}px`;
    h1.classList.remove('is-measure');
    h1.style.contain = 'size layout style';
  };
  lock();
  let rt = 0;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(lock, 200); });
  document.fonts?.ready.then(lock);
  const tl = gsap.timeline({ delay: 0.15 });
  // Буквы «вырастают»: тонкие и узкие → жирные и широкие (видимы сразу — для быстрой первой отрисовки)
  const q = quantize({ '--w': 1, '--s': 1 });
  tl.fromTo(chars, { '--w': 150, '--s': 40 }, {
    '--w': 800, '--s': 100, duration: dur('slow'), ease: 'expo.out', stagger: 0.04, modifiers: q,
  });
  tl.from(ticket, { opacity: 0, y: 60, rotation: -6, duration: dur('slow'), ease: 'power3.out' }, 0.2);

  // Интерактив: буквы «дышат» за курсором — ближе к курсору шире и жирнее
  if (!isMobile() && window.matchMedia('(hover: hover)').matches) {
    const setters = [...chars].map((c) => ({ c, x: 0, w: gsap.quickTo(c, '--w', { duration: 0.5, modifiers: q }), s: gsap.quickTo(c, '--s', { duration: 0.5, modifiers: q }) }));
    // Центры букв замеряем один раз при входе курсора (а не на каждое движение)
    h1.addEventListener('pointerenter', () => setters.forEach((o) => { const r = o.c.getBoundingClientRect(); o.x = r.left + r.width / 2; }));
    h1.addEventListener('pointermove', (e) => {
      setters.forEach(({ x, w, s }) => {
        const k = Math.max(0, 1 - Math.abs(e.clientX - x) / 220);
        w(500 + 450 * k); s(88 + 18 * k);
      });
    });
    h1.addEventListener('pointerleave', () => setters.forEach(({ w, s }) => { w(800); s(100); }));
  } else {
    // На телефоне — ширина заголовка меняется при прокрутке
    gsap.fromTo(chars, { '--s': 100 }, { '--s': 60, ease: 'none', immediateRender: false, modifiers: q, scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: true } });
  }
}
