// График сценариев 2023–2030: факт 2023 → значение сценария в 2030, пунктир цели
import { select } from 'd3-selection';
import { scaleLinear } from 'd3-scale';
import { line as d3line, curveMonotoneX } from 'd3-shape';
import { interpolate } from 'd3-interpolate';
import { gsap, REDUCED, isMobile } from '../ui/motion.js';
import { DATA } from '../content/render.js';
import { num } from '../ui/util.js';

const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const YEARS = [2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030];

export function scenarioChart(el, list, initial) {
  const narrow = isMobile();
  const W = narrow ? 420 : 900; const H = narrow ? 320 : 420;
  const m = { t: 30, r: narrow ? 20 : 40, b: 40, l: narrow ? 42 : 56 };
  const start = DATA.animationAbroad2023.value;
  const target = DATA.animationTarget2030.value;
  const vmax = Math.max(target, ...list.map((s) => s['2030'])) * 1.15;
  const x = scaleLinear().domain([2023, 2030]).range([m.l, W - m.r]);
  const y = scaleLinear().domain([0, vmax]).range([H - m.b, m.t]);
  const svg = select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('aria-hidden', 'true');
  const fs = 15;

  // Зона прогноза
  const defs = svg.append('defs');
  defs.append('pattern').attr('id', 'hatch').attr('width', 9).attr('height', 9).attr('patternUnits', 'userSpaceOnUse').attr('patternTransform', 'rotate(45)')
    .append('line').attr('y2', 9).attr('stroke', css('--c-route')).attr('stroke-opacity', 0.12).attr('stroke-width', 3);
  svg.append('rect').attr('x', x(2023.2)).attr('y', m.t).attr('width', x(2030) - x(2023.2)).attr('height', H - m.t - m.b).attr('fill', 'url(#hatch)');
  svg.append('text').attr('class', 'forecast-label').attr('x', x(2030) - 8).attr('y', H - m.b - 12).attr('text-anchor', 'end').attr('font-size', narrow ? 13 : 15).text('Прогноз автора, не данные');

  y.ticks(5).forEach((t) => {
    svg.append('line').attr('class', 'gridline').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(t)).attr('y2', y(t));
    svg.append('text').attr('x', m.l - 8).attr('y', y(t) + 5).attr('text-anchor', 'end').attr('font-size', fs).attr('fill', css('--c-ink-soft')).text(`$${t}`);
  });
  YEARS.filter((yr) => !narrow || yr % 2 === 1 || yr === 2030).forEach((yr) => svg.append('text').attr('x', x(yr)).attr('y', H - 12).attr('text-anchor', 'middle').attr('font-size', fs).attr('fill', css('--c-ink-soft')).text(yr));

  // Цель 2030
  svg.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(target)).attr('y2', y(target)).attr('stroke', css('--c-passport')).attr('stroke-width', 2).attr('stroke-dasharray', '3 6');
  svg.append('text').attr('x', m.l + 8).attr('y', y(target) - 9).attr('font-size', fs).attr('font-weight', 700).attr('fill', css('--c-passport')).text(`Цель к 2030: $${num(target)} млн`);

  // Линия сценария: прямая от факта 2023 к значению 2030 (промежуточных значений в data.json нет —
  // точки по годам нужны только для плавного морфинга линии)
  const pts = (v) => YEARS.map((yr, i) => ({ yr, v: start + (v - start) * (i / (YEARS.length - 1)) }));
  const gen = d3line().x((d) => x(d.yr)).y((d) => y(d.v)).curve(curveMonotoneX);
  const path = svg.append('path').attr('fill', 'none').attr('stroke', css('--c-route')).attr('stroke-width', 4).attr('stroke-dasharray', '10 7').attr('stroke-linecap', 'round');
  const endDot = svg.append('circle').attr('r', 7).attr('fill', css('--c-paper')).attr('stroke', css('--c-route')).attr('stroke-width', 3);
  const endLbl = svg.append('text').attr('text-anchor', 'end').attr('font-size', narrow ? 16 : 17).attr('font-weight', 800).attr('fill', css('--c-route'));
  svg.append('circle').attr('cx', x(2023)).attr('cy', y(start)).attr('r', 7).attr('fill', css('--c-ink')).attr('stroke', css('--c-paper')).attr('stroke-width', 3);
  svg.append('text').attr('x', x(2023) + 12).attr('y', y(start) + 24).attr('font-size', fs).attr('font-weight', 800).text(`2023: $${num(start)} млн — факт`);

  let cur = list.find((s) => s.key === initial)['2030'];
  const place = (v) => {
    path.attr('d', gen(pts(v)));
    endDot.attr('cx', x(2030)).attr('cy', y(v));
    endLbl.attr('x', x(2030) - 12).attr('y', y(v) - 14).text(`2030: $${num(v)} млн`);
  };
  place(cur);
  if (!REDUCED) {
    gsap.from(path.node(), { opacity: 0, duration: 0.8, scrollTrigger: { trigger: el, start: 'top 75%', once: true } });
  }

  return {
    set(key) {
      const to = list.find((s) => s.key === key)['2030'];
      if (REDUCED) { cur = to; place(to); return; }
      const i = interpolate(cur, to);
      const o = { k: 0 };
      gsap.to(o, { k: 1, duration: 0.9, ease: 'power3.inOut', onUpdate: () => place(i(o.k)), onComplete: () => { cur = to; } });
    },
  };
}
