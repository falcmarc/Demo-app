// src/modules/foods/index.js
export default function Foods(){
  const el = document.createElement('div');
  el.className='card';
  el.innerHTML = `<h1>I miei cibi</h1><p class="small">Gestisci alimenti, preferiti e blacklist (coming soon).</p>`;
  return el;
}
