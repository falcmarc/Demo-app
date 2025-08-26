// src/modules/recipes/index.js
//
// Editor ricette con flag tags, tabella ingredienti, kcal auto da computeMacrosAsync
//

import { computeMacrosAsync } from '../../lib/nutritionService.js';

const TAGS = ['Colazione','Pranzo','Merenda','Cena'];
const RECIPES_KEY = 'app.recipes';

function loadRecipes(){ return JSON.parse(localStorage.getItem(RECIPES_KEY) || '[]'); }
function saveRecipes(r){ localStorage.setItem(RECIPES_KEY, JSON.stringify(r)); }

export default function Recipes(){
  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `
    <h1>Nuova ricetta</h1>

    <div style="display:grid; gap:12px">
      <label>Nome
        <input id="r-name" class="input" placeholder="Titolo ricetta">
      </label>

      <div>
        <span class="small">Tags (flag)</span><br>
        <div id="r-tags" style="display:flex; gap:8px; flex-wrap:wrap; margin-top:4px"></div>
      </div>

      <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:center">
        <label>Kcal/porzione
          <input id="r-kcal" class="input small" placeholder="auto" style="width:100px">
        </label>
        <label><input type="checkbox" id="r-kcal-ov"> override</label>
        <label>Porzioni base
          <input id="r-serv" type="number" class="input small" value="2" min="1" style="width:80px">
        </label>
      </div>

      <div>
        <span class="small">Ingredienti</span>
        <table id="r-ing" style="width:100%; margin-top:6px; border-spacing:6px">
          <thead>
            <tr><th>Quantità</th><th>Unità</th><th>Ingrediente</th><th></th></tr>
          </thead>
          <tbody></tbody>
        </table>
        <button id="r-addIng" class="btn secondary">+ Aggiungi ingrediente</button>
        <div class="small">Unità supportate: g, ml, pz (pezzi)</div>
      </div>

      <div>
        <span class="small">Procedimento</span>
        <textarea id="r-steps" class="input" rows="4" placeholder="Uno step per riga"></textarea>
      </div>

      <div>
        <span class="small">Foto del piatto</span><br>
        <input type="file" id="r-photo" accept="image/*">
        <div id="r-photoPreview" style="margin-top:8px"></div>
      </div>

      <div style="display:flex; gap:10px; margin-top:12px">
        <button id="r-save" class="btn">Salva</button>
        <button id="r-cancel" class="btn secondary">Annulla</button>
      </div>
    </div>
  `;

  // refs
  const ed = {
    name: el.querySelector('#r-name'),
    kcal: el.querySelector('#r-kcal'),
    kcalOv: el.querySelector('#r-kcal-ov'),
    serv: el.querySelector('#r-serv'),
    ingTable: el.querySelector('#r-ing tbody'),
    addIng: el.querySelector('#r-addIng'),
    steps: el.querySelector('#r-steps'),
    save: el.querySelector('#r-save'),
    cancel: el.querySelector('#r-cancel'),
    tagsBox: el.querySelector('#r-tags'),
    photo: el.querySelector('#r-photo'),
    photoPrev: el.querySelector('#r-photoPreview')
  };

  // render tags come flag
  TAGS.forEach(tag=>{
    const id = 'tag_'+tag.toLowerCase();
    const lbl = document.createElement('label');
    lbl.innerHTML = `<input type="checkbox" value="${tag}"> ${tag}`;
    ed.tagsBox.appendChild(lbl);
  });

  // aggiungi riga ingrediente
  function addIngRow(qty=0, unit='g', item=''){
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="number" class="input small ing-qty" value="${qty}" step="0.1" min="0"></td>
      <td><input type="text"   class="input small ing-unit" value="${unit}"></td>
      <td><input type="text"   class="input small ing-item" value="${item}"></td>
      <td><button class="btn secondary ing-del" title="Rimuovi">−</button></td>
    `;
    ed.ingTable.appendChild(tr);

    // bind
    wireAutoKcalInputs(tr);
    tr.querySelector('.ing-del').addEventListener('click', ()=>{ tr.remove(); recalcKcalAuto(); });
    recalcKcalAuto();
  }
  ed.addIng.addEventListener('click', ()=> addIngRow());

  // file foto
  ed.photo.addEventListener('change', ()=>{
    const file = ed.photo.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e=>{
      const img = document.createElement('img');
      img.src = e.target.result;
      img.style.maxWidth = '200px';
      img.style.borderRadius = '8px';
      ed.photoPrev.innerHTML = '';
      ed.photoPrev.appendChild(img);
    };
    reader.readAsDataURL(file);
  });

  // ingredienti -> array
  function readIngRows(){
    return Array.from(ed.ingTable.querySelectorAll('tr')).map(tr=>{
      const qty  = parseFloat((tr.querySelector('.ing-qty').value || '').replace(',','.')) || 0;
      const unit = (tr.querySelector('.ing-unit').value || 'g').trim();
      const item = (tr.querySelector('.ing-item').value || '').trim();
      return { qty, unit, item };
    }).filter(r => r.item);
  }

  // kcal auto async
  async function recalcKcalAuto(){
    if (ed.kcalOv.checked) return;
    const ing = readIngRows();
    const serv = Math.max(1, +ed.serv.value || 2);

    ed.kcal.value = '';
    ed.kcal.placeholder = 'calcolo…';
    try{
      const { perServing } = await computeMacrosAsync(ing, serv);
      ed.kcal.value = perServing.kcal || '';
    }catch(e){
      console.warn('[recipes] computeMacrosAsync error', e);
      ed.kcal.value = '';
    }finally{
      ed.kcal.placeholder = 'auto';
    }
  }
  function wireAutoKcalInputs(tr){
    tr.querySelectorAll('input').forEach(inp => inp.addEventListener('input', debounce(recalcKcalAuto, 250)));
  }
  ed.serv.addEventListener('input', recalcKcalAuto);

  // salva ricetta
  ed.save.addEventListener('click', ()=>{
    const override = ed.kcalOv.checked;
const kcalField = override ? (+ed.kcal.value || null) : null;

const obj = {
  id: 'r'+Date.now(),
  name: ed.name.value.trim(),
  tags,
  servings: Math.max(1, +ed.serv.value || 2),
  kcalPerServing: kcalField,             // <— null se non override
  ingredients: readIngRows(),
  steps: (ed.steps.value||'').split('\n').map(s=>s.trim()).filter(Boolean),
  photo: ed.photoPrev.querySelector('img')?.src || null
};
  });

  ed.cancel.addEventListener('click', ()=> window.location.hash = '#/planner');

  // aggiungi riga iniziale
  addIngRow();

  return el;
}

// debounce helper
function debounce(fn, ms){
  let t=null;
  return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), ms); };
}
