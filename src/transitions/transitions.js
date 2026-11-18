// Переходы между остановками. Каждый — блок .transit высотой ≤ 1 экрана (--transit-h в theme.css),
// анимация привязана к скроллу (scrub) и использует только transform/opacity.
// На телефоне — короче и проще; при prefers-reduced-motion — статичная декоративная картинка.
import { gsap, REDUCED, isMobile } from '../ui/motion.js';

const PLANE = 'M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z';
const st = (el, extra = {}) => ({ trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.6, ...extra });

const BUILD = {
  // 00 → 01: корешок посадочного талона отрывается и улетает
  tear(el) {
    el.innerHTML = `<div class="transit__stage"><svg viewBox="0 0 600 200" width="min(560px, 86vw)">
      <g class="t-main"><rect x="10" y="40" width="380" height="120" rx="14" fill="#FFFDF8"/><rect x="34" y="70" width="120" height="14" rx="4" fill="#1C2333" opacity=".85"/><rect x="34" y="96" width="200" height="8" rx="3" fill="#CDBFA6"/><rect x="34" y="114" width="160" height="8" rx="3" fill="#CDBFA6"/></g>
      <line x1="392" y1="44" x2="392" y2="156" stroke="#CDBFA6" stroke-width="3" stroke-dasharray="6 6"/>
      <g class="t-stub"><rect x="394" y="40" width="150" height="120" rx="14" fill="#FFFDF8"/><rect x="414" y="70" width="80" height="12" rx="4" fill="#6E1E2A"/><rect x="414" y="104" width="110" height="30" fill="url(#bc)"/></g>
      <defs><pattern id="bc" width="6" height="30" patternUnits="userSpaceOnUse"><rect width="3" height="30" fill="#1C2333"/></pattern></defs>
    </svg></div>`;
    if (REDUCED) return;
    const tl = gsap.timeline({ scrollTrigger: st(el) });
    tl.fromTo(el.querySelector('.transit__stage'), { y: -60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.25 })
      .to(el.querySelector('.t-stub'), { x: 120, y: -60, rotation: 24, transformOrigin: '0% 100%', duration: 0.5, ease: 'power2.in' }, 0.25)
      .to(el.querySelector('.t-main'), { x: -30, rotation: -4, duration: 0.5 }, 0.25)
      .to(el.querySelector('.transit__stage'), { opacity: 0, y: 40, duration: 0.25 }, 0.75);
  },

  // Пролёт пунктирной линии маршрута с самолётом
  route(el, flip = false) {
    const d = flip ? 'M 980 40 C 700 60, 640 260, 420 200 S 80 120, 20 260' : 'M 20 260 C 220 60, 420 300, 600 140 S 900 30, 980 80';
    el.innerHTML = `<div class="transit__stage"><svg viewBox="0 0 1000 300" style="width:100%;max-height:80%">
      <defs><mask id="rm-${flip ? 2 : 1}" maskUnits="userSpaceOnUse"><path class="t-mask" d="${d}" fill="none" stroke="#fff" stroke-width="10"/></mask></defs>
      <path class="t-line" d="${d}" fill="none" stroke="#2F5D8A" stroke-width="3" stroke-dasharray="10 9" stroke-linecap="round" mask="url(#rm-${flip ? 2 : 1})"/>
      <path class="t-plane" d="${PLANE}" fill="#2F5D8A" transform="translate(-12 -12) scale(1.6)"/>
    </svg></div>`;
    const mask = el.querySelector('.t-mask');
    const plane = el.querySelector('.t-plane');
    if (REDUCED) { plane.remove(); return; }
    const L = mask.getTotalLength();
    gsap.set(mask, { attr: { 'stroke-dasharray': `${L} ${L}`, 'stroke-dashoffset': L } });
    const tl = gsap.timeline({ scrollTrigger: st(el, { start: 'top 85%', end: 'bottom 15%' }) });
    tl.to(mask, { attr: { 'stroke-dashoffset': 0 }, ease: 'none', duration: 1 }, 0)
      .to(plane, { motionPath: { path: el.querySelector('.t-line'), align: el.querySelector('.t-line'), alignOrigin: [0.5, 0.5], autoRotate: 90 }, ease: 'none', duration: 1 }, 0);
  },
  route2(el) { BUILD.route(el, true); },

  // 02 → 03: «глобус» вырастает и раскрывается в карту
  zoom(el) {
    el.innerHTML = `<div class="transit__stage"><svg viewBox="0 0 200 200" width="min(320px, 60vw)">
      <circle cx="100" cy="100" r="90" fill="#D7E3E8"/>
      <g fill="#C9D6DB" stroke="#F4F7F8" stroke-width="1"><path d="M40 70 q20 -20 40 -6 q10 14 -6 26 q-20 10 -34 -20z"/><path d="M96 52 q30 -8 52 8 q8 22 -14 30 q-30 4 -38 -38z"/><path d="M110 112 q24 2 30 22 q-6 22 -28 18 q-14 -16 -2 -40z"/><path d="M58 118 q14 -2 20 14 q-2 18 -16 20 q-10 -14 -4 -34z"/></g>
      <path d="M100 10 a90 90 0 0 1 0 180 a90 90 0 0 1 0 -180" fill="none" stroke="#2F5D8A" stroke-width="1.5" stroke-dasharray="4 5"/>
      <circle cx="122" cy="58" r="4" fill="#6E1E2A"/>
    </svg></div>`;
    if (REDUCED) return;
    const svg = el.querySelector('svg');
    gsap.timeline({ scrollTrigger: st(el) })
      .fromTo(svg, { scale: 0.3, opacity: 0, rotation: -30 }, { scale: 1, opacity: 1, rotation: 0, duration: 0.45, ease: 'power2.out' })
      .to(svg, { scale: isMobile() ? 2.2 : 3.4, opacity: 0, duration: 0.55, ease: 'power2.in' });
  },

  // 03 → 04: перелистывание страницы паспорта
  flip(el) {
    el.innerHTML = `<div class="transit__stage" style="perspective:1400px"><div class="t-book" style="position:relative;width:min(520px,84vw);aspect-ratio:2/1.3;transform-style:preserve-3d">
      <div style="position:absolute;inset:0;border-radius:10px;background:#F8F0E6;box-shadow:0 20px 40px -26px rgba(0,0,0,.5);background-image:repeating-linear-gradient(0deg,transparent 0 17px,rgba(110,30,42,.07) 17px 18px)"></div>
      <div class="t-page" style="position:absolute;top:0;bottom:0;left:50%;width:50%;transform-origin:0 50%;transform-style:preserve-3d">
        <div style="position:absolute;inset:0;border-radius:0 10px 10px 0;background:#FBF4EA;backface-visibility:hidden;box-shadow:inset 8px 0 14px -10px rgba(0,0,0,.3);display:grid;place-items:center;font:700 12px/1 var(--font-mono);letter-spacing:.2em;color:#6E1E2A">ВИЗЫ · VISAS</div>
        <div style="position:absolute;inset:0;border-radius:10px 0 0 10px;background:#F2E4DF;backface-visibility:hidden;transform:rotateY(180deg)"></div>
      </div>
      <div style="position:absolute;left:50%;top:0;bottom:0;width:2px;background:rgba(0,0,0,.12)"></div>
    </div></div>`;
    if (REDUCED) return;
    const page = el.querySelector('.t-page');
    gsap.timeline({ scrollTrigger: st(el, isMobile() ? {} : { start: 'top 70%', end: 'bottom 30%' }) })
      .fromTo(el.querySelector('.t-book'), { y: 60, opacity: 0, rotationX: 25 }, { y: 0, opacity: 1, rotationX: 10, duration: 0.25 })
      .to(page, { rotationY: -180, ease: 'power1.inOut', duration: 0.55 })
      .to(el.querySelector('.t-book'), { opacity: 0, y: -40, duration: 0.2 });
  },

  // 04 → 05: штампы разлетаются
  scatter(el) {
    const words = ['ВИЗА', 'ВЪЕЗД', 'ДОСМОТР', 'ВЫЕЗД', 'ТРАНЗИТ'];
    const colors = ['#B8322A', '#2F5D8A', '#6E1E2A', '#1C2333', '#C8641E'];
    el.innerHTML = `<div class="transit__stage">${words.map((w, i) => `<span class="t-st" style="position:absolute;font:900 clamp(14px,2.4vw,22px)/1 var(--font-main);letter-spacing:.06em;color:${colors[i]};border:3px double currentColor;border-radius:10px;padding:6px 12px;mix-blend-mode:multiply">${w}</span>`).join('')}</div>`;
    if (REDUCED) { el.querySelectorAll('.t-st').forEach((s, i) => gsap.set(s, { x: (i - 2) * 110, rotation: (i % 2 ? 8 : -8) })); return; }
    const spread = isMobile() ? 0.45 : 1;
    const tl = gsap.timeline({ scrollTrigger: st(el) });
    el.querySelectorAll('.t-st').forEach((s, i) => {
      const a = (i / words.length) * Math.PI * 2;
      tl.fromTo(s, { x: 0, y: 0, scale: 1.6, opacity: 0, rotation: 0 }, { scale: 1, opacity: 1, rotation: (i % 2 ? 10 : -12), duration: 0.3 }, 0)
        .to(s, { x: Math.cos(a) * 420 * spread, y: Math.sin(a) * 160, rotation: (i % 2 ? 40 : -40), opacity: 0, duration: 0.7, ease: 'power2.in' }, 0.3);
    });
  },

  // 05 → 06: чемодан на колёсиках въезжает
  suitcase(el) {
    el.innerHTML = `<div class="transit__stage"><svg viewBox="0 0 200 170" width="min(200px, 40vw)" class="t-case">
      <rect x="70" y="4" width="60" height="30" rx="10" fill="none" stroke="#1C2333" stroke-width="9"/>
      <rect x="20" y="28" width="160" height="118" rx="18" fill="#6E1E2A"/><rect x="52" y="26" width="12" height="122" rx="3" fill="#561520"/><rect x="136" y="26" width="12" height="122" rx="3" fill="#561520"/>
      <text x="100" y="94" text-anchor="middle" font-family="PT Mono, monospace" font-size="13" letter-spacing="2" fill="#E9C77B">МАША</text>
      <circle class="t-wheel" cx="48" cy="156" r="10" fill="#1C2333"/><circle class="t-wheel" cx="152" cy="156" r="10" fill="#1C2333"/>
    </svg></div>`;
    if (REDUCED) return;
    const c = el.querySelector('.t-case');
    gsap.timeline({ scrollTrigger: st(el) })
      .fromTo(c, { x: () => window.innerWidth * 0.6, rotation: 4 }, { x: 0, rotation: 0, ease: 'power2.out', duration: 0.5 })
      .to(c, { y: -6, duration: 0.05, yoyo: true, repeat: 3 }, 0.1)
      .to(c, { x: () => -window.innerWidth * 0.1, scale: 1.4, opacity: 0, duration: 0.5, ease: 'power2.in' });
  },

  // 07 → 08: самолёт снижается и «садится» на талон
  landing(el) {
    el.innerHTML = `<div class="transit__stage"><svg viewBox="0 0 1000 300" style="width:100%;height:70%">
      <path class="t-glide" d="M 40 40 C 360 40, 560 230, 960 250" fill="none" stroke="#2F5D8A" stroke-width="2" stroke-dasharray="6 8" opacity=".55"/>
      <rect x="560" y="258" width="420" height="10" rx="5" fill="#CDBFA6"/><rect x="590" y="261" width="40" height="4" fill="#FFFDF8"/><rect x="680" y="261" width="40" height="4" fill="#FFFDF8"/><rect x="770" y="261" width="40" height="4" fill="#FFFDF8"/>
      <path class="t-plane" d="${PLANE}" fill="#6E1E2A" transform="translate(-12 -12) scale(2)"/>
    </svg></div>`;
    const plane = el.querySelector('.t-plane');
    if (REDUCED) { plane.remove(); return; }
    const glide = el.querySelector('.t-glide');
    gsap.to(plane, { motionPath: { path: glide, align: glide, alignOrigin: [0.5, 0.5], autoRotate: 90 }, ease: 'power1.inOut', scrollTrigger: st(el, { start: 'top 80%', end: 'bottom 30%' }) });
  },
};

export function initTransitions() {
  document.querySelectorAll('.transit').forEach((el) => BUILD[el.dataset.transit]?.(el));
}
