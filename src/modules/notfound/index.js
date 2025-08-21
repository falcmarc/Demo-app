export default function NotFound() {
  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `
    <h1>404</h1>
    <p>Pagina non trovata.</p>
    <p class="small"><a href="#/home">Vai a Home</a></p>
  `;
  return el;
}