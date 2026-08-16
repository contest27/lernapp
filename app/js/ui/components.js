import { h } from '../shell/core.js';
import * as tts from '../tts.js';
import { store } from '../shell/core.js';

export function headerBar(title, { onBack = null, right = null } = {}) {
  return h('header', { class: 'topbar' },
    onBack ? h('button', { class: 'iconbtn', onclick: onBack, 'aria-label': 'Back' }, '←') : h('span', { class: 'iconbtn ghost' }),
    h('div', { class: 'topbar-title' }, title),
    right ?? h('span', { class: 'iconbtn ghost' }),
  );
}

export function bottomNav(active, go) {
  const item = (name, icon, label) =>
    h('button', { class: 'nav-item' + (active === name ? ' active' : ''), onclick: () => go(name) },
      h('span', { class: 'nav-icon' }, icon), h('span', {}, label));
  return h('nav', { class: 'bottomnav' },
    item('home', '🏫', 'Home'),
    item('today', '🧮', 'Maths'),
  );
}

export function speakerButton(text, { small = false } = {}) {
  if (!tts.available()) return null;
  const btn = h('button', { class: 'speak' + (small ? ' small' : ''), 'aria-label': 'Read aloud' }, '🔊');
  btn.addEventListener('click', () => {
    const { rate, voiceURI } = store.state.shell;
    btn.classList.add('speaking');
    tts.speak(stripForSpeech(text), { rate, voiceURI, onend: () => btn.classList.remove('speaking') });
  });
  return btn;
}

export function stripForSpeech(html) {
  const div = document.createElement('div');
  div.innerHTML = html
    .replace(/<span class="frac"><b>(\d+)<\/b><i>(\d+)<\/i><\/span>/g, ' $1 over $2 ')
    .replace(/×/g, ' times ').replace(/÷/g, ' divided by ').replace(/−/g, ' minus ');
  return div.textContent.replace(/\s+/g, ' ').trim();
}

// On-screen number pad writing into a display box.
export function numberPad({ allowMinus = false, allowDecimal = false, onSubmit }) {
  let value = '';
  const display = h('div', { class: 'pad-display', 'aria-live': 'polite' }, ' ');
  const setVal = (v) => { value = v; display.textContent = v === '' ? ' ' : v; };
  const press = (k) => {
    if (k === '⌫') return setVal(value.slice(0, -1));
    if (k === '−') return setVal(value.startsWith('-') ? value.slice(1) : '-' + value);
    if (k === '.') { if (!value.includes('.')) setVal((value || '0') + '.'); return; }
    if (value.replace('-', '').replace('.', '').length >= 9) return;
    setVal(value + k);
  };
  const keyBtn = (k) => h('button', { class: 'pad-key', onclick: () => press(k) }, k);
  const rows = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']];
  const last = [allowMinus ? '−' : (allowDecimal ? '' : ''), '0', '⌫'];
  if (allowDecimal) last[0] = allowMinus ? '−' : '.';
  const extra = allowMinus && allowDecimal ? keyBtn('.') : null;
  const pad = h('div', { class: 'numpad' },
    display,
    h('div', { class: 'pad-grid' },
      rows.flat().map(keyBtn),
      last[0] ? keyBtn(last[0]) : h('span'),
      keyBtn('0'), keyBtn('⌫'), extra,
    ),
    h('button', { class: 'btn primary wide', onclick: () => value !== '' && value !== '-' && onSubmit(value) }, 'Check ✓'),
  );
  return pad;
}

export function fractionPad({ onSubmit }) {
  // inputmode 'none': the on-screen pad below feeds these fields, so the
  // system keyboard must stay closed (no 'pattern' — iOS treats [0-9]* as a
  // keypad trigger). Focus still works, so tap-to-switch target is unaffected.
  const numIn = h('input', { class: 'frac-in', inputmode: 'none', 'aria-label': 'numerator' });
  const denIn = h('input', { class: 'frac-in', inputmode: 'none', 'aria-label': 'denominator' });
  let target = numIn;
  numIn.addEventListener('focus', () => (target = numIn));
  denIn.addEventListener('focus', () => (target = denIn));
  const press = (k) => {
    if (k === '⌫') target.value = target.value.slice(0, -1);
    else if (target.value.length < 4) target.value += k;
  };
  const keyBtn = (k) => h('button', { class: 'pad-key', onclick: () => press(k) }, k);
  return h('div', { class: 'numpad' },
    h('div', { class: 'frac-entry' },
      h('div', { class: 'frac-stack' }, numIn, h('div', { class: 'frac-line' }), denIn)),
    h('div', { class: 'pad-grid' },
      ['1','2','3','4','5','6','7','8','9'].map(keyBtn), h('span'), keyBtn('0'), keyBtn('⌫')),
    h('button', {
      class: 'btn primary wide',
      onclick: () => numIn.value !== '' && denIn.value !== '' && onSubmit({ n: numIn.value, d: denIn.value }),
    }, 'Check ✓'),
  );
}

// Tap items into slots in order.
export function orderPicker(q, { onSubmit }) {
  const chosen = [];
  const slots = h('div', { class: 'order-slots' });
  const pool = h('div', { class: 'order-pool' });
  const redraw = () => {
    slots.replaceChildren(...q.items.map((_, i) =>
      h('div', { class: 'order-slot' + (i < chosen.length ? ' filled' : '') },
        i < chosen.length ? h('span', { html: String(chosen[i]) }) : (i + 1))));
    pool.replaceChildren(...q.items.map((v) => {
      const used = chosen.includes(v);
      return h('button', {
        class: 'order-chip' + (used ? ' used' : ''),
        disabled: used,
        html: String(v),
        onclick: () => { chosen.push(v); redraw(); },
      });
    }));
  };
  redraw();
  return h('div', { class: 'order-wrap' },
    slots, pool,
    h('div', { class: 'row gap' },
      h('button', { class: 'btn subtle', onclick: () => { chosen.length = 0; redraw(); } }, 'Start again'),
      h('button', { class: 'btn primary grow', onclick: () => chosen.length === q.items.length && onSubmit(chosen.map(String)) }, 'Check ✓'),
    ),
  );
}

export function starRow(n, { size = 'md' } = {}) {
  return h('div', { class: 'stars ' + size },
    [1, 2, 3].map((i) => h('span', { class: i <= n ? 'star on' : 'star' }, '★')));
}

export function progressBar(done, total) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return h('div', { class: 'progress' }, h('div', { class: 'progress-fill', style: { width: pct + '%' } }));
}

export function bandDot(score) {
  const cls = score == null ? 'grey' : score < 60 ? 'red' : score <= 85 ? 'amber' : 'green';
  return h('span', { class: 'dot ' + cls });
}

export function confettiBurst(parent) {
  const wrap = h('div', { class: 'confetti' });
  const colors = ['#f87171', '#fbbf24', '#34d399', '#38bdf8', '#a78bfa'];
  for (let i = 0; i < 24; i++) {
    const p = h('i', {
      style: {
        left: Math.random() * 100 + '%',
        background: colors[i % colors.length],
        animationDelay: Math.random() * 0.25 + 's',
        transform: `rotate(${Math.random() * 360}deg)`,
      },
    });
    wrap.append(p);
  }
  parent.append(wrap);
  setTimeout(() => wrap.remove(), 1800);
}
