// Режим редактирования (?edit=1, только `npm run dev`).
// Абзацы и заголовки становятся редактируемыми; «Сохранить» записывает
// изменения обратно в content/*.md через dev-эндпоинт /__content-edit.
// Сноски [^N], **жирный**, *курсив* и [ссылки](url) сохраняются.

export function initEditMode() {
  document.body.classList.add('is-editing');
  const blocks = [...document.querySelectorAll('[data-md][data-lines]')];
  const original = new Map();

  blocks.forEach((el) => {
    if (el.tagName === 'H1' && el.dataset.text) el.textContent = el.dataset.text; // буквы-спаны → обычный текст
    original.set(el, el.innerHTML);
    el.contentEditable = 'true';
    el.dataset.editable = 'true';
    el.spellcheck = true;
    el.querySelectorAll('.fn').forEach((f) => { f.contentEditable = 'false'; });
    el.addEventListener('input', () => { el.dataset.dirty = 'true'; update(); });
    el.addEventListener('paste', (e) => {
      e.preventDefault();
      document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain'));
    });
    if (/^H\d$/.test(el.tagName)) el.addEventListener('keydown', (e) => { if (e.key === 'Enter') e.preventDefault(); });
  });

  const bar = document.createElement('div');
  bar.className = 'edit-bar';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Режим редактирования');
  bar.innerHTML = `<span>Редактирование · <b id="edit-count">0</b> изм.</span>
    <button type="button" class="is-save" disabled>Сохранить</button>
    <button type="button" class="is-undo" disabled>Отменить изменения</button>`;
  document.body.append(bar);
  const [saveBtn, undoBtn] = bar.querySelectorAll('button');
  const countEl = bar.querySelector('#edit-count');

  function dirty() { return blocks.filter((b) => b.dataset.dirty === 'true'); }
  function update() {
    const n = dirty().length;
    countEl.textContent = n;
    saveBtn.disabled = undoBtn.disabled = n === 0;
  }

  undoBtn.addEventListener('click', () => {
    dirty().forEach((b) => {
      b.innerHTML = original.get(b);
      b.querySelectorAll('.fn').forEach((f) => { f.contentEditable = 'false'; });
      delete b.dataset.dirty;
    });
    update();
  });

  saveBtn.addEventListener('click', async () => {
    const byFile = new Map();
    for (const b of dirty()) {
      const [from, to] = b.dataset.lines.split('-').map(Number);
      const prefix = b.dataset.prefix || '';
      const markdown = prefix + toMarkdown(b).trim();
      if (!byFile.has(b.dataset.md)) byFile.set(b.dataset.md, []);
      byFile.get(b.dataset.md).push({ from, to, markdown });
    }
    saveBtn.disabled = true;
    saveBtn.textContent = 'Сохраняю…';
    try {
      for (const [file, edits] of byFile) {
        const r = await fetch('/__content-edit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file, edits }) });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || r.statusText);
      }
      blocks.forEach((b) => delete b.dataset.dirty);
      saveBtn.textContent = 'Сохранено ✓';
      setTimeout(() => location.reload(), 400);
    } catch (err) {
      alert(`Не удалось сохранить: ${err.message}`);
      saveBtn.textContent = 'Сохранить';
      update();
    }
  });

  window.addEventListener('beforeunload', (e) => { if (dirty().length) { e.preventDefault(); e.returnValue = ''; } });
}

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
