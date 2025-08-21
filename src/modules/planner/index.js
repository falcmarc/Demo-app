// src/modules/planner/index.js
import { RECIPES } from '../../data/recipes.js';
import { loadSettings, dietPredicate, kidFactor } from '../../lib/utils.js';

const DAYS  = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];
const MEALS = ['colazione','pranzo','merenda','cena'];

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
    const base = settings.participation[meal];
    return { adults: base.adults || 0, kids: base.kids || 0 };
  }
  // 'tutti'
  const a = meal==='pranzo' ? Math.max(0, A - (settings.adultsSkipLunch||0)) : A;
  const k = meal==='pranzo' ? Math.max(0, K - (settings.kidsSkipLunch||0))   : K;
  return { adults: a, kids: k };
}

function equivalents(adults, kids, kidsAges) {
  const ages = (kidsAges||[]).slice(0, Math.max(0, kids||0));
  const kidsEq = ages.reduce((sum,a)=> sum + kidFactor(a), 0);
  return Math.max(0, (adults||0) + kidsEq);
}

function emptyPlanV3() {
  return DAYS.map(()=>Object.fromEntries(MEALS.map(m=>[m, { meal:null, excluded:false } ])));
}

function migrateAnyToV3() {
  try {
    const v3 = JSON.parse(localStorage.getItem('app.plan.v3')||'null');
    if (Array.isArray(v3) && v3[0]?.cena) return v3;
  } catch {}
  // migra da v2/v1 → solo cene
  let base = emptyPlanV3();
  try {
    const v2 = JSON.parse(localStorage.getItem('app.plan.v2')||'null');
    if (Array.isArray(v2) && v2[0]?.cena) {
      v2.forEach((d,i)=>{ base[i].cena.meal = d.cena?.meal || null; });
      localStorage.setItem('app.plan.v3', JSON.stringify(base));
      return base;
    }
  } catch {}
  try {
    const v1 = JSON.parse(localStorage.getItem('app.plan')||'null');
    if (Array.isArray(v1) && v1[0]?.meal !== undefined) {
      v1.forEach((d,i)=>{ base[i].cena.meal = d.meal || null; });
      localStorage.setItem('app.plan.v3', JSON.stringify(base));
      return base;
    }
  } catch {}
  localStorage.setItem('app.plan.v3', JSON.stringify(base));
  return base;
}

export default function Planner() {
  const settings = loadSettings();
  const allowDiet = dietPredicate(settings);
  const planKey = 'app.plan.v3';
  const setPlan = (v)=> localStorage.setItem(planKey, JSON.stringify(v));
  const getPlan = ()=> JSON.parse(localStorage.getItem(planKey) || 'null') || migrateAnyToV3();

  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `
    <h1>Planner settimanale</h1>
    <div class="small" style="margin-bottom:8px">
      Dieta: <strong>${settings.diet}</strong> · Giorno spesa: <strong>${settings.shoppingDay}</strong>
      · Partecipazione: definita in <a href="#/start">Start</a>
    </div>
    <div id="grid" class="table"></div>
  `;

  const grid = el.querySelector('#grid');

  function render() {
    const plan = getPlan();
    const allowed = RECIPES.filter(allowDiet);
    grid.innerHTML = '';

    // intestazione
    const head = document.createElement('div'); head.className='row head';
    head.innerHTML = `<div class="cell" style="min-width:120px">Pasto</div>` +
      DAYS.map(d=>`<div class="cell">${d}</div>`).join('');
    grid.appendChild(head);

    MEALS.forEach(meal=>{
      const row = document.createElement('div'); row.className='row';

      // label pasto
      const c0 = document.createElement('div'); c0.className='cell'; c0.textContent = meal[0].toUpperCase()+meal.slice(1);
      row.appendChild(c0);

      DAYS.forEach((_, dayIdx)=>{
        const cell = document.createElement('div'); cell.className='cell';
        const p = plan[dayIdx][meal];
        const counts = countsForMeal(settings, meal);
        const servEq = p.excluded ? 0 : equivalents(counts.adults, counts.kids, settings.kidsAges);

        // UI cella: select + porzioni + exclude
        const sel = document.createElement('select'); sel.className='input'; sel.style.width='100%';
        sel.innerHTML = `<option value="">— ricetta —</option>` + allowed.map(r=>`<option value="${r.id}">${r.name}</option>`).join('');
        sel.value = p.meal || '';
        sel.disabled = p.excluded;

        const meta = document.createElement('div'); meta.className='small';
        meta.textContent = p.excluded ? 'Escluso' : `Porzioni: ${servEq.toFixed(1)} (A:${counts.adults} K:${counts.kids})`;

        const ex = document.createElement('label'); ex.className='small';
        ex.style.display='flex'; ex.style.gap='6px'; ex.style.alignItems='center'; ex.style.marginTop='6px';
        const chk = document.createElement('input'); chk.type='checkbox'; chk.checked = !!p.excluded;
        ex.append(chk, document.createTextNode('Escludi'));

        // events
        sel.addEventListener('change', ()=>{
          const pp = getPlan(); pp[dayIdx][meal].meal = sel.value || null; setPlan(pp);
        });
        chk.addEventListener('change', ()=>{
          const pp = getPlan(); pp[dayIdx][meal].excluded = chk.checked; setPlan(pp); render();
        });

        cell.append(sel, meta, ex);
        row.appendChild(cell);
      });

      grid.appendChild(row);
    });
  }

  render();
  return el;
}
