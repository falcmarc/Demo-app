// src/app.js
import Header from './components/header.js';
import { mount } from './router.js';

import Landing from './modules/landing/index.js';
import Planner from './modules/planner/index.js';
import StartSettings from './modules/start/index.js';
import Recipes from './modules/recipes/index.js';
import Foods from './modules/foods/index.js';
import Allergies from './modules/allergies/index.js';
import Login from './modules/login/index.js';
import NotFound from './modules/notfound/index.js';

import BottomNav from './components/BottomNav.js';
import { applyPlatformClass } from './lib/device.js';
import { getUserCached, onAuthChange } from './lib/auth.js';

function bootstrap() {
  const header = document.getElementById('header');
  const app = document.getElementById('app');
  const bottom = document.getElementById('bottom-nav');

  if (!header || !app) {
    console.error('[app] Contenitori mancanti (#header o #app). Controlla index.html');
    return;
  }
  if (!bottom) {
    console.warn('[app] #bottom-nav non trovato. La bottom bar non verrà renderizzata.');
  }

  // Monta header
  try { header.appendChild(Header()); } catch (e) { console.error('[app] header error', e); }

  // Rotte
  const routes = {
    '/': Landing,
    '/home': Landing,
    '/planner': Planner,
    '/settings': StartSettings,
    '/recipes': Recipes,
    '/foods': Foods,
    '/allergies': Allergies,
    '/login': Login,
  };

  function renderBottom(activeKey){
    if (!bottom) return; // safe
    bottom.innerHTML = '';
    bottom.appendChild(BottomNav(activeKey));
  }

  function onRouteChange(){
    const key = location.hash.replace('#','') || '/home';
    const base = key.split('?')[0];

    // Gate semplice: richiedi login su queste pagine
    const needsAuth = ['/planner','/settings','/recipes','/foods','/allergies'];
    if (needsAuth.includes(base) && !getUserCached()) {
      location.hash = '#/login';
      return;
    }

    renderBottom(base);
    applyPlatformClass();
  }

  // Reagisci a login/logout
  onAuthChange(() => { onRouteChange(); });

  // Avvia router
  mount(app, routes, NotFound, onRouteChange);
}

// 🔐 Attendi il DOM PRIMA di avviare tutto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
  bootstrap();
}
