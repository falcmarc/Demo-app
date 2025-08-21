// Router minimale basato su hash (#/home, #/auth, …)
export function mount(appEl, routes, fallback) {
  const render = () => {
    const path = (location.hash.slice(1) || '/').toLowerCase();
    const Component = routes[path] || fallback;
    appEl.innerHTML = '';
    appEl.appendChild(Component());
  };
  window.addEventListener('hashchange', render);
  render(); // prima render
}