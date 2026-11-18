// Посадочный талон «Москва → Мир», пассажир «Маша» (обложка и прибытие)
import { h } from './util.js';
import { ticketHTML } from './ticket-html.js';
import { gsap, REDUCED, isMobile } from './motion.js';

export const makeTicket = (opts) => h(ticketHTML(opts));

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
