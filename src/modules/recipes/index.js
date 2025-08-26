// src/modules/recipes/index.js
// Editor ricette con:
// - TAG a flag (colazione/pranzo/merenda/cena)
// - Tabella ingredienti (quantità, unità, ingrediente) con + / −
// - Kcal/porzione calcolate automaticamente da mini DB (override possibile)
// - Foto piatto (salvata come dataURL locale)
// - Sezioni: Preferite / Assegnate / Mie / Pubbliche

import { getRecipes } from '../../data/recipes.js';
import {
  getFavorites, toggleFavorite,
  getAssigned, getMyRecipes, saveMyRecipes,
  getVisibilityMap, setVisibility,
  getRatings, setRating
} from '../../lib/store.js';

/** Mini DB nutrizionale (kcal per 100 g/ml/pezzo).
 *  Il match è per "keyword" in lowercase sull'ingrediente.
 *  Puoi estenderlo liberamente.
 */
const NUTRITION = [
  { kw: ['pasta','spaghetti','penne'], unit:'g', kcal100: 350 },
  { kw: ['riso'], unit:'g', kcal100: 345 },
  { kw: ['pollo','petto di pollo'], unit:'g', kcal100: 165 },
  { kw: ['manzo','bovino','carne di manzo'], unit:'g', kcal100: 250 },
  { kw: ['maiale','carne di maiale'], unit:'g', kcal100: 300 },
  { kw: ['tonno'], unit:'g', kcal100: 132 },
  { kw: ['salmon'], unit:'g', kcal100: 208 },
  { kw: ['uovo','uova'], unit:'pz', kcal100: 155, perPiece: 70 }, // approx 1 uovo ~ 45g, 70 kcal
  { kw: ['latte'], unit:'ml', kcal100: 64 },
  { kw: ['olio','olio d\'oliva'], unit:'g', kcal100: 884 },
  { kw: ['burro'], unit:'g', kcal100: 717 },
  { kw: ['zucchero'], unit:'g', kcal100: 387 },
  { kw: ['pomodoro'], unit:'g', kcal100: 18 },
  { kw: ['cipolla'], unit:'g', kcal100: 40 },
  { kw: ['aglio'], unit:'g', kcal100: 149 },
  { kw: ['pane'], unit:'g', kcal100: 265 },
  { kw: ['yogurt','yoghurt'], unit:'g', kcal100: 60 },
  { kw: ['mela','mele'], unit:'g', kcal100: 52 },
  { kw: ['banana','banane'], unit:'g', kcal100: 89 },
];

/** Trova kcal per 100 unità (g/ml) o per pezzo. */
function kcalFor(ingredientName, unit){
  const name = (ingredientName||'').toLowerCase();
  const u = (unit||'').toLowerCase();
  const row = NUTRITION.find(r => r.kw.some(k => name.includes(k)));
  if (!row) return { mode:'unknown', kcal100: null, perPiece: null };
  if (row.unit === 'pz') return { mode:'piece', perPiece: row.perPiece ?? 70 };
  // g / ml: stessa logica kcal per 100
  return { mode: (u==='ml'?'ml':'g'), kcal100: row.kcal100 };
}

