// 06. Чемодан денег: крышка открывается при скролле, внутри — treemap
// «мерч / касса / права и стриминг». Доля мерча — из data.json → masha.merchShare.
import { renderMarkdown, DATA } from '../content/render.js';
import { nodesFrom, prose, h, fnRefs } from '../ui/util.js';
import { gsap, REDUCED, isMobile } from '../ui/motion.js';

export function render(el) {
  const nodes = nodesFrom(renderMarkdown('06-chemodan.md'));
  const paras = nodes.filter((n) => n.tagName === 'P');
  const head = nodes.filter((n) => n.tagName !== 'P');
  const merch = DATA.masha.merchShare;
  const m = Math.round(merch.value * 100);

  const fig = h(`
  <figure class="suitcase">
    <figcaption class="figure__title">Из чего состоит доход анимационного бренда: Animaccord, ${merch.note}</figcaption>
    <div class="case">
      <div class="case__handle" aria-hidden="true"></div>
      <div class="case__body">
        <div class="case__lid" aria-hidden="true"><span>Багаж · МАША<br>MOW → МИР</span></div>
        <div class="treemap" style="--merch: ${m}%">
          <button type="button" class="cell cell--merch" aria-pressed="false" data-k="merch">
            <span class="cell__val">≈${m}%</span><span class="cell__name">Мерч и лицензии на товары</span>
          </button>
          <div class="treemap__col">
            <button type="button" class="cell cell--part" aria-pressed="false" data-k="box">
              <span class="cell__name">Касса</span><span class="cell__note">часть «контента»</span>
            </button>
            <button type="button" class="cell cell--part" aria-pressed="false" data-k="rights">
              <span class="cell__name">Права, ТВ и стриминг</span><span class="cell__note">часть «контента»</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="case__info" aria-live="polite"><p>Нажмите на отделение чемодана.</p></div>
    <p class="figure__note">Оценка Bloomberg, 2015: мерч ≈${m}%, контент ≈${100 - m}%. Как «контент» делится между кассой и продажей прав, не раскрывается — поэтому эти две ячейки показаны условно, поровну.${fnRefs(merch.sourceId)}</p>
  </figure>`);

  const inner = document.createElement('div');
  inner.className = 'stop__inner';
  inner.append(prose([...head, ...paras.slice(0, 2)]), fig, prose(paras.slice(2)));
  el.append(inner);
  return { fig, m };
}

export function animate(el, { fig, m }) {
  const info = fig.querySelector('.case__info');
  const TEXT = {
    merch: `Около ${m}% доходов компании — лицензионные товары (оценка Bloomberg, 2015).`,
    box: `Касса — видимая «верхушка»: вместе с продажей прав она даёт около ${100 - m}% доходов. Точная доля кассы не раскрывается.`,
    rights: `Продажа прав телеканалам и стримингам — вторая часть «контента» (≈${100 - m}% вместе с кассой). Отдельной цифры нет.`,
  };
  const cells = [...fig.querySelectorAll('.cell')];
  cells.forEach((c) => c.addEventListener('click', () => {
    cells.forEach((x) => x.setAttribute('aria-pressed', String(x === c)));
    info.innerHTML = `<p>${TEXT[c.dataset.k]}</p>`;
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
