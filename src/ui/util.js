// Мелкие помощники
import { getSource, fmtDate, escapeHtml } from '../content/render.js';

export const h = (html) => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};

/** Число по-русски: 2,8 */
export const num = (v, d = 1) => Number(v).toLocaleString('ru-RU', { maximumFractionDigits: d, minimumFractionDigits: 0 });

/** «$2,8 млн» / «$613 тыс.» */
export const usd = (v, unit = 'млн $') => {
  if (unit !== 'млн $') return `${num(v)} ${unit}`;
  return v < 1 ? `$${num(v * 1000, 0)} тыс.` : `$${num(v, 2)} млн`;
};

/** Сноска-ссылка по id источника (та же разметка, что у [^N] в тексте) */
export function fnRef(id) {
  if (id == null) return '';
  const s = getSource(id);
  const label = s ? `Источник ${id}: ${s.outlet}, ${fmtDate(s.date)}` : `Источник ${id}`;
  return `<sup class="fn"><a href="#src-${id}" data-src="${id}" aria-label="${escapeHtml(label)}">${id}</a></sup>`;
}
export const fnRefs = (ids) => [...new Set([].concat(ids).filter((x) => x != null))].sort((a, b) => a - b).map(fnRef).join('');

/** Разбить отрендеренный HTML раздела на узлы */
export function nodesFrom(html) {
  const t = document.createElement('template');
  t.innerHTML = html;
  return [...t.content.children];
}

/** Обёртка .prose для набора узлов */
export function prose(nodes) {
  const d = document.createElement('div');
  d.className = 'prose';
  nodes.forEach((n) => d.append(n));
  return d;
}
