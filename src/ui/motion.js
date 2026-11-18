// Общие настройки движения: GSAP, ScrollTrigger, Lenis, reduced-motion.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);
export { gsap, ScrollTrigger };

export const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const isMobile = () => window.matchMedia('(max-width: 767px)').matches;

/** Длительность из theme.css (--dur-*), с учётом --motion-scale */
export function dur(name = 'base') {
  const cs = getComputedStyle(document.documentElement);
  const v = parseFloat(cs.getPropertyValue(`--dur-${name}`)) || 0.8;
  const k = parseFloat(cs.getPropertyValue('--motion-scale'));
  return REDUCED ? 0 : v * (Number.isFinite(k) ? k : 1);
}

let lenis = null;
export function initScroll() {
  if (REDUCED) return null;
  lenis = new Lenis({ duration: 1.1, smoothWheel: true, wheelMultiplier: 1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

/** Плавный переход к элементу (учитывает Lenis и reduced-motion) */
export function scrollToEl(el, offset = 0) {
  const top = isMobile() ? -70 : -24;
  if (lenis) lenis.scrollTo(el, { offset: top + offset, duration: 1.2 });
  else el.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
}

/** Выполнить один раз, когда элемент появится на экране */
export function onEnter(el, fn, { start = 'top 80%' } = {}) {
  ScrollTrigger.create({ trigger: el, start, once: true, onEnter: () => fn() });
}

/** Ленивое выполнение, когда элемент приближается к экрану (для тяжёлых графиков) */
export function whenNear(el, fn, margin = '600px') {
  if (!('IntersectionObserver' in window)) { fn(); return; }
  const io = new IntersectionObserver((es) => {
    if (es.some((e) => e.isIntersecting)) { io.disconnect(); fn(); }
  }, { rootMargin: `${margin} 0px` });
  io.observe(el);
}

/** Пересчитать позиции ScrollTrigger (после отрисовки графиков) — с задержкой */
let refreshTimer = 0;
export function refreshSoon() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 150);
}
