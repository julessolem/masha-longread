// Режим редактирования (?edit=1, только `npm run dev`).
//
// • Абзацы и заголовки из .md — правятся прямо на странице.
// • Подписи интерфейса (ui.json) — простые правятся на странице, остальные (на кнопках, в графиках,
//   с подстановками {…}) — в панели справа.
// • Цифры (data.json), видео (media.json), источники (sources.json) — в панели.
// • «Выбор элементов»: щелчок по цифре, столбику, стране, кнопке открывает её поле в панели.
// «Сохранить» записывает всё в файлы content/ через dev-эндпоинты (vite-plugins/content-edit.js).
import DATA from '../../content/data.json';
import UI from '../../content/ui.json';
import MEDIA from '../../content/media.json';
import SOURCES from '../../content/sources.json';

const FILES = {
  'data.json': { title: 'Цифры', json: DATA },
  'ui.json': { title: 'Подписи', json: UI },
  'media.json': { title: 'Видео', json: MEDIA },
  'sources.json': { title: 'Источники', json: SOURCES },
};
const NAME_KEYS = ['title', 'country', 'period', 'label', 'lang', 'outlet', 'key'];
const getIn = (obj, path) => path.reduce((o, k) => (o == null ? o : o[k]), obj);

/** data-path="top5Abroad2024.0.value" | "media:dub.0.lang" | "src:3.title" → { file, path } */
function parseDataPath(s) {
  let file = 'data.json'; let rest = s;
  if (s.startsWith('media:')) { file = 'media.json'; rest = s.slice(6); }
  if (s.startsWith('src:')) { file = 'sources.json'; rest = s.slice(4); }
  return { file, path: rest.split('.').map((k) => (/^\d+$/.test(k) ? Number(k) : k)) };
}
const fieldId = (file, path) => `ef-${file.replace('.json', '')}-${path.join('-')}`.replace(/[^\w-]/g, '_');

