// Источники: пронумерованный список из content/sources.json
import { SOURCES, fmtDate, escapeHtml } from '../content/render.js';
import { u, t } from '../content/ui.js';

export function render(el) {
  const items = [...SOURCES].sort((a, b) => a.id - b.id).map((s) => {
    const host = (() => { try { return new URL(s.url).hostname.replace(/^www\./, ''); } catch { return 'ссылка'; } })();
    return `<li id="src-${s.id}">
      <span class="sources__n">${s.id}.</span>
      <div>
        <div class="sources__title" data-path="src:${SOURCES.indexOf(s)}.title">${escapeHtml(s.title)}</div>
        <div class="sources__meta"><span data-path="src:${SOURCES.indexOf(s)}.outlet">${escapeHtml(s.outlet)}</span>, <span data-path="src:${SOURCES.indexOf(s)}.date">${escapeHtml(fmtDate(s.date))}</span></div>
        <a href="${escapeHtml(s.url)}" rel="noopener noreferrer" target="_blank">${escapeHtml(host)}<span class="sr-only"> ${escapeHtml(t('sources.newTab'))}</span></a> <span class="edit-only" data-path="src:${SOURCES.indexOf(s)}.url">✎ ссылка</span>
      </div>
    </li>`;
  }).join('');
  el.innerHTML = `
    <div class="prose"><p class="stop__code" aria-hidden="true">${u('sources.kicker')}</p><h2 id="s9-h">${u('sources.title')}</h2></div>
    <ol class="sources__list">${items}</ol>
    <p class="sources__note">${u('sources.note')}</p>`;
  return {};
}
