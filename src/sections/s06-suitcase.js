// 06. Чемодан денег: крышка открывается при скролле, внутри — treemap
// «мерч / касса / права и стриминг». Доля мерча — из data.json → masha.merchShare.
import { renderMarkdown, DATA } from '../content/render.js';
import { nodesFrom, prose, h, fnRefs } from '../ui/util.js';
import { gsap, REDUCED, isMobile } from '../ui/motion.js';
import { t, u } from '../content/ui.js';

export function render(el) {
  const nodes = nodesFrom(renderMarkdown('06-chemodan.md'));
  const paras = nodes.filter((n) => n.tagName === 'P');
  const head = nodes.filter((n) => n.tagName !== 'P');
  const merch = DATA.masha.merchShare;
  const m = Math.round(merch.value * 100);

  const fig = h(`
  <figure class="suitcase">
    <figcaption class="figure__title" data-ui="suitcase.title">${t('suitcase.title', { note: merch.note })}</figcaption>
    <div class="case">
      <div class="case__handle" aria-hidden="true"></div>
      <div class="case__body">
        <div class="case__lid" aria-hidden="true"><span>${u('suitcase.lidTop')}<br>${u('suitcase.lidBottom')}</span></div>
        <div class="treemap" style="--merch: ${m}%">
          <button type="button" class="cell cell--merch" aria-pressed="false" data-k="merch">
            <span class="cell__val" data-path="masha.merchShare.value">≈${m}%</span>${u('suitcase.merch', {}, 'span', 'cell__name')}
          </button>
          <div class="treemap__col">
            <button type="button" class="cell cell--part" aria-pressed="false" data-k="box">
              ${u('suitcase.box', {}, 'span', 'cell__name')}${u('suitcase.partNote', {}, 'span', 'cell__note')}
            </button>
            <button type="button" class="cell cell--part" aria-pressed="false" data-k="rights">
              ${u('suitcase.rights', {}, 'span', 'cell__name')}${u('suitcase.partNote', {}, 'span', 'cell__note')}
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="case__info" aria-live="polite"><p>${u('suitcase.hint')}</p></div>
    <p class="figure__note"><span data-ui="suitcase.note">${t('suitcase.note', { merch: m, content: 100 - m })}</span>${fnRefs(merch.sourceId)}</p>
  </figure>`);

  const inner = document.createElement('div');
  inner.className = 'stop__inner';
  inner.append(prose([...head, ...paras.slice(0, 2)]), fig, prose(paras.slice(2)));
  el.append(inner);
  return { fig, m };
}

export function animate(el, { fig, m }) {
  const info = fig.querySelector('.case__info');
  const vars = { merch: m, content: 100 - m };
  const TEXT = { merch: 'suitcase.infoMerch', box: 'suitcase.infoBox', rights: 'suitcase.infoRights' };
  const cells = [...fig.querySelectorAll('.cell')];
  cells.forEach((c) => c.addEventListener('click', () => {
    cells.forEach((x) => x.setAttribute('aria-pressed', String(x === c)));
    info.innerHTML = `<p data-ui="${TEXT[c.dataset.k]}">${t(TEXT[c.dataset.k], vars)}</p>`;
  }));

  const lid = fig.querySelector('.case__lid');
  if (REDUCED) { lid.hidden = true; return; }
  // Крышка откидывается (rotateX) синхронно со скроллом, ячейки «выпрыгивают»
  const tl = gsap.timeline({
    scrollTrigger: { trigger: fig.querySelector('.case'), start: 'top 75%', end: isMobile() ? 'top 35%' : 'top 25%', scrub: 0.5 },
  });
  tl.to(lid, { rotationX: 104, transformPerspective: 1400, ease: 'power2.in', duration: 1 })
    .to(lid, { opacity: 0, duration: 0.2 }, 0.8)
    .from(cells, { y: 40, opacity: 0, scale: 0.9, stagger: 0.12, duration: 0.5, ease: 'back.out(1.6)' }, 0.45);
}
