export function Header() {
  const el = document.createElement('nav');
  el.className = 'topnav';
  el.innerHTML = `
    <a href="#/planner" data-route="/planner">Planner</a>
    <a href="#/list" data-route="/list">Lista</a>
    <a href="#/pantry" data-route="/pantry">Dispensa</a>
    <a href="#/settings" data-route="/settings">Impostazioni</a>
    <span class="spacer"></span>
    <span class="small">beta v0.2</span>
  `;
  const setActive = () => {
    const path = (location.hash.slice(1) || '/planner').toLowerCase();
    el.querySelectorAll('a[data-route]').forEach(a => {
      a.classList.toggle('active', a.getAttribute('data-route') === path);
    });
  };
  window.addEventListener('hashchange', setActive);
  setActive();
  return el;
}