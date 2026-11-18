// Анимированный счётчик: число «доезжает» до значения из data.json при появлении.
import { gsap, REDUCED, onEnter, dur } from './motion.js';

/**
 * @param el     элемент, в который пишется число
 * @param to     конечное значение
 * @param format (v) => строка
 */
export function counter(el, to, format, { from = 0, start = 'top 85%' } = {}) {
  el.textContent = format(to); // корректное значение сразу (для читалок и без анимаций)
  if (REDUCED) return;
  const o = { v: from };
  el.textContent = format(from);
  onEnter(el, () => {
    gsap.to(o, {
      v: to, duration: dur('slow'), ease: 'power3.out',
      onUpdate: () => { el.textContent = format(o.v); },
      onComplete: () => { el.textContent = format(to); },
    });
  }, { start });
}
