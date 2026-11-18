// 07. Куда дальше: три кнопки-сценария, линия прогноза плавно перестраивается,
// текст сценария (блоки ### из .md) меняется вместе с кнопкой.
import { renderMarkdown, DATA } from '../content/render.js';
import { nodesFrom, prose, h, fnRefs, num } from '../ui/util.js';
import { whenNear, refreshSoon, gsap, REDUCED } from '../ui/motion.js';

export const scenarioList = () => Object.entries(DATA.scenarios).filter(([, v]) => v && typeof v === 'object' && v.label).map(([key, v]) => ({ key, ...v }));

export function render(el) {
  const nodes = nodesFrom(renderMarkdown('07-stsenarii.md'));
  const list = scenarioList();
  // Разбиваем текст: до первого ###, блоки сценариев, хвост (последний абзац после сценариев — примечание)
  const firstH3 = nodes.findIndex((n) => n.tagName === 'H3');
  const intro = nodes.slice(0, firstH3);
  const blocks = [];
  let tail = [];
  nodes.slice(firstH3).forEach((n) => {
    if (n.tagName === 'H3') blocks.push([n]);
    else blocks[blocks.length - 1].push(n);
  });
  // Курсивное примечание в конце последнего блока выносим под график
  const last = blocks[blocks.length - 1];
  if (last && last.length > 1 && last[last.length - 1].firstElementChild?.tagName === 'EM' && last[last.length - 1].textContent.trim() === last[last.length - 1].firstElementChild.textContent.trim()) tail = [last.pop()];

  const start = DATA.animationAbroad2023;
  const target = DATA.animationTarget2030;
  const fig = h(`
  <figure class="scen">
    <figcaption class="figure__title">Экспортные сборы российской анимации, млн долларов: 2023 — факт, 2030 — сценарии</figcaption>
    <div class="scen__btns" role="group" aria-label="Сценарий">
      ${list.map((s, i) => `<button type="button" class="btn scen__btn" aria-pressed="${i === 0}" aria-controls="scen-panel" data-k="${s.key}">${s.label}</button>`).join('')}
    </div>
    <div class="chart chart--scen" data-chart="scen" role="img" aria-label=""></div>
    <div id="scen-panel" aria-live="polite"></div>
    <p class="figure__note">${DATA.scenarios.note}. Факт 2023 и цель 2030 — отраслевой доклад${fnRefs([start.sourceId, target.sourceId])}</p>
  </figure>`);
  const panelHost = fig.querySelector('#scen-panel');
  const panels = blocks.map((b, i) => {
    const d = document.createElement('div');
    d.className = 'scen__panel';
    d.dataset.k = list[i]?.key || `s${i}`;
    d.hidden = i !== 0;
    b.forEach((n) => d.append(n));
    panelHost.append(d);
    return d;
  });

  const inner = document.createElement('div');
  inner.className = 'stop__inner';
  inner.append(prose(intro), fig, prose(tail));
  el.append(inner);
  return { fig, panels, list };
}

export function animate(el, { fig, panels, list }) {
  const btns = [...fig.querySelectorAll('.scen__btn')];
  const chartEl = fig.querySelector('[data-chart="scen"]');
  let chart = null;
  let current = list[0].key;
  const label = () => {
    const s = list.find((x) => x.key === current);
    chartEl.setAttribute('aria-label', `Прогноз автора, не данные. Сценарий «${s.label}»: от ${num(DATA.animationAbroad2023.value)} млн долларов в 2023 году до ${num(s['2030'])} млн в 2030-м. Цель — ${num(DATA.animationTarget2030.value)} млн.`);
  };
  label();
  btns.forEach((b) => b.addEventListener('click', () => {
    current = b.dataset.k;
    btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    panels.forEach((p) => {
      const on = p.dataset.k === current;
      p.hidden = !on;
      if (on && !REDUCED) gsap.fromTo(p, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.45 });
    });
    label();
    chart?.set(current);
  }));
  whenNear(fig, () => import('../charts/scenarios.js').then((m) => {
    chart = m.scenarioChart(chartEl, list, current);
    refreshSoon();
  }));
}
