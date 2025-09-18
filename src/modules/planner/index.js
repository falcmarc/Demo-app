// src/modules/planner/index.js
//
// Planner responsive:
// - Viste: Settimana / 3 Giorni / Oggi
// - Settimana: tabella; su mobile toggle Pasti ↔ Nutrienti (mini grafico per giorno)
// - Giornaliera / 3 Giorni: card a schermo pieno con tutti i pasti del periodo
// - Select ricette più grandi; “Dettagli” ghost; “Escludi” più piccolo
// - Rispetta: dieta, allergeni, preferiti, limiti tempo
// - Kcal arrotondate a 0 decimali in UI
// - Lista spesa invariata

import { getRecipes } from '../../data/recipes.js';
import { loadSettings, kidFactor, dietPredicate } from '../../lib/utils.js';
import { generateBalancedWeeklyMenu } from '../../lib/balancedMenu.js';
import { toggleFavorite, getFavorites, getRatings, setRating } from '../../lib/store.js';
import { computeMacrosAsync } from '../../lib/nutritionService.js';
import PieChart from '../../components/PieChart.js';
import { recipeHasAllergen } from '../../lib/allergens.js';

const DAYS  = ['Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato','Domenica'];
const MEALS = ['colazione','pranzo','merenda','cena'];

const PLAN_KEY = 'app.plan.v4';
const getPlan  = () => JSON.parse(localStorage.getItem(PLAN_KEY) || 'null');
const setPlan  = (p) => localStorage.setItem(PLAN_KEY, JSON.stringify(p));

function emptyPlan(){ return DAYS.map(()=> Object.fromEntries(MEALS.map(m => [m, { meal:null, excluded:false }]))); }

// date helper
function startOfWeek(d){ const x=new Date(d.getFullYear(), d.getMonth(), d.getDate()); const day=x.getDay()||7; if(day>1)x.setDate(x.getDate()-(day-1)); x.setHours(0,0,0,0); return x; }
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function fmtShort(d){ return d.toLocaleDateString('it-IT',{ day:'2-digit', month:'2-digit' }); }
function fmtFull(d){ return d.toLocaleDateString('it-IT',{ weekday:'long', day:'2-digit', month:'2-digit' }); }

// tempo max: generico + specifico pranzo
function getMaxMinutesForMeal(settings, mealKey){
  const m = settings?.maxPrep;
  if (!m) return Infinity;
  const def = Number.isFinite(+m.default) ? +m.default : Infinity;
  if (mealKey === 'pranzo' && m.lunchEnabled) {
    const L = Number.isFinite(+m.lunch) ? +m.lunch : def;
    return Math.min(def, L);
  }
  return def;
}
function fitsTime(r, mealKey, settings){
  const max = getMaxMinutesForMeal(settings, mealKey);
  const pm = Number.isFinite(+r.prepMinutes) ? +r.prepMinutes : 20;
  return pm <= max;
}

