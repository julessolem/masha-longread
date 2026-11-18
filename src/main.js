// Точка входа: шрифты, стили, сборка остановок, движение.
import '@fontsource-variable/google-sans-flex/wdth.css';
import '@fontsource-variable/roboto-flex/wdth.css';
import '@fontsource/pt-mono/cyrillic-400.css';
import '@fontsource/pt-mono/latin-400.css';
import './theme.css';
import './styles/base.css';
import './styles/sections.css';

import { STOPS } from './stops.js';
import { renderMarkdown } from './content/render.js';
import { nodesFrom, prose } from './ui/util.js';
import { initScroll, ScrollTrigger, refreshSoon } from './ui/motion.js';
import { initRail } from './ui/rail.js';
import { initBg } from './ui/bg.js';
import { initReveal } from './ui/reveal.js';
import { initFootnotes } from './ui/footnotes.js';
import { initTransitions } from './transitions/transitions.js';

import * as s00 from './sections/s00-cover.js';
import * as s01 from './sections/s01-paradox.js';
import * as s02 from './sections/s02-who.js';
import * as s03 from './sections/s03-map.js';
import * as s04 from './sections/s04-customs.js';
import * as s05 from './sections/s05-voices.js';
import * as s06 from './sections/s06-suitcase.js';
import * as s07 from './sections/s07-scenarios.js';
import * as s08 from './sections/s08-arrival.js';
import * as s09 from './sections/s09-sources.js';

const MODULES = [s00, s01, s02, s03, s04, s05, s06, s07, s08, s09];

const states = [];

/** Разметка одной остановки (текст из content/*.md) */
function renderStop(i) {
  const s = STOPS[i];
  const el = document.getElementById(s.id);
  el.dataset.name = s.name;
  const mod = MODULES[i];
  if (mod?.render) states[i] = mod.render(el);
  else { el.append(prose(nodesFrom(renderMarkdown(s.file)))); states[i] = {}; }
  // «Остановка N.» в начале заголовка — оформляется как штамп (текст не меняется)
  const h2 = el.querySelector('.prose h2');
  if (h2 && s.n >= 1 && s.n <= 8) {
    h2.id = `${s.id}-h`;
    el.setAttribute('aria-labelledby', h2.id);
    const first = h2.firstChild;
    const m = first?.nodeType === Node.TEXT_NODE && first.textContent.match(/^(Остановка\s+\d+\.)\s*/);
    if (m) {
      first.textContent = first.textContent.slice(m[0].length);
      h2.insertAdjacentHTML('afterbegin', `<span class="h2__kicker">${m[1].replace(/\s+/g, ' ')}</span> `);
    }
  }
  // Переход перед этой остановкой
  const prev = el.previousElementSibling;
  if (prev?.classList.contains('transit')) prev.dataset.ready = '1';
}

// 1. Сразу — обложка и первая остановка: первые перестройки вёрстки (и подмена шрифтов) дешёвые,
// пока страница короткая. Остальные остановки достраиваются порциями в простоях браузера.
renderStop(0);
renderStop(1);
initScroll();
initFootnotes();
MODULES[0].animate(document.getElementById(STOPS[0].id), states[0]);

const tasks = [
  ...STOPS.slice(2).map((s, k) => () => renderStop(k + 2)),
  initBg, initRail, initReveal, initTransitions,
  ...STOPS.slice(1).map((s, k) => () => MODULES[k + 1]?.animate?.(document.getElementById(s.id), states[k + 1])),
];
const idle = window.requestIdleCallback || ((fn) => setTimeout(() => fn({ timeRemaining: () => 6 }), 16));
(function pump() {
  idle((deadline) => {
    do tasks.shift()(); while (tasks.length && deadline.timeRemaining() > 8);
    if (tasks.length) { pump(); return; }
    ScrollTrigger.refresh();
    document.fonts?.ready.then(refreshSoon);
    // Переход по якорю (#s3 и т. п.), если страницу открыли по ссылке на раздел
    if (location.hash && /^#s\d$/.test(location.hash)) document.querySelector(location.hash)?.scrollIntoView();
    // 3. Режим редактирования — только в dev (в production-сборку не попадает)
    if (import.meta.env.DEV && new URLSearchParams(location.search).get('edit') === '1') {
      import('./edit/edit-mode.js').then((m) => m.initEditMode());
    }
  }, { timeout: 500 });
}());
window.addEventListener('load', refreshSoon);
