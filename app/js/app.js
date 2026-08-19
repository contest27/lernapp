import { mount, go, store, cur, onAfterRender } from './shell/core.js';
import './ui/home.js';
import './ui/today.js';
import './ui/map.js';
import './ui/session.js';
import './ui/parent.js';
import { mountBuddy, updateBuddy } from './ui/buddy.js';
// English module (Wordforge port) — self-registering screens, same pattern
// as the maths ui/*.js imports above.
import './english/ui/home.js';
import './english/ui/read.js';
import './english/ui/talk.js';
import './english/ui/create.js';

mount(document.getElementById('root'));

// Focused practice is a same-run bonus: never resume it across reloads, so it
// can never shadow a resumable daily lesson on the next launch.
if (cur().focusSession) { cur().focusSession = null; store.save(); }

// Global buddy FAB: mounted once outside #root, refreshed on every navigation.
mountBuddy();
onAfterRender(updateBuddy);

go('home');

// Offline support once served over http(s). Skipped on localhost so local
// development and the test runner always see fresh files.
const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !isLocal) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
