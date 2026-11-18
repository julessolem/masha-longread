// 01. Парадокс: split-screen с двумя счётчиками и ползунком-разделителем
import { renderMarkdown, DATA } from '../content/render.js';
import { t, u } from '../content/ui.js';
import { nodesFrom, prose, h, fnRefs, num } from '../ui/util.js';
import { counter } from '../ui/counter.js';
import { gsap, REDUCED } from '../ui/motion.js';

export function render(el) {
  const nodes = nodesFrom(renderMarkdown('01-zavyazka.md'));
  const head = nodes.findIndex((n) => n.tagName === 'H2');
  const nf = DATA.netflixDeal;
  const [p25, p26] = DATA.boxOfficeAbroadPartial;
  const change = Math.round((p26.value / p25.value - 1) * 100);
  const countries = parseInt(nf.countries, 10);
  const plus = /\+/.test(nf.countries) ? '+' : '';
  const seasons = nf.seasons.map((s) => `${s}-й`).join(' и ');

  const split = h(`
  <figure class="split" aria-label="${t('paradox.aria')}">
    <div class="split__side split__side--up">
      ${u('paradox.leftTag', { period: nf.period }, 'span', 'split__tag')}
      <span class="split__num" data-c="countries" data-path="netflixDeal.countries">${nf.countries}</span>
      <span class="split__cap">${u('paradox.leftCaption', { seasons })}${fnRefs([nf.sourceId, nf.seasonsSourceId])}</span>
    </div>
    <div class="split__side split__side--down">
      ${u('paradox.rightTag', { period: p26.period }, 'span', 'split__tag')}
      <span class="split__num" data-c="change" data-path="boxOfficeAbroadPartial.1.value">${change < 0 ? '−' : '+'}${Math.abs(change)}%</span>
      <span class="split__cap"><span data-path="boxOfficeAbroadPartial.0.value">$${num(p25.value)} млн</span> → <span data-path="boxOfficeAbroadPartial.1.value">$${num(p26.value)} млн</span>${fnRefs([p26.sourceId])}</span>
      ${u('paradox.rightSub', { period: p25.period }, 'span', 'split__sub')}
    </div>
    <input class="split__range" type="range" min="22" max="78" value="50" aria-label="${t('paradox.rangeAria')}">
    <div class="split__handle" aria-hidden="true"><span>⇆</span></div>
  </figure>`);
  const hint = h(`<p class="split__hint">${u('paradox.hint')}</p>`);

  const wrap = document.createElement('div');
  wrap.className = 'stop__inner';
  wrap.append(prose(nodes.slice(0, head + 1)), split, hint, prose(nodes.slice(head + 1)));
  el.append(wrap);
  return { split, countries, plus, change };
}

export function animate(el, { split, countries, plus, change }) {
  counter(split.querySelector('[data-c="countries"]'), countries, (v) => `${Math.round(v)}${plus}`);
  counter(split.querySelector('[data-c="change"]'), change, (v) => `${v < 0 ? '−' : ''}${Math.abs(Math.round(v))}%`);

  const range = split.querySelector('.split__range');
  const set = (v) => split.style.setProperty('--split', `${v}%`);
  range.addEventListener('input', () => set(range.value));

  // Подсказка: разделитель сам «качнётся» один раз при появлении
  if (!REDUCED) {
    const o = { v: 50 };
    gsap.timeline({ scrollTrigger: { trigger: split, start: 'top 70%', once: true }, delay: 1.2 })
      .to(o, { v: 62, duration: 0.6, ease: 'power2.inOut', onUpdate: () => set(o.v) })
      .to(o, { v: 40, duration: 0.7, ease: 'power2.inOut', onUpdate: () => set(o.v) })
      .to(o, { v: 50, duration: 0.5, ease: 'power2.out', onUpdate: () => set(o.v), onComplete: () => { range.value = 50; } });
  }
}
