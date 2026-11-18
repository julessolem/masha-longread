// Появление текста в каждой остановке: заголовок «расширяется» вариативным шрифтом,
// абзацы мягко всплывают. Только transform/opacity (кроме оси ширины у заголовков).
import { gsap, ScrollTrigger, REDUCED, isMobile, dur } from './motion.js';

export function initReveal(root = document) {
  const heads = root.querySelectorAll('.stop .prose h2');
  const paras = root.querySelectorAll('.stop .prose > p, .stop .prose > h3, .stop .prose > ul, .scen__panel');

  if (REDUCED) return; // всё видно сразу

  heads.forEach((h2) => {
    gsap.fromTo(h2, { '--wdth': 40, opacity: 0, y: 20 }, {
      '--wdth': 100, opacity: 1, y: 0, duration: dur('slow'), ease: 'expo.out',
      scrollTrigger: { trigger: h2, start: 'top 88%', once: true },
    });
  });

  const y = isMobile() ? 14 : 28;
  ScrollTrigger.batch(paras, {
    start: 'top 92%', once: true,
    onEnter: (batch) => gsap.fromTo(batch, { opacity: 0, y }, { opacity: 1, y: 0, duration: dur('base'), ease: 'power2.out', stagger: 0.08, overwrite: true }),
  });
  // Скрываем до появления только то, что ниже первого экрана
  paras.forEach((p) => { if (p.getBoundingClientRect().top > window.innerHeight) gsap.set(p, { opacity: 0 }); });
}
