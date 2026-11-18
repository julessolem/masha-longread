// Dev-эндпоинт для режима редактирования (?edit=1).
// Работает ТОЛЬКО в `npm run dev` (apply: 'serve'), в сборку не попадает.
// POST /__content-edit  { file: "02-kto-edet.md", edits: [{ from, to, markdown }] }
//   from/to — номера строк исходного .md (с нуля, to не включительно), как их выдаёт markdown-it.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, basename } from 'node:path';

const CONTENT_DIR = resolve('content');

export default function contentEdit() {
  return {
    name: 'content-edit',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__content-edit', async (req, res) => {
        const reply = (code, obj) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(obj)); };
        if (req.method !== 'POST') return reply(405, { error: 'POST only' });
        try {
          let body = '';
          for await (const chunk of req) body += chunk;
          const { file, edits } = JSON.parse(body);
          // Разрешены только .md-файлы из папки content/
          if (typeof file !== 'string' || basename(file) !== file || !/^[\w-]+\.md$/.test(file)) return reply(400, { error: 'bad file' });
          if (!Array.isArray(edits) || !edits.length) return reply(400, { error: 'no edits' });
          const path = resolve(CONTENT_DIR, file);
          const src = await readFile(path, 'utf8');
          const eol = src.includes('\r\n') ? '\r\n' : '\n';
          const lines = src.split(/\r?\n/);
          // Применяем снизу вверх, чтобы номера строк не съезжали
          const sorted = [...edits].sort((a, b) => b.from - a.from);
          for (const e of sorted) {
            if (!Number.isInteger(e.from) || !Number.isInteger(e.to) || e.from < 0 || e.to > lines.length || e.from >= e.to) return reply(400, { error: `bad range ${e.from}-${e.to}` });
            // Пустые строки в конце блока markdown-it включает в диапазон — сохраняем их
            let to = e.to;
            while (to > e.from + 1 && lines[to - 1].trim() === '') to--;
            lines.splice(e.from, to - e.from, ...String(e.markdown).replace(/\r\n/g, '\n').split('\n'));
          }
          await writeFile(path, lines.join(eol), 'utf8');
          reply(200, { ok: true, file, count: edits.length });
        } catch (err) {
          reply(500, { error: String(err.message || err) });
        }
      });
    },
  };
}
