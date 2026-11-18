// 03. Карта маршрута: вкладки периодов, перекраска стран, пунктирные маршруты из Москвы,
// тултипы, плашка «Латинская Америка ≈ ⅓ кассы».
import { renderMarkdown, DATA } from '../content/render.js';
import { nodesFrom, prose, h, fnRefs, usd } from '../ui/util.js';
import { whenNear, refreshSoon, onEnter } from '../ui/motion.js';

export const PERIODS = [
  { key: 'markets2024', tab: '2024', title: '2024, весь год' },
  { key: 'markets2026_9m', tab: 'янв–сен 2026', title: 'январь–сентябрь 2026' },
];

export function render(el) {
  const nodes = nodesFrom(renderMarkdown('03-karta.md'));
  const paras = nodes.filter((n) => n.tagName === 'P');
  const head = nodes.filter((n) => n.tagName !== 'P');
  const latam = DATA.latamShare2026_9m;
  const [share, ...rest] = String(latam.note || '').split(',');

  const fig = h(`
  <figure class="figure wide map-fig">
    <figcaption class="figure__title">Крупнейшие зарубежные рынки российского кино, сборы в долларах</figcaption>
    <div class="tabs" role="tablist" aria-label="Период">
      ${PERIODS.map((p, i) => `<button type="button" class="btn" role="tab" id="map-tab-${i}" aria-selected="${i === 0}" aria-controls="map-panel" tabindex="${i === 0 ? 0 : -1}" data-k="${p.key}">${p.tab}</button>`).join('')}
    </div>
    <div id="map-panel" role="tabpanel" aria-labelledby="map-tab-0">
      <div class="map" data-chart="map" aria-label="Карта мира с выделенными странами-рынками"></div>
      <ol class="map__list" aria-live="polite"></ol>
    </div>
    <aside class="latam" aria-label="Латинская Америка">
      <span class="latam__big">${share.includes('⅓') ? '≈⅓' : share.trim()}</span>
      <p><b>Латинская Америка</b> — ${usd(latam.value)} за январь–сентябрь 2026${rest.length ? `, ${rest.join(',').trim()}` : ''}${fnRefs(latam.sourceId)}</p>
    </aside>
    <p class="figure__note">Периоды не сопоставимы: 2024 — полный год, 2026 — девять месяцев. Пунктир — условный маршрут из Москвы, а не реальные поставки. Границы — Natural Earth 1:110 млн. <span class="map-src"></span></p>
  </figure>`);

  const inner = document.createElement('div');
  inner.className = 'stop__inner';
  inner.append(prose([...head, paras[0]]), fig, prose(paras.slice(1)));
  el.append(inner);

  // Список стран — сразу (он же текстовая альтернатива карте)
  const list = fig.querySelector('.map__list');
  const src = fig.querySelector('.map-src');
  const fill = (key) => {
    const rows = [...DATA[key]].sort((a, b) => b.value - a.value);
    list.innerHTML = rows.map((c) => `<li><i data-iso="${c.iso}"></i><span>${c.country}</span><b>${usd(c.value)}</b></li>`).join('');
    src.innerHTML = `Источники: ${fnRefs(rows.map((r) => r.sourceId))}`;
  };
  fill(PERIODS[0].key);
  return { fig, fill };
}

export function animate(el, { fig, fill }) {
  const tabs = [...fig.querySelectorAll('[role="tab"]')];
  let map = null;
  const select = (tab, focus) => {
    tabs.forEach((t) => { const on = t === tab; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
    fig.querySelector('#map-panel').setAttribute('aria-labelledby', tab.id);
    if (focus) tab.focus();
    fill(tab.dataset.k);
    map?.show(tab.dataset.k);
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (d) { e.preventDefault(); select(tabs[(i + d + tabs.length) % tabs.length], true); }
    });
  });
  whenNear(fig, () => import('../charts/map.js').then(async (m) => {
    const loaded = await m.worldMap(fig.querySelector('[data-chart="map"]'), fig);
    refreshSoon();
    // Маршруты прорисовываются, когда карта появилась на экране
    onEnter(fig.querySelector('.map'), () => {
      map = loaded;
      map.show(tabs.find((t) => t.getAttribute('aria-selected') === 'true').dataset.k);
    }, { start: 'top 75%' });
  }));
}
