// «Морфинг» цвета фона: у каждой остановки свой слой, при переходе он проявляется
// (анимируется только opacity). Цвета — в theme.css (--bg-00 … --bg-09).
import { gsap, ScrollTrigger, REDUCED } from './motion.js';
import { STOPS } from '../stops.js';

export function initBg() {
  const bg = document.querySelector('.bg');
  bg.innerHTML = STOPS.map((s) => `<div class="bg__layer" style="background: var(--bg-${String(s.n).padStart(2, '0')})"></div>`).join('');
  const layers = [...bg.children];

  STOPS.forEach((s, i) => {
    if (i === 0) return;
    const el = document.getElementById(s.id);
    const prev = el.previousElementSibling?.classList.contains('transit') ? el.previousElementSibling : el;
    if (REDUCED) {
      ScrollTrigger.create({ trigger: el, start: 'top 60%', onToggle: () => {}, onEnter: () => gsap.set(layers[i], { opacity: 1 }), onLeaveBack: () => gsap.set(layers[i], { opacity: 0 }) });
      return;
    }
    gsap.fromTo(layers[i], { opacity: 0 }, {
      opacity: 1, ease: 'none',
      scrollTrigger: { trigger: prev, start: 'top 75%', end: () => (prev === el ? 'top 35%' : 'bottom 60%'), scrub: true },
    });
  });
}
