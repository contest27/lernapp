import { mount, go } from './shell/core.js';
import './ui/home.js';
import './ui/parent.js';

mount(document.getElementById('root'));
go('home');

// Register the service worker only off-localhost, or local testing fights the
// precache (Y5 [LEARN:pwa]).
if ('serviceWorker' in navigator && !['localhost', '127.0.0.1'].includes(location.hostname)) {
  navigator.serviceWorker.register('sw.js');
}
