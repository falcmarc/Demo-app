// src/modules/notfound/index.js
export default function NotFound(){
  const el = document.createElement('div');
  el.className='card';
  el.innerHTML = `<h1>Pagina non trovata</h1><p class="small">Il percorso richiesto non esiste.</p>`;
  return el;
}
