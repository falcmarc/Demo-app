// src/modules/allergies/index.js
// UI: selezione allergeni + cibi preferiti (lista separata da virgola)

import { ALLERGENS } from '../../lib/allergens.js';

const SETTINGS_KEY = 'app.settings';
function loadSettings(){
  return JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null') || {};
}
function saveSettings(s){
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export default function Allergies() {
  const s = loadSettings();
  const selected = new Set(s.allergens || []);
  const favFoods = (s.favFoods || []).join(', ');

  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `
    <h1>Allergeni & Preferiti</h1>
    <p class="small">Seleziona gli allergeni da evitare e indica i tuoi cibi/ingredienti preferiti (separati da virgola).</p>

    <h3 style="margin:10px 0 6px">Allergeni</h3>
    <div id="alg" style="display:flex; flex-wrap:wrap; gap:8px"></div>

    <h3 style="margin:16px 0 6px">Cibi preferiti</h3>
    <input id="fav" class="input" placeholder="es. pollo, tonno, zucchine, salmone" style="width:100%; height:44px" value="${favFoods}"/>

    <div style="display:flex; gap:8px; margin-top:12px">
      <button id="save" class="btn">Salva</button>
    </div>
  `;

  const box = el.querySelector('#alg');
  ALLERGENS.forEach(a=>{
    const b = document.createElement('button');
    b.className = 'chip';
    b.textContent = a.label;
    b.dataset.key = a.key;
    if (selected.has(a.key)) b.classList.add('active');
    b.addEventListener('click', ()=> b.classList.toggle('active'));
    box.appendChild(b);
  });

  el.querySelector('#save').addEventListener('click', ()=>{
    const sel = Array.from(box.querySelectorAll('.chip.active')).map(b=>b.dataset.key);
    const favs = (el.querySelector('#fav').value || '')
                  .split(',')
                  .map(x=>x.trim())
                  .filter(Boolean);
    const cur = loadSettings();
    cur.allergens = sel;
    cur.favFoods = favs;
    saveSettings(cur);
    alert('Preferenze salvate ✅');
  });

  return el;
}
