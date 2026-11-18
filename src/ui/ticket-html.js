// Разметка посадочного талона — чистая строка: вставляется и при сборке (в index.html), и из JS.
// Подписи — из content/ui.json → ticket (передаются параметром T).
const PLANE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></svg>';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const k = (key, val, tag = 'span') => `<${tag} data-ui="ticket.${key}">${esc(val)}</${tag}>`;

export function ticketHTML(T, { light = false, stamp = '' } = {}) {
  const field = (f, i, group) => `<div class="ticket__field">${k(`${group}.${i}.label`, f.label)}${k(`${group}.${i}.value`, f.value, 'b')}</div>`;
  return `<div class="ticket${light ? ' ticket--light' : ''}" role="img" aria-label="${esc(T.aria)}${stamp ? `, штамп «${esc(stamp)}»` : ''}">
    <div class="ticket__main">
      <div class="ticket__head">${k('head', T.head)}${k('headEn', T.headEn)}</div>
      <div class="ticket__route">
        <div class="ticket__city">${k('fromLabel', T.fromLabel)}${k('fromCode', T.fromCode, 'b')}${k('fromCity', T.fromCity)}</div>
        <div class="ticket__plane">${PLANE}</div>
        <div class="ticket__city">${k('toLabel', T.toLabel)}${k('toCode', T.toCode, 'b')}${k('toCity', T.toCity)}</div>
      </div>
      <div class="ticket__fields">${(T.fields || []).map((f, i) => field(f, i, 'fields')).join('')}</div>
    </div>
    <div class="ticket__stub">
      ${(T.stub || []).map((f, i) => field(f, i, 'stub')).join('')}
      <div class="ticket__barcode"></div>
    </div>
  </div>`;
}
