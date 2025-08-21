// src/modules/list/index.js
import { getRecipes } from '../../data/recipes.js';
import { loadSettings, kidFactor, dietPredicate } from '../../lib/utils.js';
import { PRICES } from '../../data/prices.js';

// -------- util -----------
function loadLS(key, fb){ try{ return JSON.parse(localStorage.getItem(key)) ?? fb; } catch { return fb; } }
function addNeed(map, k, qty, unit){
  const key = k.toLowerCase()+'|'+unit;
  map[key] = map[key] || { item:k, qty:0, unit };
  map[key].qty += qty;
}
function estimateCost(item, qty, unit){
  const p = PRICES[item.toLowerCase()];
  if(!p || p.unit !== unit) return 0;
  return (qty / p.per) * p.price;
}

// --- partecipazione/porzioni (coerente con Planner v3) ---
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
const MEALS = ['colazione','pranzo','merenda','cena'];
function readPlanV3() {
  const v3 = loadLS('app.plan.v3', null);
  if (Array.isArray(v3) && v3[0]?.cena) return v3;
  return null;
}

// -------- componente ----------
export default function List(){
  const s        = loadSettings();
  const allow    = dietPredicate(s);

  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `<h1>Lista della spesa</h1><div id="mount" class="small">Carico ricette…</div>`;
  const mount = el.querySelector('#mount');

  (async () => {
    const RECIPES = await getRecipes();
    const need = {};

    const planV3 = readPlanV3();
    if (planV3) {
      // V3: 7 giorni x 4 pasti
      planV3.forEach(day => {
        MEALS.forEach(mealKey => {
          const cell = day[mealKey];
          if (!cell || cell.excluded || !cell.meal) return;

          const r = RECIPES.find(x=>x.id===cell.meal);
          if(!r || !allow(r)) return;

          const counts   = countsForMeal(s, mealKey);
          const servings = eqServings(counts.adults, counts.kids, s.kidsAges);
          const factor   = (servings || 1) / (r.servings || 2);

          (r.ingredients || []).forEach(ing => addNeed(need, ing.item, (ing.qty||0)*factor, ing.unit));
        });
      });
    } else {
      // Fallback V2 → V1
      const planV2 = loadLS('app.plan.v2', null);
      if (Array.isArray(planV2) && planV2[0]?.cena) {
        planV2.forEach(day=>{
          MEALS.forEach(mealKey=>{
            const m = day[mealKey];
            if(!m?.meal) return;
            const r = RECIPES.find(x=>x.id===m.meal);
            if(!r || !allow(r)) return;
            const servings = eqServings(m.adults||0, m.kids||0, s.kidsAges);
            const factor   = (servings || 1) / (r.servings || 2);
            (r.ingredients||[]).forEach(ing => addNeed(need, ing.item, (ing.qty||0)*factor, ing.unit));
          });
        });
      } else {
        const planV1 = loadLS('app.plan', []);
        planV1.forEach(p=>{
          if(!p?.meal) return;
          const r = RECIPES.find(x=>x.id===p.meal);
          if(!r || !allow(r)) return;
          const factor = (p.servings || 2) / (r.servings || 2);
          (r.ingredients||[]).forEach(ing => addNeed(need, ing.item, (ing.qty||0)*factor, ing.unit));
        });
      }
    }

    // sottrai dispensa
    const pantry = loadLS('app.pantry', []);
    pantry.forEach(p=>{
      const key = (p.item||'').toLowerCase()+'|'+p.unit;
      if(need[key]) need[key].qty = Math.max(0, need[key].qty - (p.qty||0));
    });

    const items = Object.values(need).filter(x=>x.qty>0).sort((a,b)=>a.item.localeCompare(b.item));
    const totalCost = items.reduce((sum,x)=> sum + estimateCost(x.item, x.qty, x.unit), 0);
    const over = totalCost > (s.budget || 0);

    // render finale
    el.innerHTML = `
      <h1>Lista della spesa</h1>
      <div class="small">Budget: € <strong>${s.budget}</strong> · Dieta: <strong>${s.diet}</strong></div>
      <ul id="list" class="list" style="margin-top:12px"></ul>
      <div class="small" style="margin-top:8px">${items.length ? items.length+' voci' : 'Niente da comprare ✔'}</div>
      <div style="margin-top:10px; padding:10px; border:1px solid var(--border); border-radius:8px; background:${over ? '#2a1111' : '#112a16'};">
        <strong>Costo stimato:</strong> € ${totalCost.toFixed(2)} 
        ${over ? '<span class="small">⚠️ oltre budget</span>' : '<span class="small">✔ entro budget</span>'}
      </div>
      <div style="display:flex; gap:8px; margin-top:12px">
        <button id="copy" class="btn">Copia negli appunti</button>
        <button id="export" class="btn secondary">Esporta JSON</button>
        <button id="clear" class="btn secondary">Svuota lista (solo view)</button>
      </div>
    `;

    const ul = el.querySelector('#list');
    ul.innerHTML = items.map(x=>{
      const c = estimateCost(x.item, x.qty, x.unit);
      const cost = c ? ` — € ${c.toFixed(2)}` : '';
      const qtyStr = Number.isInteger(x.qty) ? x.qty : Math.round(x.qty);
      return `<li><strong>${x.item}</strong> — ${qtyStr} ${x.unit}${cost}</li>`;
    }).join('') || `<li class="small">Completa il planner per generare la lista.</li>`;

    // azioni
    el.querySelector('#copy').addEventListener('click', ()=>{
      const text = items.map(x=>{
        const qtyStr = Number.isInteger(x.qty) ? x.qty : Math.round(x.qty);
        return `${x.item}: ${qtyStr} ${x.unit}`;
      }).join('\n');
      navigator.clipboard.writeText(text || 'Lista vuota');
      el.querySelector('#copy').textContent='Copiato ✔';
      setTimeout(()=> el.querySelector('#copy').textContent='Copia negli appunti', 1200);
    });

    el.querySelector('#export').addEventListener('click', ()=>{
      const payload = { generatedAt: new Date().toISOString(), budget: s.budget, items };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'lista_spesa.json';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    });

    el.querySelector('#clear').addEventListener('click', ()=>{
      // non modifica localStorage: solo UI
      ul.innerHTML = `<li class="small">Lista svuotata (solo visuale). Rigenera dal Planner per ricrearla.</li>`;
      el.querySelector('#copy').disabled = true;
      el.querySelector('#export').disabled = true;
    });

  })();

  return el;
}