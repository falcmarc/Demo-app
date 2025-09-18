// src/modules/recipes/index.js
// Elenco ricette + Preferite + "Le mie ricette" (CRUD in localStorage)

import { getRecipes } from '../../data/recipes.js';
import { toggleFavorite, getFavorites } from '../../lib/store.js';
import { loadSettings, dietPredicate } from '../../lib/utils.js';

const MY_KEY = 'app.myRecipes.v1';

function loadMy(){ return JSON.parse(localStorage.getItem(MY_KEY) || '[]'); }
function saveMy(arr){ localStorage.setItem(MY_KEY, JSON.stringify(arr)); }
function uid(){ return 'my_' + Math.random().toString(36).slice(2,9); }

export default function RecipesPage(){
  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `
    <h1>Ricette</h1>
    <div style="display:flex; gap:8px; margin:8px 0; flex-wrap:wrap">
      <button class="chip active" data-tab="all">Tutte</button>
      <button class="chip" data-tab="fav">Preferite</button>
      <button class="chip" data-tab="mine">Le mie ricette</button>
      <button id="addBtn" class="btn" style="margin-left:auto">+ Nuova ricetta</button>
    </div>
    <div id="list" style="display:grid; gap:10px"></div>
  `;

  const $list = el.querySelector('#list');
  const tabs = el.querySelectorAll('[data-tab]');
  const addBtn = el.querySelector('#addBtn');
  let tab = 'all';

  tabs.forEach(t => t.addEventListener('click', ()=>{
    tabs.forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    tab = t.dataset.tab;
    render();
  }));

  addBtn.addEventListener('click', ()=> openEditor()); // nuovo

  (async ()=>{
    const settings = loadSettings();
    const allow = dietPredicate(settings);
    const BASE = (await getRecipes()).filter(allow);

    function card(r, favSet, isMine=false){
      const c = document.createElement('div');
      c.className = 'day-card';
      c.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px">
          <div>
            <div style="font-weight:600">${r.name}</div>
            <div class="small">
              Tag: ${(r.tags||[]).join(', ') || '—'} · Prep: ${r.prepMinutes||20} min · Porzioni: ${r.servings||2}
            </div>
          </div>
          <div style="display:flex; gap:6px; align-items:center">
            ${isMine ? `
              <button class="btn secondary" data-edit="${r.id}">Modifica</button>
              <button class="btn secondary" data-del="${r.id}">Elimina</button>
            `: ''}
            <button class="fav-btn ${favSet.has(r.id)?'active':''}" data-id="${r.id}">⭐</button>
          </div>
        </div>
      `;
      c.querySelector('.fav-btn').addEventListener('click', (e)=>{
        const after = new Set(toggleFavorite(r.id));
        e.currentTarget.classList.toggle('active', after.has(r.id));
      });
      if (isMine){
        c.querySelector(`[data-edit="${r.id}"]`)?.addEventListener('click', ()=> openEditor(r));
        c.querySelector(`[data-del="${r.id}"]`)?.addEventListener('click', ()=>{
          if (!confirm('Eliminare questa ricetta?')) return;
          const mine = loadMy().filter(x=>x.id!==r.id);
          saveMy(mine);
          render();
        });
      }
      return c;
    }

    function render(){
      const favSet = new Set(getFavorites());
      const mine = loadMy();
      $list.innerHTML = '';

      if (tab==='mine'){
        if (!mine.length){ $list.innerHTML = `<div class="small">Non hai ancora ricette personali.</div>`; return; }
        mine.forEach(r => $list.appendChild(card(r, favSet, true)));
        return;
      }

      if (tab==='fav'){
        const show = BASE.filter(r=>favSet.has(r.id)).concat(mine.filter(r=>favSet.has(r.id)));
        if (!show.length){ $list.innerHTML = `<div class="small">Nessuna ricetta preferita.</div>`; return; }
        show.forEach(r => $list.appendChild(card(r, favSet, r.id.startsWith('my_'))));
        return;
      }

      // tutte = base + le mie
      const show = BASE.concat(mine);
      show.forEach(r => $list.appendChild(card(r, favSet, r.id.startsWith('my_'))));
    }

    render();
  })();

  /* ---------- Editor ricetta (overlay) ---------- */
  function openEditor(rec=null){
    const isEdit = !!rec;
    const data = rec || {
      id: uid(),
      name: '',
      servings: 2,
      prepMinutes: 20,
      kcalPerServing: 0,
      tags: [],
      ingredients: [{item:'', qty:0, unit:'g'}],
      steps: []
    };

    ensureOverlay(`
      <h2 style="margin:0 0 8px">${isEdit?'Modifica':'Nuova'} ricetta</h2>
      <div style="display:grid; gap:10px; grid-template-columns: repeat(2, minmax(0,1fr))">
        <div class="card">
          <label class="small">Nome</label>
          <input id="r_name" class="input" value="${escapeHTML(data.name)}" />
          <div style="display:flex; gap:8px; margin-top:8px">
            <div style="flex:1">
              <label class="small">Porzioni</label>
              <input id="r_serv" type="number" min="1" class="input" value="${data.servings||2}" />
            </div>
            <div style="flex:1">
              <label class="small">Prep (min)</label>
              <input id="r_prep" type="number" min="0" class="input" value="${data.prepMinutes||20}" />
            </div>
          </div>
          <div style="margin-top:8px">
            <label class="small">Tag (virgola)</label>
            <input id="r_tags" class="input" placeholder="es. pranzo, pasta" value="${(data.tags||[]).join(', ')}" />
          </div>
          <div style="margin-top:8px">
            <label class="small">Kcal/porzione (opz.)</label>
            <input id="r_kcal" type="number" min="0" class="input" value="${data.kcalPerServing||0}" />
          </div>
        </div>

        <div class="card">
          <label class="small">Ingredienti</label>
          <div id="ingList" style="display:grid; gap:6px"></div>
          <button id="addIng" class="btn secondary" style="margin-top:8px">+ ingrediente</button>
        </div>
      </div>

      <div class="card" style="margin-top:10px">
        <label class="small">Procedimento (una riga per step)</label>
        <textarea id="r_steps" class="input" rows="6" style="width:100%">${(data.steps||[]).join('\n')}</textarea>
      </div>

      <div style="display:flex; gap:8px; margin-top:12px">
        <button id="saveRec" class="btn">${isEdit?'Salva':'Crea'}</button>
        <button id="cancelRec" class="btn secondary">Annulla</button>
      </div>
    `);

    // render ingredienti
    const $ing = document.getElementById('ingList');
    function renderIngs(){
      $ing.innerHTML = '';
      (data.ingredients||[]).forEach((ing, idx)=>{
        const row = document.createElement('div');
        row.style.display='grid';
        row.style.gridTemplateColumns='2fr 1fr 1fr auto';
        row.style.gap='6px';
        row.innerHTML = `
          <input class="input" placeholder="ingrediente" value="${escapeHTML(ing.item||'')}" data-k="item" data-i="${idx}" />
          <input class="input" type="number" min="0" placeholder="qty" value="${ing.qty||0}" data-k="qty" data-i="${idx}" />
          <input class="input" placeholder="unit (g|ml|pz)" value="${escapeHTML(ing.unit||'g')}" data-k="unit" data-i="${idx}" />
          <button class="btn secondary" data-del="${idx}">✕</button>
        `;
        // bind
        row.querySelectorAll('input').forEach(inp=>{
          inp.addEventListener('input', (e)=>{
            const i = +e.target.dataset.i;
            const k = e.target.dataset.k;
            data.ingredients[i][k] = k==='qty' ? +e.target.value : e.target.value;
          });
        });
        row.querySelector(`[data-del="${idx}"]`)?.addEventListener('click', ()=>{
          data.ingredients.splice(idx,1);
          renderIngs();
        });
        $ing.appendChild(row);
      });
    }
    renderIngs();

    document.getElementById('addIng')?.addEventListener('click', ()=>{
      data.ingredients.push({item:'', qty:0, unit:'g'});
      renderIngs();
    });

    document.getElementById('cancelRec')?.addEventListener('click', closeOverlay);
    document.getElementById('saveRec')?.addEventListener('click', ()=>{
      data.name = document.getElementById('r_name').value.trim();
      data.servings = Math.max(1, +document.getElementById('r_serv').value || 2);
      data.prepMinutes = Math.max(0, +document.getElementById('r_prep').value || 0);
      data.kcalPerServing = Math.max(0, +document.getElementById('r_kcal').value || 0);
      data.tags = (document.getElementById('r_tags').value||'').split(',').map(x=>x.trim()).filter(Boolean);
      data.steps = (document.getElementById('r_steps').value||'').split('\n').map(x=>x.trim()).filter(Boolean);
      if (!data.name){ alert('Inserisci un nome'); return; }
      if (!Array.isArray(data.ingredients) || !data.ingredients.length){ alert('Aggiungi almeno un ingrediente'); return; }

      const mine = loadMy();
      const i = mine.findIndex(x=>x.id===data.id);
      if (i>=0) mine[i]=data; else mine.push(data);
      saveMy(mine);
      closeOverlay();
      // refresh lista corrente
      const evt = new Event('click'); document.querySelector('[data-tab].active')?.dispatchEvent(evt);
    });
  }

  function ensureOverlay(html){
    let root = document.getElementById('overlay-root');
    if (!root) { root = document.createElement('div'); root.id='overlay-root'; document.body.appendChild(root); }
    root.innerHTML = `
      <div style="position:fixed; inset:0; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; z-index:9999; padding:16px">
        <div style="background:var(--card); border:1px solid var(--border); border-radius:12px; padding:16px; max-width:min(950px,96vw); max-height:92vh; overflow:auto">
          ${html}
        </div>
      </div>`;
    root.addEventListener('click', (e)=>{ if (e.target === root.firstElementChild) closeOverlay(); });
  }
  function closeOverlay(){ const root=document.getElementById('overlay-root'); if (root){ root.innerHTML=''; root.remove(); } }

  function escapeHTML(s){ return (s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

  return el;
}