export default function Recipes(){
  const el = document.createElement('div');
  el.className='card';
  el.innerHTML = `
    <h1>Ricette</h1>

    <div style="display:flex; gap:8px; flex-wrap:wrap; margin:8px 0">
      <button class="btn secondary tabBtn" data-tab="fav">⭐ Preferite</button>
      <button class="btn secondary tabBtn" data-tab="asg">👨‍⚕️ Assegnate</button>
      <button class="btn secondary tabBtn" data-tab="mine">✍️ Mie</button>
      <button class="btn secondary tabBtn" data-tab="pub">🌍 Pubbliche</button>
      <div style="margin-left:auto; display:flex; gap:8px">
        <button id="addMine" class="btn">+ Nuova ricetta</button>
      </div>
    </div>

    <div id="list" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(260px,1fr)); gap:10px"></div>

    <!-- EDITOR -->
    <div id="editor" class="card" style="margin-top:10px; display:none">
      <h3 id="edTitle">Nuova ricetta</h3>

      <div style="display:grid; gap:8px; grid-template-columns:1fr 1fr">
        <div>
          <label class="small">Nome</label>
          <input id="edName" class="input" placeholder="Titolo ricetta" />
        </div>

        <div>
          <label class="small">Kcal/porzione</label>
          <div style="display:flex; gap:6px; align-items:center">
            <input id="edKcal" type="number" class="input" placeholder="auto" readonly>
            <label class="small" style="display:flex; gap:6px; align-items:center">
              <input id="edKcalOverride" type="checkbox"> override
            </label>
          </div>
        </div>

        <div>
          <label class="small">Tags (flag)</label>
          <div id="edTagsFlags" class="tags-box">
            <label><input type="checkbox" value="colazione"> Colazione</label>
            <label><input type="checkbox" value="pranzo"> Pranzo</label>
            <label><input type="checkbox" value="merenda"> Merenda</label>
            <label><input type="checkbox" value="cena"> Cena</label>
          </div>
        </div>

        <div>
          <label class="small">Porzioni base</label>
          <input id="edServ" type="number" class="input" placeholder="es. 2" value="2" min="1"/>
        </div>
      </div>

      <div style="display:grid; gap:8px; grid-template-columns:1fr 1fr; margin-top:8px">
        <div>
          <label class="small">Ingredienti</label>
          <table id="ingTable" class="ing-table">
            <thead>
              <tr><th style="width:110px">Quantità</th><th style="width:90px">Unità</th><th>Ingrediente</th><th style="width:40px"></th></tr>
            </thead>
            <tbody></tbody>
          </table>
          <button id="addIng" class="btn secondary">+ Aggiungi ingrediente</button>
          <div class="small" style="margin-top:6px">Unità supportate: <code>g</code>, <code>ml</code>, <code>pz</code> (pezzi)</div>
        </div>

        <div>
          <label class="small">Foto del piatto</label>
          <input id="edPhoto" type="file" accept="image/*" class="input">
          <img id="edPhotoPreview" alt="" style="display:none; width:100%; margin-top:8px; border-radius:10px; border:1px solid var(--border)">
        </div>
      </div>

      <div style="margin-top:8px">
        <label class="small">Procedimento (uno step per riga)</label>
        <textarea id="edSteps" class="input" style="width:100%; min-height:120px" placeholder="Bollire l'acqua...\nSaltare in padella..."></textarea>
      </div>

      <div style="display:flex; gap:8px; margin-top:10px">
        <button id="saveMine" class="btn">Salva</button>
        <button id="cancelMine" class="btn secondary">Annulla</button>
      </div>
    </div>
  `;

  const list   = el.querySelector('#list');
  const editor = el.querySelector('#editor');

  // editor refs
  const ed = {
    title: el.querySelector('#edTitle'),
    name:  el.querySelector('#edName'),
    kcal:  el.querySelector('#edKcal'),
    kcalOv:el.querySelector('#edKcalOverride'),
    serv:  el.querySelector('#edServ'),
    tagsBox: el.querySelector('#edTagsFlags'),
    steps: el.querySelector('#edSteps'),
    photo: el.querySelector('#edPhoto'),
    photoPrev: el.querySelector('#edPhotoPreview'),
    ingTable: el.querySelector('#ingTable tbody'),
    addIng: el.querySelector('#addIng'),
    save: el.querySelector('#saveMine'),
    cancel: el.querySelector('#cancelMine'),
  };

  let ALL = [];
  let tab = 'fav';
  let editId = null;
  let photoDataURL = "";

  (async ()=>{
    ALL = await getRecipes();     // ricette pubbliche dai JSON
    render();
  })();

  // Tabs
  el.querySelectorAll('.tabBtn').forEach(b=>{
    b.addEventListener('click', ()=>{ tab = b.dataset.tab; render(); });
  });

  // --- EDITOR handlers
  el.querySelector('#addMine').addEventListener('click', openNew);
  ed.cancel.addEventListener('click', ()=>{ editor.style.display='none'; });

  ed.addIng.addEventListener('click', ()=> addIngRow());

  ed.serv.addEventListener('input', recalcKcalAuto);
  ed.kcalOv.addEventListener('change', ()=>{
    ed.kcal.readOnly = !ed.kcalOv.checked;
    if (!ed.kcalOv.checked) recalcKcalAuto();
  });

  ed.photo.addEventListener('change', async (e)=>{
    const file = e.target.files?.[0];
    if (!file) { photoDataURL=""; ed.photoPrev.style.display='none'; ed.photoPrev.src=""; return; }
    const dataURL = await fileToDataURL(file);
    photoDataURL = dataURL;
    ed.photoPrev.src = dataURL;
    ed.photoPrev.style.display = '';
  });

  ed.save.addEventListener('click', ()=>{
    const name = ed.name.value.trim();
    if (!name) return;

    const tags = Array.from(ed.tagsBox.querySelectorAll('input:checked')).map(i=>i.value);
    const serv = Math.max(1, +ed.serv.value || 2);

    const ingredients = readIngRows(); // [{qty, unit, item}]
    const steps = ed.steps.value.split('\n').map(s=>s.trim()).filter(Boolean);

    // kcal: se override uso quello; altrimenti calcolato
    const kcalPerServing = ed.kcalOv.checked
      ? (+ed.kcal.value || null)
      : (autoKcal(ingredients, serv));

    const mine = getMyRecipes();
    if (editId) {
      const i = mine.findIndex(r=>r.id===editId);
      if (i>=0) mine[i] = {
        ...mine[i],
        name, tags, servings:serv, ingredients, steps,
        kcalPerServing, photo: photoDataURL || mine[i].photo || ''
      };
    } else {
      const id = 'mine:'+Date.now();
      mine.push({ id, name, tags, servings:serv, ingredients, steps, kcalPerServing, photo: photoDataURL || '' });
    }
    saveMyRecipes(mine);
    editor.style.display='none';
    render();
  });

  function openNew(){
    editId = null;
    editor.style.display = '';
    ed.title.textContent = 'Nuova ricetta';
    ed.name.value = '';
    ed.kcal.value = '';
    ed.kcal.readOnly = true; ed.kcalOv.checked = false;
    ed.serv.value = 2;
    ed.steps.value = '';
    photoDataURL = ''; ed.photo.value=''; ed.photoPrev.src=''; ed.photoPrev.style.display='none';
    ed.tagsBox.querySelectorAll('input').forEach(i=> i.checked = false);
    ed.ingTable.innerHTML = '';
    addIngRow(); addIngRow(); // due righe iniziali
    window.scrollTo({ top: el.offsetTop + el.offsetHeight, behavior:'smooth' });
  }

  function openEdit(r){
    editId = r.id;
    editor.style.display = '';
    ed.title.textContent = 'Modifica ricetta';
    ed.name.value = r.name || '';
    ed.serv.value = r.servings || 2;
    ed.steps.value = (r.steps||[]).join('\n');
    photoDataURL = r.photo || ''; ed.photo.value=''; ed.photoPrev.src=photoDataURL; ed.photoPrev.style.display = photoDataURL ? '' : 'none';
    ed.tagsBox.querySelectorAll('input').forEach(i=> i.checked = (r.tags||[]).includes(i.value));
    ed.ingTable.innerHTML = '';
    (r.ingredients||[]).forEach(ing => addIngRow(ing.qty||0, ing.unit||'g', ing.item||''));
    if (!r.ingredients?.length) addIngRow();
    // kcal
    ed.kcal.readOnly = true; ed.kcalOv.checked = false;
    ed.kcal.value = r.kcalPerServing ?? ''; // mostro quello salvato
    recalcKcalAuto();                       // ricalcolo (non sovrascrive se override)
    window.scrollTo({ top: el.offsetTop + el.offsetHeight, behavior:'smooth' });
  }

  // --------------- RENDER LISTE
  function render(){
    const fav = new Set(getFavorites());
    const vis = getVisibilityMap();
    const ratings = getRatings();
    const mine = getMyRecipes();
    const assigned = new Set(getAssigned());

    let data = [];
    if (tab==='fav') data = ALL.filter(r=> fav.has(r.id)).concat(mine.filter(r=> fav.has(r.id)));
    if (tab==='asg') data = ALL.filter(r=> assigned.has(r.id)).concat(mine.filter(r=> assigned.has(r.id)));
    if (tab==='mine') data = mine;
    if (tab==='pub') data = [...ALL, ...mine.filter(r=> vis[r.id]==='public')];

    list.innerHTML = data.map(r => card(r, {
      isMine: r.id?.startsWith?.('mine:'),
      fav: fav.has(r.id),
      rating: ratings[r.id] || 0,
      visibility: (r.id?.startsWith?.('mine:') ? (vis[r.id] || 'private') : 'public'),
    })).join('');

    // Azioni card
    list.querySelectorAll('[data-act="fav"]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.dataset.id;
        const after = new Set(toggleFavorite(id));
        btn.classList.toggle('active', after.has(id));
      });
    });
    list.querySelectorAll('[data-act="rate"]').forEach(div=>{
      div.addEventListener('click', (e)=>{
        const id = div.dataset.id;
        const v = +e.target?.dataset?.v || 0;
        if (!v) return;
        setRating(id, v);
        Array.from(div.querySelectorAll('.star')).forEach((s,idx)=> s.classList.toggle('active', idx < v));
      });
    });
    list.querySelectorAll('[data-act="vis"]').forEach(sel=>{
      sel.addEventListener('change', ()=> setVisibility(sel.dataset.id, sel.value));
    });
    list.querySelectorAll('[data-act="edit"]').forEach(b=>{
      b.addEventListener('click', ()=>{
        const id = b.dataset.id;
        const r = getMyRecipes().find(x=>x.id===id);
        if (r) openEdit(r);
      });
    });
  }

  function card(r, meta){
    const stars = [1,2,3,4,5].map(i=>`<span class="star ${i<=meta.rating?'active':''}" data-v="${i}">★</span>`).join('');
    const photo = r.photo ? `<img src="${r.photo}" alt="" style="width:100%; border-radius:10px; border:1px solid var(--border)">` : '';
    const controlsMine = meta.isMine ? `
      <div class="small" style="display:flex; gap:6px; align-items:center; flex-wrap:wrap">
        <label>Visibilità</label>
        <select class="input" data-act="vis" data-id="${r.id}" style="height:36px">
          <option value="private" ${meta.visibility==='private'?'selected':''}>Privata</option>
          <option value="public" ${meta.visibility==='public'?'selected':''}>Pubblica</option>
        </select>
        <button class="btn secondary" data-act="edit" data-id="${r.id}">Modifica</button>
      </div>` : '';

    return `
      <div class="card" style="display:flex; flex-direction:column; gap:8px">
        ${photo}
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px">
          <div style="font-weight:600">${r.name}</div>
          <button class="fav-btn ${meta.fav?'active':''}" data-act="fav" data-id="${r.id}">⭐</button>
        </div>
        <div class="small">${(r.tags||[]).join(' · ')}</div>
        <div class="small">Kcal/porz: <strong>${r.kcalPerServing ?? 'n.d.'}</strong> · Porzioni base: ${r.servings||2}</div>
        <div class="stars" data-act="rate" data-id="${r.id}">${stars}</div>
        ${controlsMine}
      </div>`;
  }

  // --------------- INGREDIENTS TABLE HELPERS
  function addIngRow(qty=0, unit='g', item=''){
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="number" class="input small ing-qty" value="${qty}" step="0.1" min="0"></td>
      <td><input type="text" class="input small ing-unit" value="${unit}"></td>
      <td><input type="text" class="input small ing-item" value="${item}"></td>
      <td><button class="btn secondary ing-del" title="Rimuovi">−</button></td>
    `;
    ed.ingTable.appendChild(tr);
    tr.querySelectorAll('input').forEach(inp => inp.addEventListener('input', recalcKcalAuto));
    tr.querySelector('.ing-del').addEventListener('click', ()=>{ tr.remove(); recalcKcalAuto(); });
    recalcKcalAuto();
  }

  function readIngRows(){
    return Array.from(ed.ingTable.querySelectorAll('tr')).map(tr=>{
      const qty  = parseFloat(tr.querySelector('.ing-qty').value.replace(',','.')) || 0;
      const unit = (tr.querySelector('.ing-unit').value || 'g').trim();
      const item = (tr.querySelector('.ing-item').value || '').trim();
      return { qty, unit, item };
    }).filter(r => r.item);
  }

  function autoKcal(ingredients, servingsBase){
    // somma kcal totali degli ingredienti
    let tot = 0;
    for (const ing of ingredients){
      const { mode, kcal100, perPiece } = kcalFor(ing.item, ing.unit);
      if (mode === 'piece' && perPiece && ing.qty){
        tot += perPiece * ing.qty; // qty = numero pezzi
      } else if ((mode==='g' || mode==='ml') && kcal100 && ing.qty){
        tot += (ing.qty * kcal100) / 100;
      }
    }
    const perServing = servingsBase > 0 ? Math.round(tot / servingsBase) : null;
    return perServing || null;
  }

  function recalcKcalAuto(){
    if (ed.kcalOv.checked) return; // se override attivo non toccare
    const ing = readIngRows();
    const serv = Math.max(1, +ed.serv.value || 2);
    const val = autoKcal(ing, serv);
    ed.kcal.value = (val ?? '');
  }

  async function fileToDataURL(file){
    return new Promise((res, rej)=>{
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = rej;
      fr.readAsDataURL(file);
    });
  }

  return el;
}
