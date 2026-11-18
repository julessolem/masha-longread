// Пончик «≈⅔ кассы — анимация»: сегмент вырастает при появлении
import { select } from 'd3-selection';
import { arc as d3arc } from 'd3-shape';
import { gsap, REDUCED } from '../ui/motion.js';
import { t } from '../content/ui.js';

const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

/** Человекочитаемая дробь для доли: 0.67 → «⅔» */
function fraction(v) {
  const F = [[1 / 2, '½'], [1 / 3, '⅓'], [2 / 3, '⅔'], [1 / 4, '¼'], [3 / 4, '¾'], [3 / 5, '⅗'], [2 / 5, '⅖']];
  const best = F.reduce((a, b) => (Math.abs(b[0] - v) < Math.abs(a[0] - v) ? b : a));
  return Math.abs(best[0] - v) < 0.02 ? best[1] : `${Math.round(v * 100)}%`;
}

export function donutChart(el, share) {
  const S = 300; const r = S / 2;
  const svg = select(el).append('svg').attr('viewBox', `0 0 ${S} ${S}`).attr('aria-hidden', 'true');
  const g = svg.append('g').attr('transform', `translate(${r},${r})`);
  const a = d3arc().innerRadius(r * 0.6).outerRadius(r - 4).cornerRadius(4);
  const TAU = Math.PI * 2;
  g.append('path').attr('d', a({ startAngle: 0, endAngle: TAU })).attr('fill', css('--c-other'));
  const seg = g.append('path').attr('fill', css('--c-anim')).attr('data-path', 'animationShareOfForeignBoxOffice.value');
  g.append('text').attr('text-anchor', 'middle').attr('y', 10).attr('font-size', 64).attr('font-weight', 850).attr('fill', css('--c-anim-text')).text(`≈${fraction(share)}`);
  g.append('text').attr('text-anchor', 'middle').attr('y', 44).attr('font-size', 18).attr('fill', css('--c-ink-soft')).attr('data-ui', 'who.donutCenter').text(t('who.donutCenter'));
  const draw = (k) => seg.attr('d', a({ startAngle: 0, endAngle: TAU * share * k, padAngle: 0 }));
  if (REDUCED) { draw(1); return; }
  draw(0);
  const o = { k: 0 };
  gsap.to(o, { k: 1, duration: 1.4, ease: 'power3.out', onUpdate: () => draw(o.k), scrollTrigger: { trigger: el, start: 'top 75%', once: true } });
}
