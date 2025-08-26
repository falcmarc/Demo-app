// src/modules/planner/index.js
//
// Planner "tipo calendario" compatto + lista spesa (1–4 settimane)
// - celle più rettangolari e compatte
// - select ricette più alti (touch-friendly)
// - header con date reali della settimana
// - rigenera menu bilanciato
// - lista spesa aggregata (1, 2, 3, 4 settimane) con copia/esporta
//
// Dipendenze già presenti nel progetto:
//   - getRecipes()             (src/data/recipes.js)
//   - loadSettings, kidFactor  (src/lib/utils.js)
//   - generateBalancedWeeklyMenu (src/lib/balancedMenu.js) — se non c'è, il tasto resta ma non rompe

import { getRecipes } from '../../data/recipes.js';
import { loadSettings, kidFactor, dietPredicate } from '../../lib/utils.js';
import { generateBalancedWeeklyMenu } from '../../lib/balancedMenu.js';
import { toggleFavorite, getFavorites, getRatings, setRating } from '../../lib/store.js';

// giorni IT con indice ISO (lun=1)
const DAYS = ['Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato','Domenica'];
const MEALS = ['colazione','pranzo','merenda','cena'];

const PLAN_KEY = 'app.plan.v4'; // bump chiave
const getPlan = () => JSON.parse(localStorage.getItem(PLAN_KEY) || 'null');
const setPlan = (p) => localStorage.setItem(PLAN_KEY, JSON.stringify(p));

function emptyPlan(){
  return DAYS.map(()=> Object.fromEntries(MEALS.map(m => [m, { meal:null, excluded:false }])));
}