// porzioni eq
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
  const allergens = settings?.allergens || [];
  let RECIPES = [];

  let weekStart = startOfWeek(new Date());
  let view = 'week';         // 'week' | 'tri' | 'day'
  let weekMode = 'meals';    // 'meals' | 'nutri'

  const el = document.createElement('div');
  el.innerHTML = `
    <div class="card" style="padding:12px">
      <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; justify-content:space-between">
        <div class="small">
          Dieta: <strong>${settings.diet}</strong> · Famiglia: <strong>${settings.adults} adulti, ${settings.kids} bambini</strong>
          ${settings?.maxPrep ? `· Tempo max: <strong>${settings.maxPrep.default} min</strong>${settings.maxPrep.lunchEnabled?` (pranzo: <strong>${settings.maxPrep.lunch} min</strong>)`:''}` : ''}
        </div>
        <div class="view-switch">
          <button class="chip active" data-view="week">Settimana</button>
          <button class="chip" data-view="tri">3 giorni</button>
          <button class="chip" data-view="day">Oggi</button>
          <button id="prevW" class="chip" title="Periodo precedente">◀</button>
          <div id="weekLabel" class="small" style="min-width:160px; text-align:center"></div>
          <button id="nextW" class="chip" title="Periodo successivo">▶</button>
          <button id="todayW" class="chip">Oggi</button>
        </div>
      </div>
    </div>

    <div id="mainView" class="calendar card" style="margin-top:10px; overflow-x:auto"></div>

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

  injectOnce('planner-compact-css', `
    .cal-table { width: 100%; border-collapse: separate; border-spacing: 8px; table-layout: fixed; }
    .cal-table thead th { position: sticky; top: 0; z-index: 1; background: var(--card); border:1px solid var(--border); border-radius:10px; padding: 8px; text-align:center; }
    .cal-table tbody td { vertical-align: top; background: #0b0e13; border:1px solid var(--border); border-radius:12px; padding: 8px; }
    .meal-title { font-size: .95rem; color: var(--muted); display:flex; justify-content:space-between; align-items:center }
  `);

  const $main = el.querySelector('#mainView');
  const $weekLabel = el.querySelector('#weekLabel');
  const $horizon = el.querySelector('#horizon');
  const $shoppingList = el.querySelector('#shoppingList');
  const $shoppingEmpty = el.querySelector('#shoppingEmpty');

  (async () => {
    // carica base e filtra dieta + allergeni
    const all = (await getRecipes()).filter(allow);
    RECIPES = all.filter(r => !recipeHasAllergen(r, allergens));
    render();
    renderShopping();
  })();

  // NAV periodo
  el.querySelector('#prevW').addEventListener('click', ()=>{
    weekStart = addDays(weekStart, view==='day' ? -1 : (view==='tri' ? -3 : -7));
    render();
  });
  el.querySelector('#nextW').addEventListener('click', ()=>{
    weekStart = addDays(weekStart, view==='day' ? +1 : (view==='tri' ? +3 : +7));
    render();
  });
  el.querySelector('#todayW').addEventListener('click', ()=>{
    weekStart = view==='day' ? new Date() : startOfWeek(new Date());
    render();
  });

  // Switch vista
  el.querySelectorAll('.view-switch .chip[data-view]').forEach(b=>{
    b.addEventListener('click', ()=>{
      view = b.dataset.view;
      render();
    });
  });

  // Rigenera menu
  el.querySelector('#regen').addEventListener('click', ()=>{
    const plan = getPlan() || emptyPlan();
    try {
      if (typeof generateBalancedWeeklyMenu === 'function') {
        const newPlan = generateBalancedWeeklyMenu(RECIPES, settings, plan);
        setPlan(newPlan);
      }
    } catch (e) { console.warn('[planner] generateBalancedWeeklyMenu error', e); }
    render();
    renderShopping();
  });

  el.querySelector('#genList').addEventListener('click', renderShopping);
  el.querySelector('#copyList').addEventListener('click', ()=>{
    const items = Array.from($shoppingList.querySelectorAll('li')).map(li => li.textContent);
    if (!items.length) return;
    navigator.clipboard.writeText(items.join('\n'));
  });

  function render(){
    if (view==='day') $weekLabel.textContent = fmtFull(new Date(weekStart));
    else if (view==='tri') $weekLabel.textContent = `${fmtShort(weekStart)} — ${fmtShort(addDays(weekStart,2))}`;
    else $weekLabel.textContent = `${fmtShort(weekStart)} — ${fmtShort(addDays(weekStart,6))}`;

    el.querySelectorAll('.view-switch .chip[data-view]').forEach(b=>{
      b.classList.toggle('active', b.dataset.view===view);
    });

    $main.innerHTML = '';
    if (view==='week') renderWeek();
    else if (view==='tri') renderNDays(3);
    else renderNDays(1);
  }

  function renderWeek(){
    const modeBar = document.createElement('div');
    modeBar.className = 'mode-switch';
    modeBar.style.margin = '6px 0 10px';
    modeBar.innerHTML = `
      <button class="chip ${weekMode==='meals'?'active':''}" data-mode="meals">Vedi pasti</button>
      <button class="chip ${weekMode==='nutri'?'active':''}" data-mode="nutri">Vedi nutrienti</button>
    `;
    modeBar.querySelectorAll('button').forEach(btn=>{
      btn.addEventListener('click', ()=>{ weekMode = btn.dataset.mode; renderWeek(); });
    });
    $main.appendChild(modeBar);

    if (weekMode === 'nutri') { renderWeekNutrients(); return; }

    const table = document.createElement('table');
    table.className = 'cal-table';
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');

    const trH = document.createElement('tr');
    const th0 = document.createElement('th'); th0.textContent = ''; th0.style.minWidth = '120px';
    trH.appendChild(th0);
    for (let i=0;i<7;i++){
      const d = addDays(weekStart, i);
      const th = document.createElement('th');
      th.innerHTML = `<div>${DAYS[i]}</div><div class="small">${fmtShort(d)}</div>`;
      trH.appendChild(th);
    }
    thead.appendChild(trH);

    const plan = getPlan() || (setPlan(emptyPlan()), getPlan());
    for (const meal of MEALS) {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.textContent = meal[0].toUpperCase() + meal.slice(1);
      th.style.textAlign='left';
      tr.appendChild(th);
      for (let dayIdx=0; dayIdx<7; dayIdx++){
        tr.appendChild(renderCell(dayIdx, meal, plan));
      }
      tbody.appendChild(tr);
    }

    table.appendChild(thead); table.appendChild(tbody);
    $main.appendChild(table);
  }

  async function renderWeekNutrients(){
    const plan = getPlan() || emptyPlan();
    for (let dayIdx=0; dayIdx<7; dayIdx++){
      const dayBox = document.createElement('div');
      dayBox.className = 'day-nutri';
      dayBox.innerHTML = `
        <div>
          <div class="day-nutri-title">${DAYS[dayIdx]} · ${fmtShort(addDays(weekStart,dayIdx))}</div>
          <div class="small">Macro medi per i pasti assegnati</div>
        </div>
        <div class="day-nutri-chart" id="chart-${dayIdx}"></div>
      `;
      $main.appendChild(dayBox);

      const macros = await macrosForDay(plan[dayIdx]);
      const data = [
        { key:'Prot', value: macros.protein },
        { key:'Sugar', value: macros.sugar },
        { key:'Carb', value: Math.max(0, macros.carbs - macros.sugar) },
        { key:'Fat',  value: macros.fat },
      ];
      const chart = PieChart(data, { size: 120 });
      dayBox.querySelector(`#chart-${dayIdx}`)?.appendChild(chart);
    }
  }

  async function macrosForDay(dayObj){
    let sums = { protein:0, carbs:0, sugar:0, fat:0 }, n=0;
    for (const meal of MEALS){
      const cell = dayObj[meal];
      if (!cell || cell.excluded || !cell.meal) continue;
      const rec = RECIPES.find(r=>r.id===cell.meal);
      if (!rec) continue;
      const m = await computeMacrosAsync(rec.ingredients||[], rec.servings||2);
      sums.protein += m.perServing.protein||0;
      sums.carbs   += m.perServing.carbs||0;
      sums.sugar   += m.perServing.sugar||0;
      sums.fat     += m.perServing.fat||0;
      n++;
    }
    if (!n) return { protein:0, carbs:0, sugar:0, fat:0 };
    return {
      protein: Math.round(sums.protein/n),
      carbs:   Math.round(sums.carbs/n),
      sugar:   Math.round(sums.sugar/n),
      fat:     Math.round(sums.fat/n),
    };
  }

  function renderCell(dayIdx, meal, plan){
    const td = document.createElement('td');
    const cell = plan[dayIdx][meal];

    const wrap = document.createElement('div');
    wrap.className = 'meal-block';

    const title = document.createElement('div');
    title.className = 'meal-title';
    title.innerHTML = `
      <span>${DAYS[dayIdx].slice(0,3)} · ${meal}</span>
      ${cell.excluded ? `<span class="badge">· <em>escluso</em></span>` : ''}
    `;

    const sel = document.createElement('select');
    sel.className = 'meal-select';

    // filtra: tag pasto + tempo + no allergeni, ordina con preferiti e tempo
    const favs = (settings.favFoods||[]).map(s=>s.toLowerCase());
    const options = RECIPES
      .filter(r=> (r.tags||[]).includes(meal))
      .filter(r=> fitsTime(r, meal, settings))
      .filter(r=> !recipeHasAllergen(r, allergens))
      .sort((a,b)=>{
        const sa = (a.ingredients||[]).some(i=>favs.some(f=> (i.item||'').toLowerCase().includes(f)));
        const sb = (b.ingredients||[]).some(i=>favs.some(f=> (i.item||'').toLowerCase().includes(f)));
        if (sa!==sb) return sa ? -1 : 1;
        return (a.prepMinutes||30) - (b.prepMinutes||30);
      });

    sel.innerHTML = `<option value="">— scegli —</option>` +
      options.map(r=>`<option value="${r.id}">${r.name} · ⏱ ${r.prepMinutes || 20}′</option>`).join('');
    sel.value = cell.meal || '';
    sel.disabled = cell.excluded;
    sel.addEventListener('change', ()=>{
      const p = getPlan(); p[dayIdx][meal].meal = sel.value || null; setPlan(p);
      renderShoppingDebounced();
    });

    const actions = document.createElement('div');
    actions.className = 'meal-actions';

    const exWrap = document.createElement('div');
    exWrap.className = 'ex-small';
    const exLab = document.createElement('label');
    exLab.className = 'small';
    const exChk = document.createElement('input'); exChk.type='checkbox'; exChk.checked = !!cell.excluded;
    exChk.addEventListener('change', ()=>{
      const p = getPlan(); p[dayIdx][meal].excluded = exChk.checked; setPlan(p);
      sel.disabled = exChk.checked;
      title.innerHTML = `
        <span>${DAYS[dayIdx].slice(0,3)} · ${meal}</span>
        ${exChk.checked ? `<span class="badge">· <em>escluso</em></span>` : ''}
      `;
      renderShoppingDebounced();
    });
    exLab.append(exChk, document.createTextNode(' Escludi'));
    exWrap.appendChild(exLab);

    const detBtn = document.createElement('button');
    detBtn.className = 'btn-ghost';
    detBtn.textContent = 'Dettagli';
    detBtn.disabled = !cell.meal || cell.excluded;
    detBtn.addEventListener('click', ()=>{
      const rec = RECIPES.find(r => r.id === cell.meal);
      if (rec) openRecipeMini(rec, meal);
    });

    actions.append(exWrap, detBtn);
    wrap.append(title, sel, actions);
    td.appendChild(wrap);
    return td;
  }

  function renderNDays(n){
    const grid = document.createElement('div');
    grid.className = 'day-grid';

    for (let i=0;i<n;i++){
      const d = addDays(weekStart, i);
      const idx = (d.getDay()||7)-1;
      const plan = getPlan() || emptyPlan();

      const box = document.createElement('div');
      box.className = 'day-card';
      box.innerHTML = `<h3 style="margin:0 0 10px">${fmtFull(d)}</h3>`;

      MEALS.forEach(meal=>{
        const wrap = document.createElement('div');
        wrap.style.marginBottom = '10px';
        wrap.innerHTML = `<div class="small" style="margin-bottom:6px; color:var(--muted)">${meal[0].toUpperCase()+meal.slice(1)}</div>`;
        const row = document.createElement('div');
        row.appendChild(renderCell(idx, meal, plan));
        wrap.appendChild(row.firstChild);
        box.appendChild(wrap);
      });

      grid.appendChild(box);
    }
    $main.appendChild(grid);
  }

  // ——— Lista spesa ———
  function renderShopping(){
    const weeks = Math.max(1, Math.min(4, +$horizon.value || 1));
    const agg = new Map();

    for (let w=0; w<weeks; w++){
      const plan = getPlan() || emptyPlan();
      for (let d=0; d<7; d++){
        for (const meal of MEALS){
          const cell = plan[d][meal];
          if (!cell || cell.excluded || !cell.meal) continue;
          const rec = RECIPES.find(r => r.id === cell.meal);
          if (!rec) continue;

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
  async function openRecipeMini(rec, mealKey){
    const { adults, kids } = countsForMeal(settings, mealKey);
    const servings = eqServings(adults, kids, settings.kidsAges);
    const factor   = (servings || 1) / (rec.servings || 2);
    const kcalPer  = rec.kcalPerServing || 0;
    const kcalTot  = kcalPer ? Math.round(kcalPer * servings) : 0;

    const macros = await computeMacrosAsync(rec.ingredients || [], rec.servings || 2);
    const pieData = [
      { key:'Proteine', value: macros.perServing.protein || 0 },
      { key:'Zuccheri', value: macros.perServing.sugar   || 0 },
      { key:'Carbo (starch)', value: Math.max(0, (macros.perServing.carbs||0) - (macros.perServing.sugar||0)) },
      { key:'Grassi', value: macros.perServing.fat || 0 },
    ];
    const pieWrap = PieChart(pieData, { size: 220 });

    const ingHTML = (macros.items||[]).map(it=>{
      const base = `<strong>${it.name}</strong> — ${it.displayQty}`;
      const src  = it.source ? ` <span class="small" style="opacity:.8">[${it.source}]</span>` : '';
      const warn = !it.ok ? ` <span style="color:#ff8b8b" class="small">(non trovato)</span>` : '';
      return `<li>${base}${src}${warn}</li>`;
    }).join('');

    const kcalPerUI = Math.round(macros.perServing.kcal || kcalPer || 0);
    const kcalTotUI = Math.round(kcalTot || 0);

    ensureOverlay(`
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px">
        <h2 style="margin:0">${rec.name}</h2>
        <button id="miniClose" class="btn secondary">Chiudi</button>
      </div>

      <div class="small" style="margin:8px 0">
        Porzioni eq famiglia: <strong>${servings.toFixed(1)}</strong>
        · Kcal/porz (stima): <strong>${kcalPerUI}</strong>
        · Kcal totali (famiglia): <strong>${kcalTotUI}</strong>
        · Prep: <strong>${rec.prepMinutes || 20} min</strong>
      </div>

      <div style="display:flex; gap:10px; align-items:center; margin:8px 0">
        <button id="favBtn" class="fav-btn ${new Set(getFavorites()).has(rec.id)?'active':''}">⭐ Preferito</button>
        <div class="stars" id="stars">${[1,2,3,4,5].map(i=>`<span class="star ${(getRatings()[rec.id]||0)>=i?'active':''}" data-v="${i}">★</span>`).join('')}</div>
        <span class="small" id="rateLabel">${(getRatings()[rec.id]||0) ? (getRatings()[rec.id] + '/5') : 'Non valutata'}</span>
      </div>

      <h3 style="margin:10px 0 6px">Ingredienti</h3>
      <ul class="list" style="margin-bottom:10px">${ingHTML || '<li class="small">Nessun ingrediente</li>'}</ul>

      <h3 style="margin:10px 0 6px">Valori nutrizionali (per porzione)</h3>
      <div id="pieSlot" style="display:flex; gap:16px; align-items:center; flex-wrap:wrap"></div>

      ${Array.isArray(rec.steps)&&rec.steps.length ? `
        <h3 style="margin:10px 0 6px">Procedimento</h3>
        <ol class="list">${rec.steps.map(s=>`<li>${s}</li>`).join('')}</ol>` : ''
      }
    `);

    document.getElementById('pieSlot')?.appendChild(pieWrap);

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
      Array.from(starsEl.querySelectorAll('.star')).forEach((s,idx)=> s.classList.toggle('active', idx < v));
      const lab = document.getElementById('rateLabel');
      if (lab) lab.textContent = v+'/5';
    });
  }

  function ensureOverlay(html){
    let root = document.getElementById('overlay-root');
    if (!root) { root = document.createElement('div'); root.id='overlay-root'; document.body.appendChild(root); }
    root.innerHTML = `
      <div style="position:fixed; inset:0; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; z-index:9999; padding:16px">
        <div style="background:var(--card); border:1px solid var(--border); border-radius:12px; padding:16px; max-width:min(900px,96vw); max-height:92vh; overflow:auto">
          ${html}
        </div>
      </div>`;
    root.addEventListener('click', (e)=>{ if (e.target === root.firstElementChild) closeOverlay(); });
  }
  function closeOverlay(){ const root = document.getElementById('overlay-root'); if (root) { root.innerHTML=''; root.remove(); } }

  return el;
}

function injectOnce(id, css){
  if (document.getElementById(id)) return;
  const s = document.createElement('style'); s.id = id; s.textContent = css;
  document.head.appendChild(s);
}
