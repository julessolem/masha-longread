// Проверка проекта (и сборки dist/, если она есть) на персональные данные и внешние подключения.
// Личные значения берутся во время запуска: имя пользователя ОС, глобальные git user.name/email,
// переменная PRIVATE_TERMS (через запятую). В отчёт они НЕ выводятся — только тип совпадения.
// Запуск: npm run check
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { execSync } from 'node:child_process';
import { userInfo } from 'node:os';

const sh = (c) => { try { return execSync(c, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return ''; } };
const terms = [];
const add = (label, v) => { v = (v || '').trim(); if (v.length >= 3) terms.push({ label, re: new RegExp(v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }); };
add('имя пользователя ОС', userInfo().username);
const gName = sh('git config --global user.name');
const gMail = sh('git config --global user.email');
add('глобальное git user.name', gName);
gName.split(/\s+/).forEach((x) => add('часть глобального git user.name', x));
add('глобальный git email', gMail);
add('локальная часть глобального email', gMail.split('@')[0]);
const dom = gMail.split('@')[1] || '';
if (dom && !/gmail|yandex|mail\.ru|outlook|icloud|noreply|proton/.test(dom)) add('домен глобального email', dom);
(process.env.PRIVATE_TERMS || '').split(',').forEach((t) => add('PRIVATE_TERMS', t));

const generic = [
  { label: 'email', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/, allow: /media-project@users\.noreply\.github\.com|@fontsource|@[0-9.]+x/ },
  { label: 'соцсети/портфолио', re: /\b(vk\.com|t\.me\/|telegram\.me|instagram\.com|facebook\.com|twitter\.com|x\.com\/|tiktok\.com|behance\.net|dribbble\.com|linkedin\.com|youtube\.com\/@|ok\.ru\/|dzen\.ru|github\.com\/[A-Za-z0-9-]+)/i },
  { label: 'копирайт/автор', re: /(©|\(c\)\s*\d{4}|copyright|name=["']author|"author"\s*:|og:author|article:author|@author)/i },
  { label: 'абсолютный путь', re: /([A-Z]:[\\/]Users[\\/]|\/Users\/[a-z]|\/home\/[a-z])/i },
];

// Сторонний код (библиотеки, шрифты, lock-файл): общие шаблоны там — имена авторов библиотек, это нормально.
// Личные термины ищутся везде.
const THIRD = /(^package-lock\.json$|^dist[\\/]assets[\\/].*\.(js|woff2)$|LICENSE)/i;
const SKIP = new Set(['node_modules', '.git', '.qa', '.claude']);
const BIN = /\.(woff2?|png|jpe?g|webp|gif|mp4|webm|mp3|m4a|ico|pdf)$/i;
const files = [];
(function walk(d) { for (const n of readdirSync(d)) { if (SKIP.has(n)) continue; const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else files.push(p); } })('.');

const findings = []; let thirdHits = 0;
for (const f of files) {
  const rel = relative('.', f);
  for (const t of terms) if (t.re.test(rel)) findings.push(`${rel}: имя файла — [${t.label}]`);
  const buf = readFileSync(f);
  if (BIN.test(f)) {
    const s = buf.toString('latin1');
    for (const t of terms) if (t.re.test(s)) findings.push(`${rel}: внутри файла — [${t.label}]`);
    if (/\.(png|jpe?g|webp|mp4|webm|mp3|m4a)$/i.test(f) && /(Exif|<x:xmpmeta|Artist|Author|©ART|©too|GPS)/.test(s)) findings.push(`${rel}: в медиафайле есть метаданные — удалите их`);
    continue;
  }
  const lines = buf.toString('utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const t of terms) if (t.re.test(line)) findings.push(`${rel}:${i + 1}: [${t.label}]`);
    if (rel === join('scripts', 'check-privacy.mjs')) return;
    for (const g of generic) {
      const m = line.match(g.re);
      if (!m || (g.allow && g.allow.test(m[0]))) continue;
      if (THIRD.test(rel)) { thirdHits++; continue; }
      findings.push(`${rel}:${i + 1}: ${g.label} → «${m[0].slice(0, 50)}»`);
    }
  });
}

// Внешние подключения в коде сайта и в сборке (src=, href= у link, url(), import, fetch на http(s)://)
const ext = [];
for (const f of files.filter((x) => /^(src|dist|index\.html|public)/.test(relative('.', x)) && /\.(html|css|js|mjs)$/.test(x))) {
  readFileSync(f, 'utf8').split(/\r?\n/).forEach((line, i) => {
    const re = /(src=|url\(|import\s*\(?|fetch\(|<link[^>]+href=)\s*["'`]?(https?:)?\/\/[a-z0-9]/gi;
    if (re.test(line)) ext.push(`${relative('.', f)}:${i + 1}`);
  });
}

// Git
const notes = [];
const ln = sh('git config --local user.name'); const lm = sh('git config --local user.email');
if (ln !== 'media-project') findings.push('git: локальный user.name не нейтральный');
if (lm !== 'media-project@users.noreply.github.com') findings.push('git: локальный user.email не нейтральный');
const authors = new Set(sh('git log --format=%an%x20<%ae>%n%cn%x20<%ce>').split('\n').filter(Boolean));
authors.forEach((a) => { if (a !== 'media-project <media-project@users.noreply.github.com>') findings.push('git: в истории есть автор/коммиттер с другими данными'); });
notes.push(`git: локально ${ln || '—'} / ${lm || '—'}; коммитов: ${sh('git rev-list --count HEAD') || 0}; авторов в истории: ${authors.size}`);
notes.push(`сборка dist/: ${existsSync('dist') ? 'проверена' : 'нет (запустите npm run build, затем проверку ещё раз)'}`);

console.log('\n=== Проверка персональных данных ===');
console.log(`Файлов: ${files.length}. Личных терминов: ${terms.length} (значения не выводятся).`);
notes.forEach((n) => console.log('· ' + n));
console.log(`\nНайдено в файлах проекта: ${findings.length}`);
findings.forEach((x) => console.log('  ✗ ' + x));
console.log(`\nВнешние подключения в коде сайта: ${ext.length}`);
ext.forEach((x) => console.log('  ✗ ' + x));
console.log(`\nВ стороннем коде (лицензии, lock-файл, бандлы библиотек) — ${thirdHits} совпад. общих шаблонов: это имена авторов библиотек, не ваши данные.`);
console.log(findings.length || ext.length ? '\nИТОГ: есть замечания ✗' : '\nИТОГ: чисто ✓');
process.exit(findings.length || ext.length ? 1 : 0);
