// src/router.js
//
// Router hash-based super leggero.
// Uso:
//   import { mount, navigate } from './router.js'
//   mount(rootEl, routes, NotFound, onRouteChange)
//
// - routes: { '/home': CompFn, '/planner': CompFn, ... }
// - CompFn può restituire un Node o una Promise<Node>
// - onRouteChange(path) viene chiamato ad ogni navigazione
//

let _root = null;
let _routes = {};
let _NotFound = null;
let _onChange = null;
let _current = null;

function getPath() {
  const raw = location.hash.replace('#', '') || '/home';
  // tieni solo la parte prima di eventuali query
  return raw.split('?')[0] || '/home';
}

async function render() {
  if (!_root) return;
  const path = getPath();
  const Comp = _routes[path] || _NotFound;

  // Avvisa chi vuole aggiornare UI esterna (es. bottom bar)
  try { _onChange && _onChange(); } catch {}

  // Monta il componente
  let node = null;
  try {
    const maybe = Comp ? Comp() : null;
    node = (maybe && typeof maybe.then === 'function') ? await maybe : maybe;
  } catch (e) {
    console.error('[router] errore nel componente', e);
    node = errorCard(e);
  }

  // Rimpiazza contenuto
  _root.innerHTML = '';
  if (node instanceof Node) _root.appendChild(node);
  else _root.appendChild(fallbackNode());

  _current = path;
}

function fallbackNode() {
  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `<h1>Ops</h1><p class="small">Contenuto non disponibile.</p>`;
  return el;
}

function errorCard(err) {
  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `<h1>Errore</h1><pre class="small" style="white-space:pre-wrap">${String(err?.message || err)}</pre>`;
  return el;
}

export function mount(rootEl, routes, NotFound, onRouteChange) {
  _root = rootEl;
  _routes = routes || {};
  _NotFound = NotFound || (() => fallbackNode());
  _onChange = onRouteChange || null;

  // ascolta cambi hash
  window.addEventListener('hashchange', render, { passive: true });
  // prima render
  render();
}

export function navigate(path) {
  if (!path.startsWith('#')) path = '#' + path;
  if (location.hash !== path) location.hash = path;
  else render(); // se già lì, forza rerender (utile dopo login)
}

// opzionale: expose current path
export function currentPath() {
  return _current || getPath();
}
