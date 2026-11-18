// 02. Кто едет: линия сборов (рисуется при скролле), вставка неполных периодов,
// пончик «≈⅔», топ-5 с переключателем «только анимация», карточка 20% → 30%.
import { renderMarkdown, DATA } from '../content/render.js';
import { nodesFrom, prose, h, fnRefs, num } from '../ui/util.js';
import { counter } from '../ui/counter.js';
import { whenNear, refreshSoon } from '../ui/motion.js';

export function render(el) {
  const nodes = nodesFrom(renderMarkdown('02-kto-edet.md'));
  const paras = nodes.filter((n) => n.tagName === 'P');
  const years = DATA.boxOfficeAbroadYears;
  const part = DATA.boxOfficeAbroadPartial;
  const share = DATA.animationShareOfForeignBoxOffice;
  const top = DATA.top5Abroad2024;
  const profit = DATA.exportShareOfAnimationProfit;

  const line = h(`
  <figure class="figure wide">
    <figcaption class="figure__title">Сборы российского кино за рубежом без СНГ, млн долларов</figcaption>
    <div class="chart-row">
      <div class="chart chart--line" data-chart="line" role="img" aria-label="${years.map((d) => `${d.period}: ${num(d.value)} млн долларов`).join('; ')}. За 2020–2021 годы данных нет."></div>
      <div class="inset chart" data-chart="partial" role="img" aria-label="Неполные периоды: ${part.map((d) => `${d.period} — ${num(d.value)} млн долларов`).join('; ')}."></div>
    </div>
    <p class="figure__note">Сплошная линия — полные годы; ${years[0].note ? `${years[0].period}: ${years[0].note}. ` : ''}2020–2021: данных нет. Справа — неполные периоды (январь–сентябрь), с полными годами не сравниваются. Источники: ${fnRefs([...years, ...part].map((d) => d.sourceId))}</p>
  </figure>`);

  const duo = h(`
  <div class="duo wide">
    <figure class="figure">
      <figcaption class="figure__title">Доля анимации в зарубежной кассе российских проектов</figcaption>
      <div class="chart chart--donut" data-chart="donut" role="img" aria-label="Около ${Math.round(share.value * 100)}% — анимация, ${share.period}."></div>
      <p class="figure__note">${share.period[0].toUpperCase() + share.period.slice(1)}; ${share.note}${fnRefs(share.sourceId)}</p>
    </figure>
    <figure class="figure">
      <figcaption class="figure__title">Топ-5 российских фильмов за рубежом в 2024 году, млн долларов</figcaption>
      <button type="button" class="toggle" aria-pressed="false"><span class="toggle__track" aria-hidden="true"></span>Только анимация</button>
      <div class="chart" data-chart="bars" role="img" aria-label="${top.map((d) => `${d.title} — ${num(d.value)} млн долларов${d.animation ? ', анимация' : ''}`).join('; ')}."></div>
      <ul class="legend" aria-hidden="true"><li><i style="background:var(--c-anim)"></i>Анимация</li><li><i style="background:var(--c-other)"></i>Игровое кино</li></ul>
      <p class="figure__note">Источники: ${fnRefs(top.map((d) => d.sourceId))}</p>
    </figure>
  </div>`);

  const card = h(`
  <aside class="profit" aria-label="Доля экспорта в прибыли анимационных проектов">
    <p class="profit__label">Доля экспорта в прибыли анимационных проектов</p>
    <p class="profit__nums"><span data-c="before">${Math.round(profit.before * 100)}%</span><i aria-hidden="true">→</i><span data-c="now">${Math.round(profit.now * 100)}%</span></p>
    <p class="profit__period">до пандемии → сейчас${fnRefs(profit.sourceId)}</p>
  </aside>`);

  // Вставка между абзацами: после 1-го — линия, после 2-го — пончик и топ-5, после 4-го — карточка
  const inner = document.createElement('div');
  inner.className = 'stop__inner';
  const head = nodes.filter((n) => n.tagName !== 'P');
  inner.append(prose([...head, paras[0]]), line, prose([paras[1]]), duo, prose(paras.slice(2, 4)), card, prose(paras.slice(4)));
  el.append(inner);
  return { line, duo, card };
}

export function animate(el, { line, duo, card }) {
  const profit = DATA.exportShareOfAnimationProfit;
  counter(card.querySelector('[data-c="before"]'), Math.round(profit.before * 100), (v) => `${Math.round(v)}%`);
  counter(card.querySelector('[data-c="now"]'), Math.round(profit.now * 100), (v) => `${Math.round(v)}%`, { from: Math.round(profit.before * 100) });

  whenNear(line, () => import('../charts/line.js').then((m) => {
    m.lineChart(line.querySelector('[data-chart="line"]'), DATA.boxOfficeAbroadYears);
    m.partialChart(line.querySelector('[data-chart="partial"]'), DATA.boxOfficeAbroadPartial);
    refreshSoon();
  }));
  whenNear(duo, () => Promise.all([import('../charts/donut.js'), import('../charts/bars.js')]).then(([d, b]) => {
    d.donutChart(duo.querySelector('[data-chart="donut"]'), DATA.animationShareOfForeignBoxOffice.value);
    b.barsChart(duo.querySelector('[data-chart="bars"]'), DATA.top5Abroad2024, duo.querySelector('.toggle'));
    refreshSoon();
  }));
}
