// Посадочный талон «Москва → Мир», пассажир «Маша» (обложка и прибытие)
import { h } from './util.js';
import { gsap, REDUCED, isMobile } from './motion.js';

const PLANE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></svg>';

export function makeTicket({ light = false, stamp = '' } = {}) {
  const el = h(`
  <div class="ticket${light ? ' ticket--light' : ''}" role="img" aria-label="Посадочный талон: пассажир Маша, рейс из Москвы в мир${stamp ? `, штамп «${stamp}»` : ''}">
    <div class="ticket__main">
      <div class="ticket__head"><span>Посадочный талон</span><span>Boarding pass</span></div>
      <div class="ticket__route">
        <div class="ticket__city"><span>Откуда</span><b>MOW</b><span>Москва</span></div>
        <div class="ticket__plane">${PLANE}</div>
        <div class="ticket__city"><span>Куда</span><b>МИР</b><span>весь мир</span></div>
      </div>
      <div class="ticket__fields">
        <div class="ticket__field"><span>Пассажир</span><b>МАША</b></div>
        <div class="ticket__field"><span>Рейс</span><b>МШ 2026</b></div>
        <div class="ticket__field"><span>Багаж</span><b>ЧЕМОДАН</b></div>
        <div class="ticket__field"><span>Выход</span><b>01</b></div>
        <div class="ticket__field"><span>Место</span><b>1A</b></div>
        <div class="ticket__field"><span>Класс</span><b>ЭКСПОРТ</b></div>
      </div>
    </div>
    <div class="ticket__stub">
      <div class="ticket__field"><span>Пассажир</span><b>МАША</b></div>
      <div class="ticket__field"><span>Остановок</span><b>8</b></div>
      <div class="ticket__barcode"></div>
    </div>
  </div>`);
  return el;
}

/** Наклон талона за курсором (на устройствах с мышью) */
export function tilt(el, strength = 8) {
  if (REDUCED || isMobile() || !window.matchMedia('(hover: hover)').matches) return;
  const qx = gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3' });
  const qy = gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3' });
  gsap.set(el, { transformPerspective: 900 });
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    qx(((e.clientX - r.left) / r.width - 0.5) * strength * 2);
    qy(-((e.clientY - r.top) / r.height - 0.5) * strength * 2);
  });
  el.addEventListener('pointerleave', () => { qx(0); qy(0); });
}
