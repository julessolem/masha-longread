// Dev-эндпоинты для режима редактирования (?edit=1).
// Работают ТОЛЬКО в `npm run dev` (apply: 'serve'), в сборку не попадают.
//
// POST /__content-edit  { file: "02-kto-edet.md", edits: [{ from, to, markdown }] }
//   from/to — номера строк .md (с нуля, to не включительно), как их выдаёт markdown-it.
// POST /__json-edit     { file: "data.json", patches: [{ path: ["top5Abroad2024", 0, "value"], value: 2.9 }] }
//   Меняет только существующие значения и только того же типа (число → число, текст → текст).
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, basename } from 'node:path';

const CONTENT_DIR = resolve('content');
const JSON_FILES = new Set(['data.json', 'ui.json', 'media.json', 'sources.json']);

/**
 * Где в тексте JSON лежит каждое простое значение: { "top5Abroad2024.0.value": [start, end] }.
 * Нужно, чтобы менять только сами значения и сохранять ручное форматирование файла байт в байт.
 */
export function valueOffsets(src) {
  const map = {};
  let i = 0;
  const ws = () => { while (/\s/.test(src[i])) i++; };
  const str = () => { const s = i; i++; while (src[i] !== '"') { if (src[i] === '\\') i++; i++; } i++; return [s, i]; };
  function val(path) {
    ws();
    const c = src[i];
    if (c === '{') {
      i++; ws();
      if (src[i] === '}') { i++; return; }
      for (;;) {
        ws(); const [ks, ke] = str(); const key = JSON.parse(src.slice(ks, ke));
        ws(); i++; // :
        val([...path, key]);
        ws(); if (src[i] === ',') { i++; continue; } i++; return; // }
      }
    }
    if (c === '[') {
      i++; ws();
      if (src[i] === ']') { i++; return; }
      for (let n = 0; ; n++) {
        val([...path, n]);
        ws(); if (src[i] === ',') { i++; continue; } i++; return; // ]
      }
    }
    const s = i;
    if (c === '"') str(); else while (i < src.length && !/[\s,\]}]/.test(src[i])) i++;
    map[path.join('.')] = [s, i];
  }
  val([]);
  return map;
}

async function readBody(req) {
  let body = '';
  for await (const chunk of req) body += chunk;
  return JSON.parse(body);
}
function reply(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(obj));
}

export default function contentEdit() {
  return {
    name: 'content-edit',
    apply: 'serve',
    configureServer(server) {
      // ---- Текст .md ----
      server.middlewares.use('/__content-edit', async (req, res) => {
        if (req.method !== 'POST') return reply(res, 405, { error: 'POST only' });
        try {
          const { file, edits } = await readBody(req);
          if (typeof file !== 'string' || basename(file) !== file || !/^[\w-]+\.md$/.test(file)) return reply(res, 400, { error: 'bad file' });
          if (!Array.isArray(edits) || !edits.length) return reply(res, 400, { error: 'no edits' });
          const path = resolve(CONTENT_DIR, file);
          const src = await readFile(path, 'utf8');
          const eol = src.includes('\r\n') ? '\r\n' : '\n';
          const lines = src.split(/\r?\n/);
          for (const e of [...edits].sort((a, b) => b.from - a.from)) { // снизу вверх — номера строк не съезжают
            if (!Number.isInteger(e.from) || !Number.isInteger(e.to) || e.from < 0 || e.to > lines.length || e.from >= e.to) return reply(res, 400, { error: `bad range ${e.from}-${e.to}` });
            let to = e.to;
            while (to > e.from + 1 && lines[to - 1].trim() === '') to--; // пустые строки-разделители сохраняем
            lines.splice(e.from, to - e.from, ...String(e.markdown).replace(/\r\n/g, '\n').split('\n'));
          }
          await writeFile(path, lines.join(eol), 'utf8');
          reply(res, 200, { ok: true, file, count: edits.length });
        } catch (err) { reply(res, 500, { error: String(err.message || err) }); }
      });

      // ---- JSON: цифры, подписи, видео, источники ----
      server.middlewares.use('/__json-edit', async (req, res) => {
        if (req.method !== 'POST') return reply(res, 405, { error: 'POST only' });
        try {
          const { file, patches } = await readBody(req);
          if (!JSON_FILES.has(file)) return reply(res, 400, { error: 'bad file' });
          if (!Array.isArray(patches) || !patches.length) return reply(res, 400, { error: 'no patches' });
          const path = resolve(CONTENT_DIR, file);
          let src = await readFile(path, 'utf8');
          const json = JSON.parse(src);
          const offsets = valueOffsets(src);
          const repl = [];
          for (const { path: keys, value } of patches) {
            if (!Array.isArray(keys) || !keys.length) return reply(res, 400, { error: 'bad path' });
            const old = keys.reduce((o, k) => (o == null ? o : o[k]), json);
            const pos = offsets[keys.join('.')];
            if (old === undefined || !pos) return reply(res, 400, { error: `нет значения ${keys.join('.')}` });
            if (old !== null && typeof old === 'object') return reply(res, 400, { error: `${keys.join('.')}: это не простое значение` });
            if (old !== null && typeof old !== typeof value) return reply(res, 400, { error: `${keys.join('.')}: ожидался тип ${typeof old}` });
            if (typeof value === 'number' && !Number.isFinite(value)) return reply(res, 400, { error: `${keys.join('.')}: не число` });
            repl.push({ pos, text: JSON.stringify(value) });
          }
          // Заменяем с конца файла, чтобы позиции не сдвигались
          repl.sort((a, b) => b.pos[0] - a.pos[0]).forEach(({ pos, text }) => { src = src.slice(0, pos[0]) + text + src.slice(pos[1]); });
          JSON.parse(src); // контроль: файл остался корректным JSON
          await writeFile(path, src, 'utf8');
          reply(res, 200, { ok: true, file, count: patches.length });
        } catch (err) { reply(res, 500, { error: String(err.message || err) }); }
      });
    },
  };
}
