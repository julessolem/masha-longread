// Рендер Markdown → HTML (выполняется в Node при сборке и в dev-сервере, в браузер не попадает).
// Сноски [^N] → номер источника из sources.json. Текст не меняется: добавляются только неразрывные пробелы.
import MarkdownIt from 'markdown-it';
import footnote from 'markdown-it-footnote';

const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
export function fmtDate(d) {
  if (!d) return '';
  const [y, m, day] = String(d).split('-');
  if (day) return `${day}.${m}.${y}`;
  if (m) return `${MONTHS[Number(m) - 1]} ${y}`;
  return y;
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SHORT = /(^|[\s(«])(в|во|и|а|с|со|к|ко|о|об|у|на|не|ни|по|за|из|от|до|для|без|при|про|что|как|но|же|ли|—)\s+/gi;
const UNIT = /(\d)\s+(млн|млрд|тыс|%|руб|года?|году|часов|стран|языков|экранах|территорий)/g;
export const nbsp = (t) => t.replace(SHORT, (m, a, w) => `${a}${w} `).replace(SHORT, (m, a, w) => `${a}${w} `)
  .replace(UNIT, '$1 $2').replace(/ —/g, ' —');

export function createRenderer(sources, { dev = false } = {}) {
  const byId = new Map(sources.map((s) => [String(s.id), s]));
  const md = new MarkdownIt({ html: false, linkify: false, typographer: false }).use(footnote);
  const fnRef = (id) => {
    const s = byId.get(String(id));
    const label = s ? `Источник ${id}: ${s.outlet}, ${fmtDate(s.date)}` : `Источник ${id} не найден в sources.json`;
    return `<sup class="fn"><a href="#src-${id}" data-src="${id}" aria-label="${esc(label)}">${id}</a></sup>`;
  };
  md.renderer.rules.footnote_ref = (tokens, idx) => fnRef(tokens[idx].meta.label);
  const defaultImage = md.renderer.rules.image;
  md.renderer.rules.image = (tokens, idx, o, env, self) => {
    tokens[idx].attrSet('loading', 'lazy');
    tokens[idx].attrSet('decoding', 'async');
    return defaultImage(tokens, idx, o, env, self);
  };
  md.core.ruler.push('nbsp', (state) => {
    for (const t of state.tokens) if (t.type === 'inline' && t.children) for (const c of t.children) if (c.type === 'text') c.content = nbsp(c.content);
  });
  const defs = sources.map((s) => `[^${s.id}]: ${s.outlet}`).join('\n');

  /** Файл целиком. В dev к абзацам и заголовкам добавляются data-md/data-lines для режима редактирования. */
  function render(file, src) {
    const env = {};
    let tokens = md.parse(`${src}\n\n${defs}\n`, env);
    const cut = tokens.findIndex((t) => t.type === 'footnote_block_open');
    if (cut >= 0) tokens = tokens.slice(0, cut);
    if (dev) {
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

  /** Все предложения файла (для выносок-цитат) */
  function sentences(src) {
    const out = [];
    src.split(/\n\s*\n/).forEach((para) => {
      if (/^\s*#/.test(para)) return;
      (para.replace(/\s*\n\s*/g, ' ').match(/[^.!?]+[.!?]+(\[\^\d+\])*/g) || []).forEach((s) => {
        const html = md.renderInline(nbsp(s.trim())).replace(/\[\^(\d+)\]/g, (m, id) => fnRef(id));
        out.push(html);
      });
    });
    return out;
  }

  return { render, sentences };
}
