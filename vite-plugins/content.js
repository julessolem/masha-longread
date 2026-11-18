// Виртуальный модуль `virtual:content`: тексты из content/*.md, уже превращённые в HTML.
// Markdown рендерится в Node, поэтому markdown-it не попадает в браузер.
// Обложка (00-oblozhka.md) дополнительно встраивается прямо в index.html — она видна до загрузки JS.
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRenderer } from './markdown.js';
import { ticketHTML } from '../src/ui/ticket-html.js';

const DIR = resolve('content');
const ID = 'virtual:content';
const RID = '\0virtual:content';

function build(dev) {
  const sources = JSON.parse(readFileSync(join(DIR, 'sources.json'), 'utf8'));
  const r = createRenderer(sources, { dev });
  const files = readdirSync(DIR).filter((f) => f.endsWith('.md')).sort();
  const HTML = {}; const SENTENCES = {};
  for (const f of files) {
    const src = readFileSync(join(DIR, f), 'utf8');
    HTML[f] = r.render(f, src);
    SENTENCES[f] = r.sentences(src);
  }
  return { HTML, SENTENCES, files };
}

/** Предзагрузка шрифтов первого экрана (имена файлов с хешами известны только после сборки) */
export function fontPreload(patterns = ['google-sans-flex-latin-wdth', 'roboto-flex-cyrillic-wdth', 'pt-mono-cyrillic-400']) {
  return {
    name: 'font-preload',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const files = Object.keys(ctx.bundle || {}).filter((f) => f.endsWith('.woff2') && patterns.some((p) => f.includes(p)));
        const tags = files.map((f) => `<link rel="preload" href="./${f}" as="font" type="font/woff2" crossorigin>`).join('\n  ');
        return html.replace('</title>', `</title>\n  ${tags}`);
      },
    },
  };
}

export default function content() {
  let dev = false;
  return {
    name: 'content',
    configResolved(cfg) { dev = cfg.command === 'serve'; },
    resolveId(id) { return id === ID ? RID : null; },
    load(id) {
      if (id !== RID) return null;
      const { HTML, SENTENCES, files } = build(dev);
      files.forEach((f) => this.addWatchFile(join(DIR, f)));
      this.addWatchFile(join(DIR, 'sources.json'));
      return `export const HTML = ${JSON.stringify(HTML)};\nexport const SENTENCES = ${JSON.stringify(SENTENCES)};`;
    },
    // Статичная обложка в index.html (быстрая первая отрисовка)
    transformIndexHtml(html) {
      const { HTML } = build(dev);
      const cover = HTML['00-oblozhka.md'] || '';
      return html.replace('<section class="stop stop--cover" id="s0" data-stop="0" aria-labelledby="s0-h"></section>',
        `<section class="stop stop--cover" id="s0" data-stop="0" aria-labelledby="s0-h"><div class="cover"><div class="cover__text">${cover.replace('<h1', '<h1 id="s0-h"')}<a class="scroll-hint" href="#s1"><i aria-hidden="true"></i>листайте</a></div><div class="cover__ticket">${ticketHTML()}</div></div></section>`);
    },
    // Правка .md / sources.json в dev → полная перезагрузка страницы
    handleHotUpdate({ file, server }) {
      if (file.startsWith(DIR) && /\.(md|json)$/.test(file)) {
        const mod = server.moduleGraph.getModuleById(RID);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
        return [];
      }
      return undefined;
    },
  };
}
