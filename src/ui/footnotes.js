// Сноски: тултип при наведении/фокусе, по клику — подсветка источника в списке.
import { getSource, fmtDate, escapeHtml } from '../content/render.js';
import { scrollToEl } from './motion.js';

export function initFootnotes() {
  const tip = document.getElementById('fn-tip');
  const show = (a) => {
    const s = getSource(a.dataset.src);
    if (!s) return;
    tip.innerHTML = `<b>${escapeHtml(s.outlet)}</b><span>${escapeHtml(fmtDate(s.date))} · «${escapeHtml(s.title.replace(/^«|»$/g, ''))}»</span>`;
    tip.hidden = false;
    const r = a.getBoundingClientRect();
    const tw = tip.offsetWidth; const th = tip.offsetHeight;
    const x = Math.max(8, Math.min(window.innerWidth - tw - 8, r.left + r.width / 2 - tw / 2));
    const y = r.top - th - 10 < 8 ? r.bottom + 10 : r.top - th - 10;
    tip.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    tip.style.left = '0'; tip.style.top = '0';
  };
  const hide = () => { tip.hidden = true; };

  document.addEventListener('pointerover', (e) => { const a = e.target.closest('.fn a'); if (a && e.pointerType !== 'touch') show(a); });
  document.addEventListener('pointerout', (e) => { if (e.target.closest('.fn a')) hide(); });
  document.addEventListener('focusin', (e) => { const a = e.target.closest('.fn a'); if (a) show(a); });
  document.addEventListener('focusout', (e) => { if (e.target.closest('.fn a')) hide(); });
  window.addEventListener('scroll', hide, { passive: true });

  document.addEventListener('click', (e) => {
    const a = e.target.closest('.fn a');
    if (!a || document.body.classList.contains('is-editing')) return;
    e.preventDefault();
    hide();
    const li = document.getElementById(`src-${a.dataset.src}`);
    if (!li) return;
    scrollToEl(li, -120);
    document.querySelectorAll('.sources__list li.is-flash').forEach((x) => x.classList.remove('is-flash'));
    li.classList.add('is-flash');
    li.querySelector('a')?.focus({ preventScroll: true });
    setTimeout(() => li.classList.remove('is-flash'), 4000);
  });
}
