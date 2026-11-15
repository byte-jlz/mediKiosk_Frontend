import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import '../index.css';
import '../kiosk-app/kiosk.css';
import Movie from './Movie';
import { LENGTH } from './timeline';

const overlay = new URLSearchParams(location.search).get('overlay') !== '0';
const root = createRoot(document.getElementById('root'));
flushSync(() => root.render(<Movie overlay={overlay} />));

window.__length = LENGTH;
window.__frame = (ms) => {
  window.__vt(ms);
  flushSync(() => window.__setT(ms));
  window.__tick();
};
window.__ready = true;
