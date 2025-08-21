import { Header } from './components/Header.js';
import { mount } from './router.js';
import Start from './modules/start/index.js';
import Planner from './modules/planner/index.js';
import List from './modules/list/index.js';
import Pantry from './modules/pantry/index.js';
import Settings from './modules/settings/index.js';
import NotFound from './modules/notfound/index.js';

const header = document.getElementById('header');
const app = document.getElementById('app');
header.appendChild(Header());

const routes = {
  '/': Start,          // 👈 pagina iniziale
  '/start': Start,
  '/planner': Planner,
  '/list': List,
  '/pantry': Pantry,
  '/settings': Settings,
};

mount(app, routes, NotFound);
