// Источники: пронумерованный список из content/sources.json
import { SOURCES, fmtDate, escapeHtml } from '../content/render.js';

export function render(el) {
  const items = [...SOURCES].sort((a, b) => a.id - b.id).map((s) => {
    const host = (() => { try { return new URL(s.url).hostname.replace(/^www\./, ''); } catch { return 'ссылка'; } })();
    return `<li id="src-${s.id}">
      <span class="sources__n">${s.id}.</span>
      <div>
        <div class="sources__title">${escapeHtml(s.title)}</div>
        <div class="sources__meta">${escapeHtml(s.outlet)}, ${escapeHtml(fmtDate(s.date))}</div>
        <a href="${escapeHtml(s.url)}" rel="noopener noreferrer" target="_blank">${escapeHtml(host)}<span class="sr-only"> (откроется в новой вкладке)</span></a>
      </div>
    </li>`;
  }).join('');
  el.innerHTML = `
    <div class="prose"><p class="stop__code" aria-hidden="true">Остановка 09</p><h2 id="s9-h">Источники</h2></div>
    <ol class="sources__list">${items}</ol>
    <p class="sources__note">Видеофрагменты приведены в информационных целях. Карта — Natural Earth (общественное достояние) через world-atlas. Шрифты Google Sans Flex, Roboto Flex и PT Mono распространяются по лицензии SIL Open Font License.</p>`;
  return {};
}
