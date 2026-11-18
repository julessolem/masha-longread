// Карта мира: страны плавно перекрашиваются по объёму сборов, из Москвы рисуются пунктирные маршруты.
import { select } from 'd3-selection';
import { geoNaturalEarth1, geoPath, geoCentroid } from 'd3-geo';
import { scaleLinear } from 'd3-scale';
import { interpolateLab } from 'd3-interpolate';
import { feature } from 'topojson-client';
import atlasUrl from 'world-atlas/countries-110m.json?url';
import { DATA } from '../content/render.js';
import { gsap, REDUCED } from '../ui/motion.js';
import { usd } from '../ui/util.js';
import { PERIODS } from '../sections/s03-map.js';

// ISO 3166-1: буквенный код (как в data.json) → числовой (как в world-atlas).
// Это справочник кодов, а не данные статьи. Добавьте страну, если она появится в data.json.
const ISO = { CHN: '156', MEX: '484', BRA: '076', ITA: '380', PER: '604', TUR: '792', SAU: '682', ROU: '642', COL: '170', ECU: '218', ARG: '032', IND: '356', IDN: '360', ARE: '784', EGY: '818', VNM: '704', KAZ: '398' };
const MOSCOW = [37.62, 55.75];
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

export async function worldMap(el, fig) {
  const topo = await fetch(atlasUrl).then((r) => r.json());
  const countries = feature(topo, topo.objects.countries).features.filter((f) => f.id !== '010');
  const W = 960; const H = 480;
  const projection = geoNaturalEarth1().fitExtent([[6, 6], [W - 6, H - 6]], { type: 'FeatureCollection', features: countries });
  const path = geoPath(projection);
  const svg = select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'group')
    .attr('aria-label', 'Карта мира. Выделенные страны доступны с клавиатуры.');
  const base = '#C9D6DB';
  const cs = svg.append('g').selectAll('path').data(countries).join('path').attr('class', 'country').attr('d', path).style('fill', base);
  const arcsG = svg.append('g');
  const defs = svg.append('defs');
  const mo = projection(MOSCOW);
  svg.append('circle').attr('class', 'moscow').attr('cx', mo[0]).attr('cy', mo[1]).attr('r', 6);
  svg.append('text').attr('class', 'moscow-label').attr('x', mo[0] + 9).attr('y', mo[1] - 7).text('Москва');

  const tip = document.createElement('div');
  tip.className = 'map__tip'; tip.hidden = true; tip.setAttribute('role', 'status');
  el.append(tip);
  const byFeat = new Map(countries.map((f) => [f.id, f]));
  let current = null;

  function showTip(e, d, rows, title) {
    const c = rows.get(d.id);
    if (!c) return;
    const box = el.getBoundingClientRect();
    let x; let y;
    if (e.clientX) { x = e.clientX - box.left; y = e.clientY - box.top; } else {
      const r = e.target.getBoundingClientRect(); x = r.left + r.width / 2 - box.left; y = r.top - box.top;
    }
    tip.innerHTML = `${c.country}<b>${usd(c.value)}</b><small>${title}</small>`;
    tip.style.left = `${Math.max(70, Math.min(box.width - 70, x))}px`;
    tip.style.top = `${Math.max(56, y)}px`;
    tip.hidden = false;
    cs.classed('is-active', (f) => f.id === d.id);
  }
  const hideTip = () => { tip.hidden = true; cs.classed('is-active', false); };

  function show(key) {
    if (current === key) return;
    current = key;
    const period = PERIODS.find((p) => p.key === key);
    const list = DATA[key];
    const rows = new Map(list.map((c) => [ISO[c.iso], c]));
    const vmax = Math.max(...list.map((c) => c.value));
    const color = scaleLinear().domain([0, vmax]).range(['#F4CFA8', '#8A3A08']).interpolate(interpolateLab);
    hideTip();

    cs.classed('is-data', (d) => rows.has(d.id))
      .attr('tabindex', (d) => (rows.has(d.id) ? 0 : null))
      .attr('role', (d) => (rows.has(d.id) ? 'button' : null))
      .attr('aria-label', (d) => (rows.has(d.id) ? `${rows.get(d.id).country}: ${usd(rows.get(d.id).value)}, ${period.title}` : null))
      .style('fill', (d) => (rows.has(d.id) ? color(rows.get(d.id).value) : base))
      .on('pointerenter pointermove click', (e, d) => rows.has(d.id) && showTip(e, d, rows, period.title))
      .on('focus', (e, d) => rows.has(d.id) && showTip(e, d, rows, period.title))
      .on('pointerleave blur', hideTip);

    // Цвета в списке под картой
    fig.querySelectorAll('.map__list i[data-iso]').forEach((i) => {
      const c = list.find((x) => x.iso === i.dataset.iso);
      if (c) i.style.background = color(c.value);
    });

    // Маршруты: дуга большого круга Москва → центр страны; пунктир «прорисовывается» через маску
    arcsG.selectAll('*').remove(); defs.selectAll('*').remove();
    list.forEach((c, i) => {
      const f = byFeat.get(ISO[c.iso]);
      if (!f) return;
      const d = path({ type: 'LineString', coordinates: [MOSCOW, geoCentroid(f)] });
      const m = defs.append('mask').attr('id', `arc-m-${i}`).attr('maskUnits', 'userSpaceOnUse');
      const mp = m.append('path').attr('d', d).attr('fill', 'none').attr('stroke', '#fff').attr('stroke-width', 6);
      arcsG.append('path').attr('class', 'arc').attr('d', d).attr('mask', `url(#arc-m-${i})`);
      if (!REDUCED) {
        const L = mp.node().getTotalLength();
        mp.attr('stroke-dasharray', `${L} ${L}`).attr('stroke-dashoffset', L);
        gsap.to(mp.node(), { attr: { 'stroke-dashoffset': 0 }, duration: 1.1, delay: 0.15 * i, ease: 'power2.inOut' });
      }
    });
  }

  // Первая прорисовка маршрутов — когда карта появилась на экране
  return { show };
}