// date helper: inizio settimana (lun) per una data
function startOfWeek(d){
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = x.getDay() || 7; // dom=0 -> 7
  if (day > 1) x.setDate(x.getDate() - (day - 1));
  x.setHours(0,0,0,0);
  return x;
}
function addDays(d, n){ const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function fmtShort(d){ return d.toLocaleDateString('it-IT',{ day:'2-digit', month:'2-digit' }); }

// partecipazione/porzioni dal modulo Start
function countsForMeal(settings, meal) {
  const mode = settings?.participation?.[meal]?.mode || 'tutti';
  const A = settings.adults || 0;
  const K = settings.kids   || 0;

  if (mode === 'nessuno') return { adults: 0, kids: 0 };
  if (mode === 'solo_adulti') {
    const a = meal==='pranzo' ? Math.max(0, A - (settings.adultsSkipLunch||0)) : A;
    return { adults: a, kids: 0 };
  }
  if (mode === 'solo_bambini') {
    const k = meal==='pranzo' ? Math.max(0, K - (settings.kidsSkipLunch||0)) : K;
    return { adults: 0, kids: k };
  }
  if (mode === 'custom') {
    const base = settings.participation?.[meal] || {};
    return { adults: base.adults || 0, kids: base.kids || 0 };
  }
  // 'tutti'
  const a = meal==='pranzo' ? Math.max(0, A - (settings.adultsSkipLunch||0)) : A;
  const k = meal==='pranzo' ? Math.max(0, K - (settings.kidsSkipLunch||0))   : K;
  return { adults: a, kids: k };
}
function eqServings(adults, kids, kidsAges){
  const ages = (kidsAges||[]).slice(0, Math.max(0, kids||0));
  const kidsEq = ages.reduce((sum,a)=> sum + kidFactor(a), 0);
  return Math.max(0, (adults||0) + kidsEq);
}

export default function Planner(){
  const settings = loadSettings();
  const allow = dietPredicate(settings);
  let RECIPES = [];

  // stato data corrente (settimana “corrente”)
  let weekStart = startOfWeek(new Date());

  const el = document.createElement('div');
  el.innerHTML = `
    <div class="card" style="padding:12px">
      <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; justify-content:space-between">
        <div class="small">
          Dieta: <strong>${settings.diet}</strong> · Famiglia: <strong>${settings.adults} adulti, ${settings.kids} bambini</strong>
        </div>
        <div style="display:flex; gap:6px; align-items:center">
          <button id="prevW" class="btn secondary" title="Settimana precedente">◀</button>
          <div id="weekLabel" class="small" style="min-width:160px; text-align:center"></div>
          <button id="nextW" class="btn secondary" title="Settimana successiva">▶</button>
          <button id="todayW" class="btn secondary">Oggi</button>
        </div>
      </div>
    </div>

    <div class="calendar card" style="margin-top:10px; overflow-x:auto">
      <table class="cal-table">
        <thead id="thead"></thead>
        <tbody id="tbody"></tbody>
      </table>
    </div>

    <div class="card" style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap; align-items:center">
      <button id="regen" class="btn">Rigenera menu bilanciato</button>
      <div class="small">Celle <em>Escludi</em> non verranno rigenerate.</div>
      <div style="margin-left:auto; display:flex; gap:8px; align-items:center">
        <label class="small">Orizzonte lista spesa</label>
        <select id="horizon" class="input" style="height:40px">
          <option value="1">1 settimana</option>
          <option value="2">2 settimane</option>
          <option value="3">3 settimane</option>
          <option value="4">4 settimane</option>
        </select>
        <button id="genList" class="btn secondary">Aggiorna lista spesa</button>
        <button id="copyList" class="btn secondary">Copia</button>
      </div>
    </div>

    <div class="card" id="shoppingCard" style="margin-top:10px">
      <h3 style="margin:0 0 8px">Lista spesa</h3>
      <div id="shoppingEmpty" class="small">Nessun ingrediente: seleziona ricette o rigenera il menu.</div>
      <ul id="shoppingList" class="list"></ul>
    </div>
  `;

  // CSS mirato per compattare la tabella
  injectOnce('planner-compact-css', `
    .cal-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 8px;
      table-layout: fixed;
    }
    .cal-table thead th {
      position: sticky; top: 0; z-index: 1;
      background: var(--card); border:1px solid var(--border); border-radius:10px;
      padding: 8px; text-align:center;
    }
    .cal-table tbody td {
      vertical-align: top;
      background: #0b0e13; border:1px solid var(--border); border-radius:12px;
      padding: 8px;
    }
    .meal-block {
      display: grid; grid-template-rows: auto auto auto; gap: 6px;
      height: 180px; /* più rettangolare/compatto, sta a schermo */
    }
    .meal-title { font-size: .9rem; color: var(--muted); }
    .meal-select {
      width: 100%; height: 44px; /* più alto per touch */
      background:#0b0e13; color:var(--text); border:1px solid var(--border); border-radius:10px; padding:6px 8px;
    }
    .meal-actions { display:flex; gap:6px; align-items:center; justify-content:space-between }
    .badge { font-size:.85rem; opacity:.85 }
    @media (max-width: 900px){
      .meal-block { height: 200px; }
    }
  `);

  const $thead = el.querySelector('#thead');
  const $tbody = el.querySelector('#tbody');
  const $weekLabel = el.querySelector('#weekLabel');
  const $horizon = el.querySelector('#horizon');
  const $shoppingList = el.querySelector('#shoppingList');
  const $shoppingEmpty = el.querySelector('#shoppingEmpty');

  // init
  (async () => {
    RECIPES = (await getRecipes()).filter(allow);
    renderCalendar();
    renderShopping(); // iniziale
  })();

  // NAV settimana
  el.querySelector('#prevW').addEventListener('click', ()=>{ weekStart = addDays(weekStart, -7); renderCalendar(); });
  el.querySelector('#nextW').addEventListener('click', ()=>{ weekStart = addDays(weekStart, +7); renderCalendar(); });
  el.querySelector('#todayW').addEventListener('click', ()=>{ weekStart = startOfWeek(new Date()); renderCalendar(); });

  // Rigenera menu
  el.querySelector('#regen').addEventListener('click', ()=>{
    const plan = getPlan() || emptyPlan();
    // se c'è generatore, usalo, altrimenti non far nulla
    try {
      if (typeof generateBalancedWeeklyMenu === 'function') {
        const newPlan = generateBalancedWeeklyMenu(RECIPES, settings, plan);
        setPlan(newPlan);
      }
    } catch (e) {
      console.warn('[planner] generateBalancedWeeklyMenu error', e);
    }
    renderCalendar();
    renderShopping();
  });

  el.querySelector('#genList').addEventListener('click', renderShopping);
  el.querySelector('#copyList').addEventListener('click', ()=>{
    const items = Array.from($shoppingList.querySelectorAll('li')).map(li => li.textContent);
    if (!items.length) return;
    navigator.clipboard.writeText(items.join('\n'));
  });

  // ——— UI ———
  function renderCalendar(){
    $thead.innerHTML = '';
    $tbody.innerHTML = '';
    $weekLabel.textContent = `${fmtShort(weekStart)} — ${fmtShort(addDays(weekStart,6))}`;

    // intestazione: 1 cella vuota + 7 giorni con data breve
    const trH = document.createElement('tr');
    const th0 = document.createElement('th'); th0.textContent = ''; th0.style.minWidth = '120px';
    trH.appendChild(th0);
    for (let i=0;i<7;i++){
      const d = addDays(weekStart, i);
      const th = document.createElement('th');
      th.innerHTML = `<div>${DAYS[i]}</div><div class="small">${fmtShort(d)}</div>`;
      trH.appendChild(th);
    }
    $thead.appendChild(trH);

    // righe: una per tipo di pasto
    const plan = getPlan() || (setPlan(emptyPlan()), getPlan());
    for (const meal of MEALS) {
      const tr = document.createElement('tr');

      // etichetta riga
      const th = document.createElement('th');
      th.textContent = meal[0].toUpperCase() + meal.slice(1);
      th.style.textAlign='left';
      $thead.children.length > 0 ? tr.appendChild(th) : null; // compat

      // 7 celle
      for (let dayIdx=0; dayIdx<7; dayIdx++){
        const td = document.createElement('td');
        const cell = plan[dayIdx][meal]; // { meal, excluded }

        const wrap = document.createElement('div');
        wrap.className = 'meal-block';

        // 1) titolo + badge
        const title = document.createElement('div');
        title.className = 'meal-title';
        title.innerHTML = `
          <span>${DAYS[dayIdx].slice(0,3)} · ${meal}</span>
          ${cell.excluded ? `<span class="badge">· <em>escluso</em></span>` : ''}
        `;

        // 2) select ricetta
        const sel = document.createElement('select');
        sel.className = 'meal-select';
        sel.innerHTML = `<option value="">— scegli —</option>` + RECIPES
          .filter(r=> (r.tags||[]).includes(meal)) // priorità matching pasto
          .concat(RECIPES)                         // fallback tutto
          .filter((r,i,arr)=> arr.findIndex(a=>a.id===r.id)===i) // dedupe
          .map(r=>`<option value="${r.id}">${r.name}</option>`).join('');
        sel.value = cell.meal || '';
        sel.disabled = cell.excluded;

        sel.addEventListener('change', ()=>{
          const p = getPlan(); p[dayIdx][meal].meal = sel.value || null; setPlan(p);
          renderShoppingDebounced();
        });

        // 3) azioni
        const actions = document.createElement('div');
        actions.className = 'meal-actions';

        const exLab = document.createElement('label');
        exLab.className = 'small';
        const exChk = document.createElement('input'); exChk.type='checkbox'; exChk.checked = !!cell.excluded;
        exChk.addEventListener('change', ()=>{
          const p = getPlan(); p[dayIdx][meal].excluded = exChk.checked; setPlan(p);
          sel.disabled = exChk.checked;
          renderCalendar(); // per aggiornare badge e stato
          renderShoppingDebounced();
        });
        exLab.append(exChk, document.createTextNode(' Escludi'));

        const detBtn = document.createElement('button');
        detBtn.className = 'btn secondary';
        detBtn.textContent = 'Dettagli';
        detBtn.disabled = !cell.meal || cell.excluded;
        detBtn.addEventListener('click', ()=>{
          const rec = RECIPES.find(r => r.id === cell.meal);
          if (rec) openRecipeMini(rec, meal);
        });

        actions.append(exLab, detBtn);

        wrap.append(title, sel, actions);
        td.appendChild(wrap);
        tr.appendChild(td);
      }

      $tbody.appendChild(tr);
    }
  }

  // ——— Lista spesa ———
  function renderShopping(){
    // quante settimane prendere (1..4)
    const weeks = Math.max(1, Math.min(4, +$horizon.value || 1));

    // aggrega ingredienti delle settimane a partire da weekStart
    const agg = new Map(); // key=item|unit -> { item, unit, qty }
    for (let w=0; w<weeks; w++){
      const plan = getPlan() || emptyPlan();
      for (let d=0; d<7; d++){
        for (const meal of MEALS){
          const cell = plan[d][meal];
          if (!cell || cell.excluded || !cell.meal) continue;
          const rec = RECIPES.find(r => r.id === cell.meal);
          if (!rec) continue;

          // porzioni eq in base alle impostazioni e pasto
          const { adults, kids } = countsForMeal(settings, meal);
          const servingsEq = eqServings(adults, kids, settings.kidsAges);
          const factor = (servingsEq || 1) / (rec.servings || 2);

          (rec.ingredients || []).forEach(ing => {
            const key = `${(ing.item||'').trim().toLowerCase()}|${(ing.unit||'').trim().toLowerCase()}`;
            const prev = agg.get(key) || { item: ing.item || '', unit: ing.unit || '', qty: 0 };
            prev.qty += (ing.qty || 0) * factor;
            agg.set(key, prev);
          });
        }
      }
    }

    const rows = Array.from(agg.values())
      .sort((a,b)=> a.item.localeCompare(b.item))
      .map(obj => {
        const q = obj.qty;
        const show = Number.isInteger(q) ? q : Math.round(q);
        return `<li>${obj.item} — <strong>${show} ${obj.unit||''}</strong></li>`;
      });

    $shoppingList.innerHTML = rows.join('');
    $shoppingEmpty.style.display = rows.length ? 'none' : '';
  }
  let _t = null;
  function renderShoppingDebounced(){ clearTimeout(_t); _t = setTimeout(renderShopping, 150); }

  // mini-anteprima ricetta
  function openRecipeMini(rec, mealKey){
  const { adults, kids } = countsForMeal(settings, mealKey);
  const servings = eqServings(adults, kids, settings.kidsAges);
  const factor   = (servings || 1) / (rec.servings || 2);
  const kcalPer  = rec.kcalPerServing || null;
  const kcalTot  = kcalPer ? Math.round(kcalPer * servings) : null;

  const ingHTML = (rec.ingredients||[]).map(ing=>{
    const qty = (ing.qty||0)*factor;
    const show = Number.isInteger(qty) ? qty : Math.round(qty);
    return `<li><strong>${ing.item}</strong> — ${show} ${ing.unit||''}</li>`;
  }).join('');

  const favSet = new Set(getFavorites());
  const ratings = getRatings();
  const myRate  = ratings[rec.id] || 0;

  ensureOverlay(`
    <div style="display:flex; justify-content:space-between; align-items:center; gap:8px">
      <h2 style="margin:0">${rec.name}</h2>
      <button id="miniClose" class="btn secondary">Chiudi</button>
    </div>

    <div class="small" style="margin:8px 0">
      Porzioni eq: <strong>${servings.toFixed(1)}</strong>
      · Kcal/porzione: <strong>${kcalPer ?? 'n.d.'}</strong>
      · Kcal totali: <strong>${kcalTot ?? 'n.d.'}</strong>
    </div>

    <div style="display:flex; gap:10px; align-items:center; margin:8px 0">
      <button id="favBtn" class="fav-btn ${favSet.has(rec.id)?'active':''}">⭐ Preferito</button>
      <div class="stars" id="stars">${[1,2,3,4,5].map(i=>`<span class="star ${i<=myRate?'active':''}" data-v="${i}">★</span>`).join('')}</div>
      <span class="small" id="rateLabel">${myRate? myRate+'/5' : 'Non valutata'}</span>
    </div>

    <h3 style="margin:10px 0 6px">Ingredienti</h3>
    <ul class="list" style="margin-bottom:10px">${ingHTML || '<li class="small">Nessun ingrediente</li>'}</ul>

    ${Array.isArray(rec.steps)&&rec.steps.length ? `
      <h3 style="margin:10px 0 6px">Procedimento</h3>
      <ol class="list">${rec.steps.map(s=>`<li>${s}</li>`).join('')}</ol>` : ''
    }
  `);

  document.getElementById('miniClose')?.addEventListener('click', closeOverlay);

  const favBtn = document.getElementById('favBtn');
  favBtn?.addEventListener('click', ()=>{
    const after = new Set(toggleFavorite(rec.id));
    if (after.has(rec.id)) favBtn.classList.add('active'); else favBtn.classList.remove('active');
  });

  const starsEl = document.getElementById('stars');
  starsEl?.addEventListener('click', (e)=>{
    const v = +e.target?.dataset?.v || 0;
    if (!v) return;
    setRating(rec.id, v);
    // refresh stelle
    Array.from(starsEl.querySelectorAll('.star')).forEach((s,idx)=>{
      s.classList.toggle('active', idx < v);
    });
    const lab = document.getElementById('rateLabel');
    if (lab) lab.textContent = v+'/5';
  });
}

// inietta CSS una sola volta per pagina
function injectOnce(id, css){
  if (document.getElementById(id)) return;
  const s = document.createElement('style');
  s.id = id; s.textContent = css;
  document.head.appendChild(s);
}
