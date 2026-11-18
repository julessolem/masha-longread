// Доступ к содержимому: готовый HTML разделов (рендерится при сборке, см. vite-plugins/content.js),
// данные и источники.
import { HTML, SENTENCES } from 'virtual:content';
import SOURCES from '../../content/sources.json';
import DATA from '../../content/data.json';

export { SOURCES, DATA };

const byId = new Map(SOURCES.map((s) => [String(s.id), s]));
export const getSource = (id) => byId.get(String(id));

const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
export function fmtDate(d) {
  if (!d) return '';
  const [y, m, day] = String(d).split('-');
  if (day) return `${day}.${m}.${y}`;
  if (m) return `${MONTHS[Number(m) - 1]} ${y}`;
  return y;
}
export const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function renderMarkdown(file) {
  return HTML[file] ?? `<p class="missing">Файл content/${file} не найден</p>`;
}

/** Предложение из текста раздела по ключевому слову (для выносок) */
export function findSentence(file, word) {
  return (SENTENCES[file] || []).find((s) => s.includes(word)) || '';
}
