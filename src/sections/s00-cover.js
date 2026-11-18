// 00. Обложка: посадочный талон + заголовок с анимацией вариативного шрифта
import { renderMarkdown } from '../content/render.js';
import { nodesFrom } from '../ui/util.js';
import { makeTicket, tilt } from '../ui/ticket.js';
import { gsap, REDUCED, isMobile, dur } from '../ui/motion.js';

export function render(el) {
  const nodes = nodesFrom(renderMarkdown('00-oblozhka.md'));
  const h1 = nodes.find((n) => n.tagName === 'H1');
  if (h1) {
    h1.id = 's0-h';
    splitLetters(h1);
  }
  el.innerHTML = '<div class="cover"><div class="cover__text"></div><div class="cover__ticket"></div></div>';
  const text = el.querySelector('.cover__text');
  nodes.forEach((n) => text.append(n));
  text.insertAdjacentHTML('beforeend', '<a class="scroll-hint" href="#s1"><i aria-hidden="true"></i>листайте</a>');
  const ticket = makeTicket();
  el.querySelector('.cover__ticket').append(ticket);
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
  const tl = gsap.timeline({ delay: 0.15 });
  // Буквы «вырастают»: тонкие и узкие → жирные и широкие
  tl.fromTo(chars, { '--w': 100, '--s': 25, opacity: 0, y: 30 }, {
    '--w': 800, '--s': 100, opacity: 1, y: 0, duration: dur('slow'), ease: 'expo.out', stagger: 0.04,
  });
  tl.from(el.querySelectorAll('.cover__text > :not(h1)'), { opacity: 0, y: 20, duration: dur('base'), stagger: 0.1 }, '-=0.9');
  tl.from(ticket, { opacity: 0, y: 60, rotation: -6, duration: dur('slow'), ease: 'power3.out' }, '-=1.1');

  // Интерактив: буквы «дышат» за курсором — ближе к курсору шире и жирнее
  if (!isMobile() && window.matchMedia('(hover: hover)').matches) {
    const setters = [...chars].map((c) => ({ c, w: gsap.quickTo(c, '--w', { duration: 0.5 }), s: gsap.quickTo(c, '--s', { duration: 0.5 }) }));
    h1.addEventListener('pointermove', (e) => {
      setters.forEach(({ c, w, s }) => {
        const r = c.getBoundingClientRect();
        const d = Math.abs(e.clientX - (r.left + r.width / 2));
        const k = Math.max(0, 1 - d / 220);
        w(500 + 500 * k); s(85 + 66 * k);
      });
    });
    h1.addEventListener('pointerleave', () => setters.forEach(({ w, s }) => { w(800); s(100); }));
  } else {
    // На телефоне — ширина заголовка меняется при прокрутке
    gsap.fromTo(chars, { '--s': 100 }, { '--s': 60, ease: 'none', immediateRender: false, scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: true } });
  }
}
