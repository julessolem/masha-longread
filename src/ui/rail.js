// Маршрут-прогресс: точки-остановки (сбоку / сверху), клик — переход к разделу.
import { ScrollTrigger, scrollToEl, isMobile } from './motion.js';
import { STOPS } from '../stops.js';

export function initRail() {
  const rail = document.getElementById('rail');
  rail.innerHTML = `
    <div class="rail__now" aria-hidden="true"><span id="rail-name">Посадка</span><span><span id="rail-num">0</span>/${STOPS.length - 1}</span></div>
    <ol class="rail__list">
      <li aria-hidden="true" class="rail__track"><div class="rail__fill"></div></li>
      ${STOPS.map((s) => `<li><a href="#${s.id}" data-stop="${s.n}" aria-label="${s.n ? `Остановка ${s.n}: ` : ''}${s.name}"><span class="rail__label" aria-hidden="true">${s.n ? `${s.n}. ` : ''}${s.name}</span></a></li>`).join('')}
    </ol>`;
  const links = [...rail.querySelectorAll('a')];
  const fill = rail.querySelector('.rail__fill');
  const nameEl = rail.querySelector('#rail-name');
  const numEl = rail.querySelector('#rail-num');

  rail.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    e.preventDefault();
    const target = document.getElementById(a.getAttribute('href').slice(1));
    scrollToEl(target);
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });

  const setCurrent = (n) => {
    links.forEach((a) => {
      const k = Number(a.dataset.stop);
      a.classList.toggle('is-passed', k < n);
      a.classList.toggle('is-current', k === n);
      if (k === n) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current');
    });
    const s = STOPS[n];
    nameEl.textContent = s.name; numEl.textContent = n;
    rail.classList.toggle('is-dark', n === 0);
  };

  STOPS.forEach((s) => {
    const el = document.getElementById(s.id);
    ScrollTrigger.create({
      trigger: el, start: 'top 45%', end: 'bottom 45%',
      onToggle: (st) => { if (st.isActive) setCurrent(s.n); },
    });
  });
  // Заполнение линии маршрута — по прогрессу всей страницы
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: (st) => {
      fill.style.transform = isMobile() ? `scaleX(${st.progress})` : `scaleY(${st.progress})`;
    },
  });
  setCurrent(0);
}
