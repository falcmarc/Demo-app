// src/modules/list/index.js
import { RECIPES } from '../../data/recipes.js';
import { loadSettings, kidFactor, dietPredicate } from '../../lib/utils.js';
import { PRICES } from '../../data/prices.js';

function load(key, fb){ try{ return JSON.parse(localStorage.getItem(key)) ?? fb; } catch { return fb; } }
function add(map, k, qty, unit){
  const key = k.toLowerCase()+'|'+unit;
  map[key] = map[key] || { item:k, qty:0, unit };
  map[key].qty += qty;
}

function estimateCost(item, qty, unit){
  const p = PRICES[item.toLowerCase()];
  if(!p || p.unit !== unit) return 0;
  return (qty / p.per) * p.price;
}

// ---- partecipazione/porzioni (coerente con Planner v3) ----
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

// ---- lettura piano (v3 con fallback a v2/v1) ----
function readPlanV3() {
  const v3 = load('app.plan.v3', null);
  if (Array.isArray(v3) && v3[0]?.cena) return v3;
  return null;
}

export default function List(){
  const s        = loadSettings();
  const allow    = dietPredicate(s);

  const need = {};

  const planV3 = readPlanV3();
  if (planV3) {
    // V3: 7 giorni x 4 pasti, rispetta "excluded" e partecipazione da settings
    const MEALS = ['colazione','pranzo','merenda','cena'];
    planV3.forEach(day => {
      MEALS.forEach(mealKey => {
        const cell = day[mealKey];
        if (!cell || cell.excluded || !cell.meal) return;

        const r = RECIPES.find(x=>x.id===cell.meal);
        if(!r || !allow(r)) return;

        const counts = countsForMeal(s, mealKey);
        const servings = eqServings(counts.adults, counts.kids, s.kidsAges);
        const factor = (servings || 1) / (r.servings || 2);

        (r.ingredients || []).forEach(ing => add(need, ing.item, (ing.qty||0)*factor, ing.unit));
      });
    });
  } else {
    // Fallback V2 (se presente) oppure V1 (storico)
    const planV2 = load('app.plan.v2', null);
    if (Array.isArray(planV2) && planV2[0]?.cena) {
      planV2.forEach(day=>{
        ['colazione','pranzo','merenda','cena'].forEach(mealKey=>{
          const m = day[mealKey];
          if(!m?.meal) return;
          const r = RECIPES.find(x=>x.id===m.meal);
          if(!r || !allow(r)) return;
          const servings = eqServings(m.adults||0, m.kids||0, s.kidsAges);
          const factor = (servings || 1) / (r.servings || 2);
          (r.ingredients||[]).forEach(ing => add(need, ing.item, (ing.qty||0)*factor, ing.unit));
        });
      });
    } else {
      const planV1 = load('app.plan', []);
      planV1.forEach(p=>{
        if(!p?.meal) return;
        const r = RECIPES.find(x=>x.id===p.meal);
        if(!r || !allow(r)) return;
        const factor = (p.servings || 2) / (r.servings || 2);
        (r.ingredients||[]).forEach(ing => add(need, ing.item, (ing.qty||0)*factor, ing.unit));
      });
    }
  }

  // sottrai dispensa
  const pantry = load('app.pantry', []);
  pantry.forEach(p=>{
    const key = (p.item||'').toLowerCase()+'|'+p.unit;
    if(need[key]) need[key].qty = Math.max(0, need[key].qty - (p.qty||0));
  });

  const items = Object.values(need).filter(x=>x.qty>0).sort((a,b)=>a.item.localeCompare(b.item));

  const totalCost = items.reduce((sum,x)=> sum + estimateCost(x.item, x.qty, x.unit), 0);
  const over = totalCost > (s.budget || 0);

  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `
    <h1>Lista della spesa</h1>
    <div class="small">Budget: € <strong>${s.budget}</strong> · Dieta: <strong>${s.diet}</strong></div>
    <ul id="list" class="list" style="margin-top:12px"></ul>
    <div class="small" style="margin-top:8px">${items.length ? items.length+' voci' : 'Niente da comprare ✔'}</div>
    <div style="margin-top:10px; padding:10px; border:1px solid var(--border); border-radius:8px; background:${over ? '#2a1111' : '#112a16'};">
      <strong>Costo stimato:</strong> € ${totalCost.toFixed(2)} 
      ${over ? '<span class="small">⚠️ oltre budget</span>' : '<span class="small">✔ entro budget</span>'}
    </div>
    <button id="copy" class="btn" style="margin-top:12px">Copia negli appunti</button>
  `;

  const ul = el.querySelector('#list');
  ul.innerHTML = items.map(x=>{
    const c = estimateCost(x.item, x.qty, x.unit);
    const cost = c ? ` — € ${c.toFixed(2)}` : '';
    return `<li><strong>${x.item}</strong> — ${Math.round(x.qty)} ${x.unit}${cost}</li>`;
  }).join('') || `<li class="small">Completa il planner per generare la lista.</li>`;

  el.querySelector('#copy').addEventListener('click', ()=>{
    const text = items.map(x=>`${x.item}: ${Math.round(x.qty)} ${x.unit}`).join('\n');
    navigator.clipboard.writeText(text || 'Lista vuota');
    el.querySelector('#copy').textContent='Copiato ✔';
    setTimeout(()=> el.querySelector('#copy').textContent='Copia negli appunti', 1200);
  });

  return el;
}
