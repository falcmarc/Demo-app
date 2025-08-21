import { Header } from './components/Header.js';
import { mount } from './router.js';
import Home from './modules/home/index.js';
import Auth from './modules/auth/index.js';
import NotFound from './modules/notfound/index.js';

const header = document.getElementById('header');
const app = document.getElementById('app');

header.appendChild(Header());

const routes = {
  '/': Home,
  '/home': Home,
  '/auth': Auth
};

mount(app, routes, NotFound);