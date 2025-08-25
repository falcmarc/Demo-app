// src/modules/landing/index.js
import { isMobile } from '../../lib/device.js';

export default function Landing(){
  const el = document.createElement('div');
  el.className = 'hero card';
  el.innerHTML = `
    <div class="hero-content">
      <h1>Organizza la tua spesa</h1>
      <p class="small">${isMobile() ? 'Ottimizzato per il tuo telefono' : 'Perfetto anche su desktop'}</p>
      <div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:center">
        <button id="startBtn" class="btn" style="min-width:230px">Inizia la tua spesa</button>
        <a class="btn secondary" href="#/settings">Impostazioni familiari</a>
      </div>
    </div>
  `;
  el.querySelector('#startBtn').addEventListener('click', ()=>{
    const hasSettings = !!localStorage.getItem('app.settings');
    window.location.hash = hasSettings ? '#/planner' : '#/settings';
  });
  return el;
}
