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

// 1. Разметка всех остановок (текст из content/*.md)
const states = STOPS.map((s, i) => {
  const el = document.getElementById(s.id);
  el.dataset.name = s.name;
  const mod = MODULES[i];
  if (mod?.render) return mod.render(el);
  const nodes = nodesFrom(renderMarkdown(s.file));
  el.append(prose(nodes));
  return {};
});

// «Остановка N.» в начале заголовка — оформляется как штамп (текст не меняется)
STOPS.forEach((s) => {
  if (s.n < 1 || s.n > 8) return;
  const h2 = document.querySelector(`#${s.id} .prose h2`);
  if (!h2) return;
  h2.id = `${s.id}-h`;
  document.getElementById(s.id).setAttribute('aria-labelledby', h2.id);
  const first = h2.firstChild;
  const m = first?.nodeType === Node.TEXT_NODE && first.textContent.match(/^(Остановка\s+\d+\.)\s*/);
  if (m) {
    first.textContent = first.textContent.slice(m[0].length);
    h2.insertAdjacentHTML('afterbegin', `<span class="h2__kicker">${m[1].replace(/\s+/g, ' ')}</span> `);
  }
});

// 2. Движение и интерактив
initScroll();
initBg();
initRail();
initFootnotes();
initReveal();
initTransitions();
STOPS.forEach((s, i) => MODULES[i]?.animate?.(document.getElementById(s.id), states[i]));

document.fonts?.ready.then(refreshSoon);
window.addEventListener('load', () => ScrollTrigger.refresh());

// 3. Режим редактирования — только в dev (в production-сборку не попадает)
if (import.meta.env.DEV && new URLSearchParams(location.search).get('edit') === '1') {
  import('./edit/edit-mode.js').then((m) => m.initEditMode());
}
