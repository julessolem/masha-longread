// Подписи интерфейса из content/ui.json.
//   t('who.toggle')                    → «Только анимация»
//   t('map.latamText', { sum: '$1,5' }) → подстановка {sum}
//   u('who.toggle')                    → <span data-ui="who.toggle">Только анимация</span>
// Атрибут data-ui нужен режиму редактирования: по нему он знает, какой ключ ui.json менять.
import UI from '../../content/ui.json';

export { UI };

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function get(key) {
  return key.split('.').reduce((o, k) => (o == null ? o : o[k]), UI);
}

/** Текст подписи с подстановкой {переменных}. Если ключа нет — видимая метка ⟨ключ⟩. */
export function t(key, vars = {}) {
  const v = get(key);
  if (typeof v !== 'string') return `⟨${key}⟩`;
  return v.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
}

/** HTML-обёртка с меткой ключа для режима редактирования */
export function u(key, vars = {}, tag = 'span', cls = '') {
  return `<${tag} data-ui="${key}"${cls ? ` class="${cls}"` : ''}>${esc(t(key, vars))}</${tag}>`;
}
