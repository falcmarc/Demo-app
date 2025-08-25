// src/components/BottomNav.js
export default function BottomNav(active = '/home') {
  const nav = document.createElement('div');
  nav.className = 'wrap';

  const tabs = [
    { href: '#/home',        key:'/home',     label:'Home',         ico:'🏠' },
    { href: '#/settings',    key:'/settings', label:'Impostazioni', ico:'⚙️' },
    { href: '#/recipes',     key:'/recipes',  label:'Le mie ricette', ico:'🍽️' },
    { href: '#/foods',       key:'/foods',    label:'I miei cibi',  ico:'🧺' },
    { href: '#/allergies',   key:'/allergies',label:'Allergie',     ico:'🚫' },
    { href: '#/login',       key:'/login',    label:'Login PRO',    ico:'👨‍⚕️' }
  ];

  nav.innerHTML = tabs.map(t => `
    <a class="tab ${active===t.key?'active':''}" href="${t.href}" data-key="${t.key}">
      <div class="ico">${t.ico}</div>
      <div>${t.label}</div>
    </a>
  `).join('');

  return nav;
}