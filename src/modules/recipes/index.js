// src/modules/recipes/index.js
import { getRecipes } from '../../data/recipes.js';
import {
  getFavorites, toggleFavorite,
  getAssigned, getMyRecipes, saveMyRecipes,
  getVisibilityMap, setVisibility,
  getRatings, setRating
} from '../../lib/store.js';

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

    <div id="editor" class="card" style="margin-top:10px; display:none">
      <h3 id="edTitle">Nuova ricetta</h3>
      <div style="display:grid; gap:8px; grid-template-columns:1fr 1fr">
        <div>
          <label class="small">Nome</label>
          <input id="edName" class="input" placeholder="Titolo ricetta" />
        </div>
        <div>
          <label class="small">Kcal/porzione</label>
          <input id="edKcal" type="number" class="input" placeholder="es. 520" />
        </div>
        <div>
          <label class="small">Tags (virgole)</label>
          <input id="edTags" class="input" placeholder="es. pranzo, pasta, vegetariano" />
        </div>
        <div>
          <label class="small">Porzioni base</label>
          <input id="edServ" type="number" class="input" placeholder="es. 2" value="2"/>
        </div>
      </div>

      <div style="margin-top:8px">
        <label class="small">Ingredienti (uno per riga: quantità unità | ingrediente)</label>
        <textarea id="edIngr" class="input" style="width:100%; min-height:120px" placeholder="200 g | pasta\n150 g | pollo"></textarea>
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

  const list = el.querySelector('#list');
  const editor = el.querySelector('#editor');

  let ALL = [];
  let tab = 'fav';
  let editId = null;

  (async ()=>{
    ALL = await getRecipes();     // ricette pubbliche dai JSON
    render();
  })();

  // Tabs
  el.querySelectorAll('.tabBtn').forEach(b=>{
    b.addEventListener('click', ()=>{ tab = b.dataset.tab; render(); });
  });

  // Editor: nuova ricetta
  el.querySelector('#addMine').addEventListener('click', ()=>{
    editId = null;
    editor.style.display = '';
    el.querySelector('#edTitle').textContent = 'Nuova ricetta';
    el.querySelector('#edName').value = '';
    el.querySelector('#edKcal').value = '';
    el.querySelector('#edTags').value = '';
    el.querySelector('#edServ').value = 2;
    el.querySelector('#edIngr').value = '';
    el.querySelector('#edSteps').value = '';
    window.scrollTo({ top: el.offsetTop + el.offsetHeight, behavior:'smooth' });
  });
  el.querySelector('#cancelMine').addEventListener('click', ()=>{ editor.style.display='none'; });

  el.querySelector('#saveMine').addEventListener('click', ()=>{
    const name = el.querySelector('#edName').value.trim();
    if (!name) return;

    const kcal = +el.querySelector('#edKcal').value || null;
    const tags = el.querySelector('#edTags').value.split(',').map(s=>s.trim()).filter(Boolean);
    const serv = Math.max(1, +el.querySelector('#edServ').value || 2);

    const ing = el.querySelector('#edIngr').value.split('\n').map(r=>{
      const [left, itemRaw] = r.split('|').map(s=>s?.trim()||'');
      if (!left || !itemRaw) return null;
      const m = left.match(/^([\d.,]+)\s*(\w+)?$/); // es. "200 g"
      return { qty: m ? parseFloat(m[1].replace(',','.')) : null, unit: m?.[2] || '', item: itemRaw };
    }).filter(Boolean);

    const steps = el.querySelector('#edSteps').value.split('\n').map(s=>s.trim()).filter(Boolean);

    const mine = getMyRecipes();
    if (editId) {
      const i = mine.findIndex(r=>r.id===editId);
      if (i>=0) mine[i] = { ...mine[i], name, kcalPerServing:kcal, tags, servings:serv, ingredients:ing, steps };
    } else {
      const id = 'mine:'+Date.now();
      mine.push({ id, name, kcalPerServing:kcal, tags, servings:serv, ingredients:ing, steps });
    }
    saveMyRecipes(mine);
    editor.style.display='none';
    render();
  });

  function render(){
    const fav = new Set(getFavorites());
    const vis = getVisibilityMap();
    const ratings = getRatings();
    const mine = getMyRecipes();
    const assigned = new Set(getAssigned()); // placeholder: in futuro da Supabase

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

    // Azioni
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
        if (!r) return;
        editId = id; editor.style.display='';
        el.querySelector('#edTitle').textContent = 'Modifica ricetta';
        el.querySelector('#edName').value = r.name || '';
        el.querySelector('#edKcal').value = r.kcalPerServing || '';
        el.querySelector('#edTags').value = (r.tags||[]).join(', ');
        el.querySelector('#edServ').value = r.servings || 2;
        el.querySelector('#edIngr').value = (r.ingredients||[]).map(i=>`${i.qty??''} ${i.unit??''} | ${i.item??''}`.trim()).join('\n');
        el.querySelector('#edSteps').value = (r.steps||[]).join('\n');
        window.scrollTo({ top: el.offsetTop + el.offsetHeight, behavior:'smooth' });
      });
    });
  }

  function card(r, meta){
    const stars = [1,2,3,4,5].map(i=>`<span class="star ${i<=meta.rating?'active':''}" data-v="${i}">★</span>`).join('');
    const controlsMine = meta.isMine ? `
      <div class="small" style="display:flex; gap:6px; align-items:center">
        <label>Visibilità</label>
        <select class="input" data-act="vis" data-id="${r.id}" style="height:36px">
          <option value="private" ${meta.visibility==='private'?'selected':''}>Privata</option>
          <option value="public" ${meta.visibility==='public'?'selected':''}>Pubblica</option>
        </select>
        <button class="btn secondary" data-act="edit" data-id="${r.id}">Modifica</button>
      </div>` : '';

    return `
      <div class="card" style="display:flex; flex-direction:column; gap:8px">
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

  return el;
}
