// Превращает .md-файлы из content/ в HTML.
// Сноски [^N] → кликабельные номера источников из sources.json.
// Текст не меняется: добавляются только неразрывные пробелы (типографика).
import MarkdownIt from 'markdown-it';
import footnote from 'markdown-it-footnote';
import SOURCES from '../../content/sources.json';
import DATA from '../../content/data.json';

export { SOURCES, DATA };

const FILES = import.meta.glob('../../content/*.md', { query: '?raw', import: 'default', eager: true });
export const RAW = Object.fromEntries(Object.entries(FILES).map(([k, v]) => [k.split('/').pop(), v]));

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

// ---------- markdown-it ----------
const md = new MarkdownIt({ html: false, linkify: false, typographer: false }).use(footnote);

// Номер сноски = id источника (а не порядковый номер, как по умолчанию)
md.renderer.rules.footnote_ref = (tokens, idx) => {
  const id = tokens[idx].meta.label;
  const s = getSource(id);
  const label = s ? `Источник ${id}: ${s.outlet}, ${fmtDate(s.date)}` : `Источник ${id} не найден в sources.json`;
  return `<sup class="fn"><a href="#src-${id}" data-src="${id}" aria-label="${escapeHtml(label)}">${id}</a></sup>`;
};

// Картинки из .md: ленивая загрузка и асинхронное декодирование
const defaultImage = md.renderer.rules.image;
md.renderer.rules.image = (tokens, idx, options, env, self) => {
  tokens[idx].attrSet('loading', 'lazy');
  tokens[idx].attrSet('decoding', 'async');
  return defaultImage(tokens, idx, options, env, self);
};

// Неразрывные пробелы: после коротких слов и между числом и единицей
const SHORT = /(^|[\s(«])(в|во|и|а|с|со|к|ко|о|об|у|на|не|ни|по|за|из|от|до|для|без|при|про|что|как|но|же|ли|—)\s+/gi;
const UNIT = /(\d)\s+(млн|млрд|тыс|%|руб|года?|году|часов|стран|языков|экранах|территорий)/g;
const nbsp = (t) => t.replace(SHORT, (m, a, w) => `${a}${w} `).replace(SHORT, (m, a, w) => `${a}${w} `)
  .replace(UNIT, '$1 $2').replace(/ —/g, ' —');
md.core.ruler.push('nbsp', (state) => {
  for (const t of state.tokens) {
    if (t.type !== 'inline' || !t.children) continue;
    for (const c of t.children) if (c.type === 'text') c.content = nbsp(c.content);
  }
});

/**
 * Рендер одного файла.
 * В dev-режиме к абзацам и заголовкам добавляются data-md / data-lines — по ним
 * режим редактирования знает, какие строки .md переписать.
 */
export function renderMarkdown(file) {
  const src = RAW[file];
  if (src == null) return `<p class="missing">Файл content/${file} не найден</p>`;
  // Определения сносок генерируются из sources.json и дописываются в конец,
  // поэтому номера строк исходного текста не меняются.
  const defs = SOURCES.map((s) => `[^${s.id}]: ${s.outlet}`).join('\n');
  const env = {};
  let tokens = md.parse(`${src}\n\n${defs}\n`, env);
  const cut = tokens.findIndex((t) => t.type === 'footnote_block_open');
  if (cut >= 0) tokens = tokens.slice(0, cut);
  if (import.meta.env.DEV) {
    for (const t of tokens) {
      if ((t.type === 'paragraph_open' || t.type === 'heading_open') && t.map) {
        t.attrSet('data-md', file);
        t.attrSet('data-lines', `${t.map[0]}-${t.map[1]}`);
        if (t.type === 'heading_open') t.attrSet('data-prefix', `${t.markup} `);
      }
    }
  }
  return md.renderer.render(tokens, md.options, env);
}

/** Извлечь предложение из исходного .md по ключевому слову (для выносок) */
export function findSentence(file, word) {
  const text = RAW[file] || '';
  const para = text.split(/\n\s*\n/).find((p) => p.includes(word)) || '';
  const sentences = para.match(/[^.!?]+[.!?]+(\[\^\d+\])*/g) || [];
  const s = sentences.find((x) => x.includes(word)) || '';
  return md.renderInline(nbsp(s.trim()), { footnotes: { refs: {} } })
    .replace(/\[\^(\d+)\]/g, (m, id) => md.renderer.rules.footnote_ref([{ meta: { label: id } }], 0));
}
