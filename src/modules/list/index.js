import { RECIPES } from '../../data/recipes.js';

function load(key, fallback){ try{ return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }

function add(map, k, qty, unit){
  const key = k.toLowerCase() + '|' + unit;
  map[key] = map[key] || { item:k, qty:0, unit };
  map[key].qty += qty;
}

export default function List() {
  const plan   = load('app.plan', []);
  const pantry = load('app.pantry', []);
  const settings = load('app.settings', {adults:2,kids:0,budget:100});

  const need = {}; // mappa aggregata

  // 1) Somma ingredienti dal planner
  plan.forEach(p=>{
    if(!p?.meal) return;
    const r = RECIPES.find(x=>x.id===p.meal);
    if(!r) return;
    const factor = (settings.adults + settings.kids*0.6) / r.servings * (p.servings||2)/2;
    r.ingredients.forEach(ing => add(need, ing.item, ing.qty * (factor||1), ing.unit));
  });

  // 2) Sottrai dispensa
  pantry.forEach(p=>{
    const key = p.item.toLowerCase()+'|'+p.unit;
    if(need[key]) need[key].qty = Math.max(0, need[key].qty - p.qty);
  });

  // 3) Lista finale
  const items = Object.values(need).filter(x=>x.qty>0).sort((a,b)=>a.item.localeCompare(b.item));

  const el = document.createElement('div');
  el.className = 'card';
  const totalLines = items.length;
  el.innerHTML = `
    <h1>Lista della spesa</h1>
    <div class="small">Adulti: ${settings.adults} · Bambini: ${settings.kids} · Budget: € ${settings.budget}</div>
    <ul id="list" class="list" style="margin-top:12px"></ul>
    <div class="small" style="margin-top:8px">${totalLines ? totalLines+' voci' : 'Niente da comprare ✔'}</div>
    <button id="copy" class="btn" style="margin-top:12px">Copia negli appunti</button>
  `;

  const ul = el.querySelector('#list');
  ul.innerHTML = items.map(x=>`<li><strong>${x.item}</strong> — ${Math.round(x.qty)} ${x.unit}</li>`).join('') || `<li class="small">Completa il planner per generare la lista.</li>`;

  el.querySelector('#copy').addEventListener('click', ()=>{
    const text = items.map(x=>`${x.item}: ${Math.round(x.qty)} ${x.unit}`).join('\n');
    navigator.clipboard.writeText(text || 'Lista vuota');
    el.querySelector('#copy').textContent = 'Copiato ✔';
    setTimeout(()=> el.querySelector('#copy').textContent='Copia negli appunti', 1200);
  });

  return el;
}
