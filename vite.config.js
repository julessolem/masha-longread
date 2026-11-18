import { defineConfig } from 'vite';
import contentEdit from './vite-plugins/content-edit.js';

export default defineConfig({
  // Относительные пути: сайт работает из любой подпапки (GitHub Pages)
  base: './',
  plugins: [contentEdit()],
  build: {
    outDir: 'dist',
    sourcemap: false, // карты исходников содержат локальные пути — не публикуем
    assetsInlineLimit: 0,
    target: 'es2020',
  },
  server: { port: 5173, strictPort: true, watch: { ignored: ['**/.qa/**', '**/dist/**'] } },
});