export function initEditMode() {
  document.body.classList.add('is-editing', 'is-picking');
  const changes = new Map(); // `${file}|${path}` → { file, path, value }
  const mdBlocks = [...document.querySelectorAll('[data-md][data-lines]')];
  const mdOriginal = new Map();
  const uiInline = [];
  const uiOriginal = new Map();

  // ---------- 1. Текст .md прямо на странице ----------
  mdBlocks.forEach((el) => {
    if (el.tagName === 'H1' && el.dataset.text) el.textContent = el.dataset.text; // буквы-спаны → обычный текст
    mdOriginal.set(el, el.innerHTML);
    makeEditable(el);
    el.querySelectorAll('.fn').forEach((f) => { f.contentEditable = 'false'; });
    el.addEventListener('input', () => { el.dataset.dirty = 'true'; update(); });
  });

  // ---------- 2. Простые подписи ui.json прямо на странице ----------
  document.querySelectorAll('[data-ui]').forEach((el) => {
    const key = el.dataset.ui;
    const raw = getIn(UI, key.split('.'));
    const inline = typeof raw === 'string' && !raw.includes('{') && !el.closest('button, svg, a, [role="tab"], .split') && el.namespaceURI !== 'http://www.w3.org/2000/svg';
    if (!inline) return;
    uiInline.push(el);
    uiOriginal.set(el, el.textContent);
    makeEditable(el);
    el.dataset.inline = 'true';
    el.addEventListener('input', () => {
      el.dataset.dirty = 'true';
      setChange('ui.json', key.split('.'), el.textContent.replace(/ /g, ' ').trim(), { fromInline: true });
    });
  });

  function makeEditable(el) {
    el.contentEditable = 'true';
    el.dataset.editable = 'true';
    el.spellcheck = true;
    el.addEventListener('paste', (e) => {
      e.preventDefault();
      document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain'));
    });
    if (el.tagName !== 'P') el.addEventListener('keydown', (e) => { if (e.key === 'Enter') e.preventDefault(); });
  }

  // ---------- 3. Панель ----------
  const bar = document.createElement('div');
  bar.className = 'edit-bar';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Режим редактирования');
  bar.innerHTML = `<span>Редактирование · <b id="edit-count">0</b> изм.</span>
    <label class="edit-pick"><input type="checkbox" checked> Выбор элементов</label>
    <button type="button" class="is-panel">Панель</button>
    <button type="button" class="is-save" disabled>Сохранить</button>
    <button type="button" class="is-undo" disabled>Отменить изменения</button>`;
  document.body.append(bar);
  const [pickBox] = bar.querySelectorAll('input');
  const [panelBtn, saveBtn, undoBtn] = bar.querySelectorAll('button');
  const countEl = bar.querySelector('#edit-count');

  const panel = document.createElement('aside');
  panel.className = 'edit-panel';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Панель данных и подписей');
  panel.innerHTML = `
    <header class="edit-panel__head">
      <div class="edit-panel__tabs" role="tablist">${Object.entries(FILES).map(([f, v], i) => `<button type="button" role="tab" data-file="${f}" aria-selected="${i === 0}">${v.title}</button>`).join('')}</div>
      <button type="button" class="edit-panel__close" aria-label="Закрыть панель">✕</button>
    </header>
    <input type="search" class="edit-panel__search" placeholder="Поиск по названию или значению…">
    <p class="edit-panel__hint">Изменённые поля подсвечены. Цифры обновятся на графиках после «Сохранить». Подписи меняются сразу.</p>
    <div class="edit-panel__body"></div>`;
  document.body.append(panel);
  const body = panel.querySelector('.edit-panel__body');
  const search = panel.querySelector('.edit-panel__search');
  let currentFile = 'data.json';

  function leaves(obj, path = [], trail = []) {
    const out = [];
    if (Array.isArray(obj)) {
      obj.forEach((v, i) => {
        const name = v && typeof v === 'object' && !Array.isArray(v) ? NAME_KEYS.map((k) => v[k]).find((x) => typeof x === 'string') : null;
        out.push(...leaves(v, [...path, i], [...trail, name ? `${i + 1}. ${name}` : `${i + 1}`]));
      });
    } else if (obj && typeof obj === 'object') {
      Object.entries(obj).forEach(([k, v]) => { if (!k.startsWith('_')) out.push(...leaves(v, [...path, k], [...trail, k])); });
    } else {
      out.push({ path, trail, value: obj });
    }
    return out;
  }

  function renderPanel() {
    const { json } = FILES[currentFile];
    const q = search.value.trim().toLowerCase();
    const rows = leaves(json).filter((l) => !q || l.trail.join(' ').toLowerCase().includes(q) || String(l.value).toLowerCase().includes(q));
    body.innerHTML = rows.map((l) => {
      const id = fieldId(currentFile, l.path);
      const ch = changes.get(`${currentFile}|${l.path.join('.')}`);
      const val = ch ? ch.value : l.value;
      const type = typeof l.value;
      const label = l.trail.join(' › ');
      let input;
      if (type === 'boolean') input = `<input id="${id}" type="checkbox" ${val ? 'checked' : ''}>`;
      else if (type === 'number') input = `<input id="${id}" type="number" step="any" value="${val}">`;
      else if (String(val).length > 60) input = `<textarea id="${id}" rows="3">${escapeHtml(val)}</textarea>`;
      else input = `<input id="${id}" type="text" value="${escapeHtml(val)}">`;
      return `<div class="edit-field${ch ? ' is-changed' : ''}" data-path='${JSON.stringify(l.path)}' data-type="${type}"><label for="${id}">${escapeHtml(label)}</label>${input}</div>`;
    }).join('') || '<p class="edit-panel__hint">Ничего не найдено.</p>';
  }

  body.addEventListener('input', (e) => {
    const box = e.target.closest('.edit-field');
    if (!box) return;
    const path = JSON.parse(box.dataset.path);
    const type = box.dataset.type;
    let value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if (type === 'number') { value = Number(value); if (!Number.isFinite(value) || e.target.value === '') return; }
    box.classList.add('is-changed');
    setChange(currentFile, path, value);
  });

  panel.querySelectorAll('[role="tab"]').forEach((tab) => tab.addEventListener('click', () => {
    currentFile = tab.dataset.file;
    panel.querySelectorAll('[role="tab"]').forEach((x) => x.setAttribute('aria-selected', String(x === tab)));
    search.value = '';
    renderPanel();
  }));
  search.addEventListener('input', renderPanel);
  panel.querySelector('.edit-panel__close').addEventListener('click', () => { panel.hidden = true; document.body.classList.remove('has-panel'); });
  panelBtn.addEventListener('click', () => openPanel());

  function openPanel(file = currentFile, path = null) {
    if (file !== currentFile || search.value) {
      currentFile = file;
      search.value = '';
      panel.querySelectorAll('[role="tab"]').forEach((x) => x.setAttribute('aria-selected', String(x.dataset.file === file)));
    }
    renderPanel();
    panel.hidden = false;
    document.body.classList.add('has-panel');
    if (path) {
      const input = document.getElementById(fieldId(file, path));
      if (input) {
        const box = input.closest('.edit-field');
        box.scrollIntoView({ block: 'center' });
        box.classList.remove('is-flash'); void box.offsetWidth; box.classList.add('is-flash');
        input.focus({ preventScroll: true });
        input.select?.();
      }
    }
  }

  // ---------- 4. Выбор элементов щелчком ----------
  pickBox.addEventListener('change', () => document.body.classList.toggle('is-picking', pickBox.checked));
  document.addEventListener('click', (e) => {
    if (!pickBox.checked || e.target.closest('.edit-bar, .edit-panel')) return;
    const el = e.target.closest('[data-path], [data-ui]');
    if (!el || el.dataset.inline === 'true') return; // простые подписи правятся прямо на месте
    e.preventDefault();
    e.stopPropagation();
    if (el.dataset.path) { const { file, path } = parseDataPath(el.dataset.path); openPanel(file, path); }
    else openPanel('ui.json', el.dataset.ui.split('.').map((k) => (/^\d+$/.test(k) ? Number(k) : k)));
  }, true);

  // ---------- 5. Изменения ----------
  function setChange(file, path, value, { fromInline = false } = {}) {
    const orig = getIn(FILES[file].json, path);
    const key = `${file}|${path.join('.')}`;
    if (value === orig) changes.delete(key); else changes.set(key, { file, path, value });
    // Живой предпросмотр подписей без подстановок
    if (file === 'ui.json' && typeof value === 'string' && !String(orig).includes('{')) {
      document.querySelectorAll(`[data-ui="${path.join('.')}"]`).forEach((n) => {
        if (fromInline && n === document.activeElement) return;
        n.textContent = value;
      });
    }
    update();
  }

  function dirtyMd() { return mdBlocks.filter((b) => b.dataset.dirty === 'true'); }
  function update() {
    const n = dirtyMd().length + changes.size;
    countEl.textContent = n;
    saveBtn.disabled = undoBtn.disabled = n === 0;
  }

  undoBtn.addEventListener('click', () => {
    dirtyMd().forEach((b) => {
      b.innerHTML = mdOriginal.get(b);
      b.querySelectorAll('.fn').forEach((f) => { f.contentEditable = 'false'; });
      delete b.dataset.dirty;
    });
    uiInline.forEach((el) => { el.textContent = uiOriginal.get(el); delete el.dataset.dirty; });
    // Вернуть подписи, изменённые через панель
    for (const c of changes.values()) {
      if (c.file === 'ui.json') document.querySelectorAll(`[data-ui="${c.path.join('.')}"]`).forEach((n) => { const o = getIn(UI, c.path); if (typeof o === 'string' && !o.includes('{')) n.textContent = o; });
    }
    changes.clear();
    if (!panel.hidden) renderPanel();
    update();
  });

  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Сохраняю…';
    try {
      // .md
      const byFile = new Map();
      for (const b of dirtyMd()) {
        const [from, to] = b.dataset.lines.split('-').map(Number);
        const markdown = (b.dataset.prefix || '') + toMarkdown(b).trim();
        if (!byFile.has(b.dataset.md)) byFile.set(b.dataset.md, []);
        byFile.get(b.dataset.md).push({ from, to, markdown });
      }
      for (const [file, edits] of byFile) await post('/__content-edit', { file, edits });
      // JSON
      const byJson = new Map();
      for (const c of changes.values()) {
        if (!byJson.has(c.file)) byJson.set(c.file, []);
        byJson.get(c.file).push({ path: c.path, value: c.value });
      }
      for (const [file, patches] of byJson) await post('/__json-edit', { file, patches });
      changes.clear();
      mdBlocks.forEach((b) => delete b.dataset.dirty);
      saveBtn.textContent = 'Сохранено ✓';
      sessionStorage.setItem('edit-scroll', String(window.scrollY));
      setTimeout(() => location.reload(), 300);
    } catch (err) {
      alert(`Не удалось сохранить: ${err.message}`);
      saveBtn.textContent = 'Сохранить';
      update();
    }
  });

  // После перезагрузки — вернуться туда же
  const y = Number(sessionStorage.getItem('edit-scroll'));
  if (y) { sessionStorage.removeItem('edit-scroll'); setTimeout(() => window.scrollTo(0, y), 300); }

  window.addEventListener('beforeunload', (e) => { if (dirtyMd().length || changes.size) { e.preventDefault(); e.returnValue = ''; } });
}

async function post(url, payload) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || r.statusText);
  return j;
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

/** DOM → Markdown (только то, что встречается в тексте статьи) */
export function toMarkdown(node) {
  let out = '';
  node.childNodes.forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE) { out += n.textContent.replace(/ /g, ' '); return; }
    if (n.nodeType !== Node.ELEMENT_NODE) return;
    const tag = n.tagName;
    if (n.classList.contains('fn')) {
      const a = n.querySelector('a[data-src]');
      if (a) out += `[^${a.dataset.src}]`;
      return;
    }
    const inner = toMarkdown(n);
    if (tag === 'STRONG' || tag === 'B') out += inner.trim() ? `**${inner}**` : inner;
    else if (tag === 'EM' || tag === 'I') out += inner.trim() ? `*${inner}*` : inner;
    else if (tag === 'A') out += `[${inner}](${n.getAttribute('href')})`;
    else if (tag === 'BR') out += '\n\n';
    else if (tag === 'DIV' || tag === 'P') out += `\n\n${inner}`;
    else out += inner;
  });
  return out.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+\n/g, '\n');
}
