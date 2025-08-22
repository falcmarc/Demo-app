// src/modules/planner/index.js
import { getRecipes } from '../../data/recipes.js';
import { loadSettings, dietPredicate, kidFactor } from '../../lib/utils.js';
import { generateBalancedWeeklyMenu } from '../../lib/balancedMenu.js';

const DAYS = ['Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato','Domenica'];
const MEALS = ['colazione','pranzo','merenda','cena'];

const key = 'app.plan.v3';
const getPlan = () => JSON.parse(localStorage.getItem(key) || 'null');
const setPlan = (plan) => localStorage.setItem(key, JSON.stringify(plan));

function emptyPlan(){
  return DAYS.map(()=> Object.fromEntries(MEALS.map(m => [m, { meal:null, excluded:false }])) );
}

export default function Planner(){
  const settings = loadSettings();
  const allow = dietPredicate(settings);
  let RECIPES = [];

  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `
    <h1>Planner settimanale</h1>
    <div class="small" style="margin-bottom:8px">
      Dieta: <strong>${settings.diet}</strong> · Famiglia: <strong>${settings.adults} adulti, ${settings.kids} bambini</strong> · Spesa: <strong>${settings.shoppingDay}</strong>
    </div>
    <div class="toolbar" style="display:flex; gap:8px; margin-bottom:12px">
      <button id="reset" class="btn secondary">Azzera</button>
      <button id="auto" class="btn">Precompila bilanciato</button>
      <span id="status" class="small" style="margin-left:auto">Carico ricette…</span>
    </div>
    <div style="overflow-x:auto">
      <table class="planner" style="border-collapse:collapse; width:100%; text-align:center">
        <thead>
          <tr>
            <th style="padding:6px; text-align:left">Giorno</th>
            ${MEALS.map(m=>`<th style="padding:6px; text-transform:capitalize">${m}</th>`).join('')}
          </tr>
        </thead>
        <tbody id="tbody"></tbody>
      </table>
    </div>
  `;

  const tbody  = el.querySelector('#tbody');
  const status = el.querySelector('#status');

  (async () => {
    RECIPES = await getRecipes();
    status.textContent = `${RECIPES.length} ricette`;
    render();
  })().catch(e => { console.error(e); status.textContent='Errore ricette'; render(); });

  function render(){
    let plan = getPlan();
    if (!plan) { plan = emptyPlan(); setPlan(plan); }

    const allowed = RECIPES.filter(allow);
    tbody.innerHTML = '';

    plan.forEach((day, dIdx)=>{
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.style.padding='6px'; th.style.textAlign='left';
      th.textContent = DAYS[dIdx];
      tr.appendChild(th);

      MEALS.forEach(m=>{
        const td = document.createElement('td'); td.style.padding='6px';

        // select
        const sel = document.createElement('select');
        sel.className = 'input';
        sel.innerHTML = `<option value="">—</option>` + 
          allowed
            .filter(r => (r.tags||[]).includes(m)) // priorità ricette del pasto
            .concat(allowed)                       // fallback: tutte
            .filter((r,i,arr)=> arr.findIndex(a=>a.id===r.id)===i) // dedupe
            .map(r=>`<option value="${r.id}">${r.name}</option>`).join('');

        sel.value = day[m].meal || '';
        sel.disabled = !!day[m].excluded;

        sel.addEventListener('change', ()=>{
          const p = getPlan(); p[dIdx][m].meal = sel.value || null; setPlan(p);
        });

        // exclude
        const lab = document.createElement('label'); lab.className='small';
        lab.style.display='flex'; lab.style.gap='6px'; lab.style.alignItems='center'; lab.style.marginTop='6px';
        const chk = document.createElement('input'); chk.type='checkbox'; chk.checked = !!day[m].excluded;
        chk.addEventListener('change', ()=>{
          const p = getPlan(); p[dIdx][m].excluded = chk.checked; setPlan(p); render();
        });
        lab.append(chk, document.createTextNode('Escludi'));

        td.appendChild(sel);
        td.appendChild(lab);
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });
  }

  el.querySelector('#reset').addEventListener('click', ()=>{
    setPlan(emptyPlan());
    render();
  });

  el.querySelector('#auto').addEventListener('click', async ()=>{
    if (!RECIPES.length) RECIPES = await getRecipes();
    const plan = generateBalancedWeeklyMenu(RECIPES, settings);
    setPlan(plan);
    render();
  });

  return el;
}
