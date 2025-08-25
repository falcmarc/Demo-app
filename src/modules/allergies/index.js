// src/modules/allergies/index.js
export default function Allergies(){
  const el = document.createElement('div');
  el.className='card';
  el.innerHTML = `<h1>Allergie e intolleranze</h1><p class="small">Seleziona allergeni per filtrare ricette (coming soon).</p>`;
  return el;
}
