// Линейный график полных лет (линия «рисуется» скроллом) и отдельная вставка неполных периодов
import { select } from 'd3-selection';
import { scaleLinear, scaleBand } from 'd3-scale';
import { line as d3line } from 'd3-shape';
import { max } from 'd3-array';
import { gsap, REDUCED, isMobile } from '../ui/motion.js';
import { num } from '../ui/util.js';

const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

export function lineChart(el, data) {
  // На телефоне — своя «система координат», чтобы подписи не мельчали
  const narrow = isMobile();
  const W = narrow ? 420 : 800; const H = narrow ? 340 : 450;
  const m = { t: 40, r: narrow ? 16 : 30, b: 40, l: narrow ? 40 : 54 };
  const years = data.map((d) => Number(d.period));
  const x = scaleLinear().domain([Math.min(...years) - 0.4, Math.max(...years) + 0.4]).range([m.l, W - m.r]);
  const yMax = Math.ceil(max(data, (d) => d.value) / 10) * 10 + 10;
  const y = scaleLinear().domain([0, yMax]).range([H - m.b, m.t]);
  const small = false; // размеры шрифтов ниже — в единицах viewBox
  const svg = select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('aria-hidden', 'true');

  // Сетка и оси
  const g = svg.append('g');
  y.ticks(5).forEach((t) => {
    g.append('line').attr('class', 'gridline').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(t)).attr('y2', y(t));
    g.append('text').attr('x', m.l - 10).attr('y', y(t) + 5).attr('text-anchor', 'end').attr('font-size', small ? 22 : 15).attr('fill', css('--c-ink-soft')).text(`$${t}`);
  });
  for (let yr = Math.min(...years); yr <= Math.max(...years); yr++) {
    g.append('text').attr('x', x(yr)).attr('y', H - 10).attr('text-anchor', 'middle').attr('font-size', small ? 22 : 15).attr('fill', css('--c-ink-soft')).text(yr);
  }

  // Разрыв: годы без данных
  for (let i = 1; i < years.length; i++) {
    if (years[i] - years[i - 1] > 1) {
      const x0 = x(years[i - 1] + 0.15); const x1 = x(years[i] - 0.15);
      g.append('rect').attr('x', x0).attr('y', m.t).attr('width', x1 - x0).attr('height', H - m.t - m.b).attr('fill', css('--c-paper-2')).attr('opacity', 0.8);
      g.append('text').attr('x', (x0 + x1) / 2).attr('y', H - m.b - 14).attr('text-anchor', 'middle').attr('font-size', small ? 20 : 14).attr('fill', css('--c-ink-soft'))
        .text(`${years[i - 1] + 1}–${years[i] - 1}: нет данных`);
    }
  }

  const path = svg.append('path').datum(data).attr('fill', 'none').attr('stroke', css('--c-passport')).attr('stroke-width', 4).attr('stroke-linejoin', 'round')
    .attr('d', d3line().x((d) => x(Number(d.period))).y((d) => y(d.value)));
  const pts = svg.append('g').selectAll('g').data(data).join('g').attr('transform', (d) => `translate(${x(Number(d.period))},${y(d.value)})`);
  pts.append('circle').attr('r', 7).attr('fill', css('--c-passport')).attr('stroke', css('--c-paper')).attr('stroke-width', 3);
  pts.append('text').attr('y', -16).attr('text-anchor', (d, i) => (i === 0 ? 'start' : 'middle')).attr('dx', (d, i) => (i === 0 ? -6 : 0))
    .attr('font-size', small ? 24 : 17).attr('font-weight', 800).text((d) => `$${num(d.value)}${narrow ? '' : ' млн'}`);

  if (REDUCED) return;
  // Линия рисуется синхронно со скроллом, точки проявляются по мере прохождения
  const L = path.node().getTotalLength();
  path.attr('stroke-dasharray', `${L} ${L}`).attr('stroke-dashoffset', L);
  pts.attr('opacity', 0);
  const nodes = pts.nodes();
  gsap.to(path.node(), {
    attr: { 'stroke-dashoffset': 0 }, ease: 'none',
    scrollTrigger: {
      trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: 0.6,
      onUpdate: (st) => nodes.forEach((n, i) => { n.style.opacity = st.progress >= i / (nodes.length - 1) - 0.02 ? 1 : 0; }),
    },
  });
}

export function partialChart(el, data) {
  const small = isMobile();
  const W = small ? 420 : 300; const H = small ? 300 : 380;
  const m = { t: 70, r: 10, b: 50, l: 10 };
  const svg = select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('aria-hidden', 'true');
  svg.append('text').attr('x', 4).attr('y', 22).attr('font-size', 19).attr('font-weight', 800).text('Неполные периоды');
  svg.append('text').attr('x', 4).attr('y', 44).attr('font-size', 14).attr('fill', css('--c-ink-soft')).text('январь–сентябрь, своя шкала');
  const x = scaleBand().domain(data.map((d) => d.period)).range([m.l, W - m.r]).padding(0.3);
  const y = scaleLinear().domain([0, max(data, (d) => d.value) * 1.25]).range([H - m.b, m.t]);
  const colors = [css('--c-other'), css('--c-stamp')];
  const bars = svg.selectAll('g.b').data(data).join('g').attr('class', 'b');
  bars.append('rect').attr('x', (d) => x(d.period)).attr('width', x.bandwidth()).attr('y', (d) => y(d.value)).attr('height', (d) => y(0) - y(d.value))
    .attr('rx', 4).attr('fill', (d, i) => colors[i % 2]).attr('stroke', css('--c-ink')).attr('stroke-dasharray', '5 4');
  bars.append('text').attr('x', (d) => x(d.period) + x.bandwidth() / 2).attr('y', (d) => y(d.value) - 10).attr('text-anchor', 'middle').attr('font-size', small ? 22 : 18).attr('font-weight', 800).text((d) => `$${num(d.value)} млн`);
  bars.append('text').attr('x', (d) => x(d.period) + x.bandwidth() / 2).attr('y', H - m.b + 24).attr('text-anchor', 'middle').attr('font-size', 15).attr('fill', css('--c-ink-soft')).text((d) => d.period);
  const note = data.find((d) => d.note);
  if (note) svg.append('text').attr('x', W - 4).attr('y', 22).attr('text-anchor', 'end').attr('font-size', 24).attr('font-weight', 900).attr('fill', css('--c-stamp')).text(note.note);
  if (!REDUCED) {
    gsap.from(bars.selectAll('rect').nodes(), { scaleY: 0, transformOrigin: '50% 100%', duration: 0.9, ease: 'power3.out', stagger: 0.15, scrollTrigger: { trigger: el, start: 'top 80%', once: true } });
  }
}
