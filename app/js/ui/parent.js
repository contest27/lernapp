// Parent corner: name, API key, backups. Gated behind a two-number sum like
// the Y5 trainer. AI-key testing, voice picking and the activity views arrive
// with the module UIs; B0 keeps only what the shell itself owns.

import { h, store, go, toast, registerScreen } from '../shell/core.js';
import { exportJSON, parseImport, importY5Backup, wipe, curricula } from '../shell/storage.js';

// ------------------------------------------------------------------ gate

registerScreen('parentgate', () => {
  const a = 12 + Math.floor(Math.random() * 15);
  const b = 13 + Math.floor(Math.random() * 15);
  const wrap = h('div', { class: 'screen' });
  wrap.append(h('header', { class: 'topbar' },
    h('button', { class: 'iconbtn', onclick: () => go('home'), 'aria-label': 'Back' }, '←'),
    h('div', { class: 'topbar-title' }, 'Parent corner'),
    h('span', { class: 'iconbtn ghost' }),
  ));
  const input = h('input', { class: 'gate-in', inputmode: 'numeric', 'aria-label': 'answer' });
  wrap.append(h('div', { class: 'card' },
    h('p', {}, `For grown-ups: what is ${a} + ${b}?`),
    h('div', { class: 'row gap' }, input,
      h('button', {
        class: 'btn primary',
        onclick: () => (Number(input.value) === a + b ? go('parent') : toast('Not quite — try again')),
      }, 'Enter')),
  ));
  return wrap;
});

// ------------------------------------------------------------------ corner

registerScreen('parent', () => {
  const st = store.state;
  const wrap = h('div', { class: 'screen' });
  wrap.append(h('header', { class: 'topbar' },
    h('button', { class: 'iconbtn', onclick: () => go('home'), 'aria-label': 'Back' }, '←'),
    h('div', { class: 'topbar-title' }, 'Parent corner'),
    h('span', { class: 'iconbtn ghost' }),
  ));

  // ---- child
  const nameIn = h('input', { value: st.shell.name, placeholder: "Child's name" });
  wrap.append(h('div', { class: 'card' },
    h('h3', {}, 'Child'),
    h('div', { class: 'row gap' }, nameIn,
      h('button', {
        class: 'btn primary',
        onclick: () => { st.shell.name = nameIn.value.trim(); store.save(); toast('Saved'); },
      }, 'Save')),
  ));

  // ---- AI tutor key (stored on this device only; stripped from backups)
  const keyIn = h('input', { type: 'password', value: st.shell.apiKey, placeholder: 'Anthropic API key' });
  wrap.append(h('div', { class: 'card' },
    h('h3', {}, 'AI tutor'),
    h('p', { class: 'muted' }, 'The key stays on this device and is never part of a backup.'),
    h('div', { class: 'row gap' }, keyIn,
      h('button', {
        class: 'btn primary',
        onclick: () => { st.shell.apiKey = keyIn.value.trim(); store.save(); toast('Key saved'); },
      }, 'Save')),
  ));

  // ---- backups
  const download = () => {
    const blob = new Blob([exportJSON(st)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `lernapp-backup-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.append(a); a.click(); a.remove();
    st.shell.lastExport = new Date().toISOString();
    store.save();
  };
  const filePick = (onText) => {
    const inp = h('input', { type: 'file', accept: 'application/json' });
    inp.addEventListener('change', () => {
      const f = inp.files?.[0];
      if (!f) return;
      f.text().then(onText).catch(() => toast('Could not read that file'));
    });
    inp.click();
  };
  wrap.append(h('div', { class: 'card' },
    h('h3', {}, 'Backups'),
    h('div', { class: 'row gap wrap' },
      h('button', { class: 'btn subtle', onclick: download }, '⬇︎ Export backup'),
      h('button', {
        class: 'btn subtle',
        onclick: () => filePick((text) => {
          try {
            store.state = parseImport(text);
            store.save();
            toast('Backup restored');
            go('home');
          } catch (e) { toast(String(e.message || e)); }
        }),
      }, '⬆︎ Restore backup'),
      h('button', {
        class: 'btn subtle',
        onclick: () => filePick((text) => {
          try {
            importY5Backup(store.state, text);
            store.save();
            toast(`Year 5 imported — ${store.state.maths.y5.completed.length} topics for review`);
            go('home');
          } catch (e) { toast(String(e.message || e)); }
        }),
      }, '📦 Import Year 5 (PowerMath) backup'),
    ),
    h('p', { class: 'muted' }, `Curricula on this device: ${curricula(st).join(', ')}`),
  ));

  // ---- danger
  wrap.append(h('div', { class: 'card' },
    h('h3', {}, 'Start over'),
    h('button', {
      class: 'btn subtle danger',
      onclick: () => {
        if (confirm('Delete ALL progress on this device? Export a backup first!')) {
          wipe(); location.reload();
        }
      },
    }, 'Delete everything'),
  ));

  return wrap;
});
