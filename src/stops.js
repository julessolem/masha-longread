// Список «остановок»: id блока на странице и файл с текстом.
// Подписи остановок в маршруте — в content/ui.json → stops.
import { UI } from './content/ui.js';

const BASE = [
  { n: 0, id: 's0', file: '00-oblozhka.md' },
  { n: 1, id: 's1', file: '01-zavyazka.md' },
  { n: 2, id: 's2', file: '02-kto-edet.md' },
  { n: 3, id: 's3', file: '03-karta.md' },
  { n: 4, id: 's4', file: '04-tamozhnya.md' },
  { n: 5, id: 's5', file: '05-lokalizatsiya.md' },
  { n: 6, id: 's6', file: '06-chemodan.md' },
  { n: 7, id: 's7', file: '07-stsenarii.md' },
  { n: 8, id: 's8', file: '08-vyvod.md' },
  { n: 9, id: 's9', file: null },
];
export const STOPS = BASE.map((s) => ({ ...s, name: UI.stops?.[s.n] ?? `Остановка ${s.n}` }));
