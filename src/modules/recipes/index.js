// src/modules/recipes/index.js
export default function Recipes(){
  const el = document.createElement('div');
  el.className='card';
  el.innerHTML = `<h1>Le mie ricette</h1><p class="small">Qui vedrai preferite e create da te (coming soon).</p>`;
  return el;
}
