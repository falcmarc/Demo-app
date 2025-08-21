// src/modules/planner/index.js
import { getRecipes } from '../../data/recipes.js';
import { loadSettings, dietPredicate, kidFactor } from '../../lib/utils.js';

// giorni e pasti
const DAYS = ['Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato','Domenica'];
const MEALS = ['colazione','pranzo','merenda','cena'];

const key = 'app.plan.v3';
const getPlan = () => JSON.parse(localStorage.getItem(key) || 'null');
const setPlan = (plan) => localStorage.setItem(key, JSON.stringify(plan));

// genera un nuovo piano vuoto
function emptyPlan(){
  return DAYS.map(()=> {
    const obj = {};
    MEALS.forEach(m => obj[m] = { meal:null, excluded:false });
    return obj;
  });
}

// funzione per generare menu bilanciato
function generateBalancedWeeklyMenu(recipes, settings){
  const allow = dietPredicate(settings);
  const allowedRecipes = recipes.filter(allow);

  // raggruppa per tipo pasto (tag)
  const byMeal = {};
  MEALS.forEach(m => byMeal[m] = allowedRecipes.filter(r => r.tags?.includes(m)));

  // distribuisci ricette per 7 giorni
  const plan = emptyPlan();
  plan.forEach(day=>{
    MEALS.forEach(m=>{
      const pool = byMeal[m].length ? byMeal[m] : allowedRecipes;
      const pick = pool[Math.floor(Math.random()*pool.length)];
      day[m] = { meal: pick?.id || null, excluded:false };
    });
  });
  return plan;
}

export default function Planner(){
  const settings = loadSettings();
  let RECIPES = [];

  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `
    <h1>Planner settimanale</h1>
    <div class="small" style="margin-bottom:8px">
      Dieta: <strong>${settings.diet}</strong> · Persone: <strong>${settings.adults} + ${settings.kids} bambini</strong> · Giorno spesa: <strong>${settings.shoppingDay}</strong>
    </div>
    <div class="toolbar" style="display:flex; gap:8px; margin-bottom:12px">
      <button id="reset" class="btn secondary">Azzera</button>
      <button id="auto" class="btn">Precompila bilanciato</button>
    </div>
    <div style="overflow-x:auto">
      <table class="planner" style="border-collapse:collapse; width:100%; text-align:center">
        <thead>
          <tr>
            <th>Giorno</th>
            ${MEALS.map(m=>`<th style="padding:6px">${m}</th>`).join('')}
          </tr>
        </thead>
        <tbody id="tbody"></tbody>
      </table>
    </div>
  `;

  const tbody = el.querySelector('#tbody');

  // renderizza la tabella
  async function render(){
    if (!RECIPES.length) RECIPES = await getRecipes();

    let plan = getPlan();
    if (!plan) { plan = emptyPlan(); setPlan(plan); }

    tbody.innerHTML = '';
    plan.forEach((day, dIdx)=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td style="padding:6px; font-weight:bold">${DAYS[dIdx]}</td>`;
      MEALS.forEach(m=>{
        const cell = document.createElement('td');
        cell.style.padding = '4px';

        // select ricette
        const sel = document.createElement('select');
        sel.className = 'input';
        sel.innerHTML = `<option value="">—</option>` + RECIPES.map(r=>`<option value="${r.id}">${r.name}</option>`).join('');
        sel.value = day[m].meal || '';

        sel.addEventListener('change', ()=>{
          plan[dIdx][m].meal = sel.value || null;
          setPlan(plan);
        });

        // checkbox esclusione
        const ex = document.createElement('input');
        ex.type = 'checkbox';
        ex.checked = !!day[m].excluded;
        ex.title = "Escludi questo pasto";
        ex.addEventListener('change', ()=>{
          plan[dIdx][m].excluded = ex.checked;
          setPlan(plan);
        });

        cell.appendChild(sel);
        cell.appendChild(document.createElement('br'));
        cell.appendChild(ex);
        cell.appendChild(document.createTextNode(' escl.'));

        tr.appendChild(cell);
      });
      tbody.appendChild(tr);
    });
  }

  // reset
  el.querySelector('#reset').addEventListener('click', ()=>{
    const plan = emptyPlan();
    setPlan(plan);
    render();
  });

  // precompila bilanciato
  el.querySelector('#auto').addEventListener('click', async ()=>{
    if (!RECIPES.length) RECIPES = await getRecipes();
    const plan = generateBalancedWeeklyMenu(RECIPES, settings);
    setPlan(plan);
    render();
  });

  render();
  return el;
}
