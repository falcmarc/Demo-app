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

// calcola "persone equivalenti" date le presenze e le età disponibili
function eqForCounts(adults, kids, kidsAges){
  const ages = (kidsAges||[]).slice(0, Math.max(0, kids||0));
  const kidsEq = ages.reduce((sum,a)=> sum + kidFactor(a), 0);
  return Math.max(0, (adults||0) + kidsEq);
}

export default function List(){
  const s        = loadSettings();
  const allow    = dietPredicate(s);

  // Leggi piano V2 (4 pasti) o V1 (fallback)
  const planV2 = load('app.plan.v2', null);
  const planV1 = planV2 ? null : load('app.plan', []);

  const need = {};

  if (Array.isArray(planV2) && planV2[0]?.cena) {
    // V2: 7 giorni * 4 pasti
    planV2.forEach(day => {
      ['colazione','pranzo','merenda','cena'].forEach(mealKey => {
        const m = day[mealKey];
        if (!m?.meal) return;
        const r = RECIPES.find(x=>x.id===m.meal);
        if(!r || !allow(r)) return;
        const servings = eqForCounts(m.adults, m.kids, s.kidsAges);
        const factor = (servings || 1) / (r.servings || 2);
        (r.ingredients || []).forEach(ing => add(need, ing.item, (ing.qty||0)*factor, ing.unit));
      });
    });
  } else {
    // V1 (solo cena)
    planV1.forEach(p=>{
      if(!p?.meal) return;
      const r = RECIPES.find(x=>x.id===p.meal);
      if(!r || !allow(r)) return;
      const factor = (p.servings || 2) / (r.servings || 2);
      (r.ingredients||[]).forEach(ing => add(need, ing.item, (ing.qty||0)*factor, ing.unit));
    });
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
