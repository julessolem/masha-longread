// 08. Прибытие: посадочный талон получает штамп «ПРИБЫЛА», затем текст вывода
import { renderMarkdown } from '../content/render.js';
import { nodesFrom, prose } from '../ui/util.js';
import { makeTicket, tilt } from '../ui/ticket.js';
import { gsap, REDUCED } from '../ui/motion.js';
import { t } from '../content/ui.js';

export function render(el) {
  const nodes = nodesFrom(renderMarkdown('08-vyvod.md'));
  const head = nodes.filter((n) => n.tagName === 'H2');
  const rest = nodes.filter((n) => n.tagName !== 'H2');
  const wrap = document.createElement('div');
  wrap.className = 'arrival-ticket';
  const ticket = makeTicket({ light: true, stamp: t('arrival.stamp') });
  const stamp = document.createElement('button');
  stamp.type = 'button';
  stamp.className = 'ticket__stamp';
  stamp.textContent = t('arrival.stamp');
  stamp.dataset.ui = 'arrival.stamp';
  stamp.setAttribute('aria-label', t('arrival.stampAria'));
  ticket.append(stamp);
  wrap.append(ticket);
  const inner = document.createElement('div');
  inner.className = 'stop__inner';
  inner.append(prose(head), wrap, prose(rest));
  el.append(inner);
  return { ticket, stamp };
}

export function animate(el, { ticket, stamp }) {
  tilt(ticket, 6);
  const hit = () => gsap.timeline()
    .fromTo(stamp, { opacity: 0, scale: 2.4, rotation: -40 }, { opacity: 1, scale: 1, rotation: -14, duration: 0.42, ease: 'power4.in' })
    .to(ticket, { y: 6, duration: 0.06 }, '>-0.02')
    .to(ticket, { y: 0, duration: 0.4, ease: 'elastic.out(1, 0.35)' });
  if (REDUCED) { gsap.set(stamp, { opacity: 1, yPercent: -50, rotation: -14 }); return; }
  gsap.set(stamp, { yPercent: -50 });
  gsap.timeline({ scrollTrigger: { trigger: ticket, start: 'top 65%', once: true, onEnter: hit } });
  stamp.addEventListener('click', hit);
}
