// Топ-5: горизонтальные столбцы, анимация выделена цветом, переключатель «только анимация»
import { select } from 'd3-selection';
import { scaleLinear } from 'd3-scale';
import { max } from 'd3-array';
import { gsap, REDUCED, dur, isMobile } from '../ui/motion.js';
import { num } from '../ui/util.js';

const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

export function barsChart(el, data, toggle) {
  const W = isMobile() ? 420 : 600; const row = 66; const H = data.length * row;
  const x = scaleLinear().domain([0, max(data, (d) => d.value)]).range([0, W - 110]);
  const svg = select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('aria-hidden', 'true');
  const rows = svg.selectAll('g').data(data).join('g').attr('class', 'bar-row');
  rows.append('text').attr('y', 20).attr('font-size', 19).attr('font-weight', 600).text((d) => d.title);
  rows.append('rect').attr('class', 'bar').attr('y', 30).attr('height', 24).attr('rx', 4).attr('width', (d) => x(d.value))
    .attr('fill', (d) => (d.animation ? css('--c-anim') : css('--c-other')));
  rows.append('text').attr('x', (d) => x(d.value) + 10).attr('y', 49).attr('font-size', 19).attr('font-weight', 800)
    .attr('fill', (d) => (d.animation ? css('--c-anim-text') : css('--c-ink'))).text((d) => `$${num(d.value)} млн`);

  const nodes = rows.nodes();
  const layout = (onlyAnim, instant = false) => {
    let i = 0;
    nodes.forEach((n, k) => {
      const show = !onlyAnim || data[k].animation;
      gsap.to(n, { y: (show ? i : i - 0.5) * row, opacity: show ? 1 : 0, duration: instant || REDUCED ? 0 : dur('base'), ease: 'power3.inOut' });
      if (show) i++;
    });
  };
  layout(false, true);

  // Столбцы вырастают при появлении (transform: scaleX)
  if (!REDUCED) {
    const bars = svg.selectAll('rect.bar').nodes();
    gsap.set(bars, { transformOrigin: '0% 50%' });
    gsap.from(bars, { scaleX: 0, duration: 1, ease: 'power3.out', stagger: 0.1, scrollTrigger: { trigger: el, start: 'top 80%', once: true } });
  }

  toggle.addEventListener('click', () => {
    const on = toggle.getAttribute('aria-pressed') !== 'true';
    toggle.setAttribute('aria-pressed', String(on));
    layout(on);
  });
}
