import { sampleRUM } from './aem.js';

sampleRUM('cwv');

window.dispatchEvent(new Event('aem-app-ready'));
document.body.classList.add('aem-app-rendered');
