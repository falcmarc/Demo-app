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

const header = document.getElementById('header');
const app = document.getElementById('app');
const bottom = document.getElementById('bottom-nav');

header.appendChild(Header());

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
  bottom.innerHTML = '';
  bottom.appendChild(BottomNav(activeKey));
}

function onRouteChange(){
  const key = location.hash.replace('#','') || '/home';
  const base = key.split('?')[0];

  // Gate semplice: se prova ad aprire planner/settings senza login → manda a /login
  const needsAuth = ['/planner','/settings','/recipes','/foods','/allergies'];
  if (needsAuth.includes(base) && !getUserCached()) {
    location.hash = '#/login';
    return;
  }

  renderBottom(base);
  applyPlatformClass();
}

// aggiorna UI su login/logout
onAuthChange(() => {
  onRouteChange();
});

mount(app, routes, NotFound, onRouteChange);