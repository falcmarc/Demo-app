export function Header() {
  const el = document.createElement('nav');
  el.className = 'topnav';
  el.innerHTML = `
    <a href="#/" data-route="/">Demo</a>
    <a href="#/home" data-route="/home">Home</a>
    <a href="#/auth" data-route="/auth">Login</a>
    <span class="spacer"></span>
    <span class="small">v0.1.0</span>
  `;
  // Evidenzia la voce attiva
  const setActive = () => {
    el.querySelectorAll('a[data-route]').forEach(a => {
      const path = location.hash.slice(1) || '/';
      a.classList.toggle('active', a.getAttribute('data-route') === path);
    });
  };
  window.addEventListener('hashchange', setActive);
  setActive();
  return el;
}