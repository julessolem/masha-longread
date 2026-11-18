// 05. Почему Маша проходит границы: сравнение озвучек, карточки-флипы, «печатающаяся» цитата
import { renderMarkdown, findSentence, DATA, getSource, fmtDate, escapeHtml } from '../content/render.js';
import MEDIA from '../../content/media.json';
import { nodesFrom, prose, h, fnRefs } from '../ui/util.js';
import { gsap, REDUCED, onEnter } from '../ui/motion.js';

// Подписи к цифрам из data.json → masha (интерфейсный текст)
const LABELS = {
  countries: 'стран, где транслируют сериал',
  languages: 'языков дубляжа',
  youtubeSubsRu: 'подписчиков YouTube-канала с русской озвучкой',
  youtubeSubsEn: 'подписчиков англоязычного канала',
};

export function render(el) {
  const nodes = nodesFrom(renderMarkdown('05-lokalizatsiya.md'));
  const paras = nodes.filter((n) => n.tagName === 'P');
  const head = nodes.filter((n) => n.tagName !== 'P');
  const base = import.meta.env.BASE_URL;

  // Выноска: предложение с цитатой Бырдина из текста раздела (дублирует абзац, поэтому скрыта от читалок)
  const quote = h(`<aside class="typed" aria-hidden="true"><p class="typed__text">${findSentence('05-lokalizatsiya.md', 'Бырдин')}</p></aside>`);
  quote.querySelectorAll('a').forEach((a) => a.setAttribute('tabindex', '-1'));

  const dub = h(`
  <figure class="dub">
    <figcaption class="figure__title">Сравните озвучки: один фрагмент на разных языках</figcaption>
    <div class="tabs" role="tablist" aria-label="Язык озвучки">
      ${MEDIA.dub.map((d, i) => `<button type="button" class="btn" role="tab" id="dub-tab-${i}" aria-selected="${i === 0}" aria-controls="dub-panel-${i}" tabindex="${i === 0 ? 0 : -1}" lang="${d.lang.toLowerCase()}">${d.lang}<span class="sr-only"> — ${d.label}</span></button>`).join('')}
    </div>
    ${MEDIA.dub.map((d, i) => `
    <div class="dub__panel" role="tabpanel" id="dub-panel-${i}" aria-labelledby="dub-tab-${i}" ${i ? 'hidden' : ''}>
      <div class="dub__screen">
        ${d.ready
          ? `<video controls preload="none" playsinline ${d.poster ? `poster="${base}${d.poster}"` : ''} aria-label="Фрагмент «Маши и Медведя», озвучка: ${escapeHtml(d.label)}"><source src="${base}${d.file}" type="video/mp4"></video>`
          : `<div class="dub__empty"><span class="dub__lang" lang="${d.lang.toLowerCase()}">${d.lang}</span><span class="dub__wave" aria-hidden="true">${'<i></i>'.repeat(14)}</span><span>Здесь будет фрагмент с озвучкой «${escapeHtml(d.label)}»</span><code>public/${d.file}</code></div>`}
      </div>
      <p class="dub__cap">Фрагмент приведён в информационных целях. Источник: ${escapeHtml(d.source || 'TODO')}.</p>
    </div>`).join('')}
  </figure>`);

  const flips = h(`<div class="flips" role="list">${Object.entries(DATA.masha).filter(([k]) => LABELS[k]).map(([k, v]) => {
    const s = getSource(v.sourceId);
    return `<div role="listitem"><button type="button" class="flip" aria-pressed="false">
      <span class="flip__inner">
        <span class="flip__face flip__front"><span class="flip__num">${escapeHtml(v.value)}</span><span class="flip__label">${LABELS[k]}</span><span class="flip__more" aria-hidden="true">нажмите, чтобы перевернуть ↻</span></span>
        <span class="flip__face flip__back">${v.note ? `<b>${escapeHtml(v.note[0].toUpperCase() + v.note.slice(1))}</b>` : ''}<span>Источник: ${s ? `${escapeHtml(s.outlet)}, ${fmtDate(s.date)}` : `№${v.sourceId}`}</span></span>
      </span></button>${fnRefs(v.sourceId)}</div>`;
  }).join('')}</div>`);

  // Порядок: вступление, абзац с Бырдиным → выноска и озвучки → абзац с цифрами → флипы → остальное
  const byrdin = paras.findIndex((p) => p.textContent.includes('Бырдин'));
  const numbers = paras.findIndex((p) => p.textContent.includes('25 языков') || p.textContent.includes('языков'));
  const inner = document.createElement('div');
  inner.className = 'stop__inner';
  inner.append(
    prose([...head, ...paras.slice(0, byrdin + 1)]), quote, dub,
    prose(paras.slice(byrdin + 1, numbers + 1)), flips,
    prose(paras.slice(numbers + 1)),
  );
  el.append(inner);
  return { quote, dub, flips };
}

export function animate(el, { quote, dub, flips }) {
  // Вкладки озвучек
  const tabs = [...dub.querySelectorAll('[role="tab"]')];
  const select = (t, focus) => {
    tabs.forEach((x) => {
      const on = x === t;
      x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(x.getAttribute('aria-controls'));
      panel.hidden = !on;
      if (!on) panel.querySelector('video')?.pause();
      if (on && !REDUCED) gsap.fromTo(panel, { opacity: 0 }, { opacity: 1, duration: 0.35 });
    });
    if (focus) t.focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (d) { e.preventDefault(); select(tabs[(i + d + tabs.length) % tabs.length], true); }
    });
  });

  // «Звуковая волна» в пустом слоте анимируется только на экране
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => dub.classList.toggle('is-on', e.isIntersecting)).observe(dub);
  }

  // Флипы
  flips.querySelectorAll('.flip').forEach((b) => b.addEventListener('click', () => b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'))));
  if (!REDUCED) gsap.from(flips.children, { opacity: 0, y: 30, duration: 0.8, stagger: 0.1, ease: 'power3.out', scrollTrigger: { trigger: flips, start: 'top 85%', once: true } });

  // «Печатание» цитаты: слова проявляются по одному, за ними бежит курсор
  const p = quote.querySelector('.typed__text');
  const words = splitWords(p);
  if (REDUCED) { p.classList.add('no-anim'); return; }
  const caret = document.createElement('span');
  caret.className = 'typed__caret';
  p.append(caret);
  onEnter(quote, () => {
    gsap.to(words, {
      opacity: 1, duration: 0.01, stagger: 0.055, ease: 'none',
      onComplete: () => p.classList.add('is-done'),
    });
  }, { start: 'top 70%' });
}

/** Обернуть каждое слово текстовых узлов в span.w (сноски остаются как есть) */
function splitWords(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const texts = [];
  while (walker.nextNode()) if (!walker.currentNode.parentElement.closest('.fn')) texts.push(walker.currentNode);
  const out = [];
  texts.forEach((t) => {
    const frag = document.createDocumentFragment();
    t.textContent.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) { frag.append(part); return; }
      const s = document.createElement('span'); s.className = 'w'; s.textContent = part; frag.append(s); out.push(s);
    });
    t.replaceWith(frag);
  });
  root.querySelectorAll('.fn').forEach((f) => { f.classList.add('w'); out.push(f); });
  return out;
}
