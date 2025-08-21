// src/modules/planner/index.js
import { RECIPES } from '../../data/recipes.js';
import { loadSettings, dietPredicate, kidFactor } from '../../lib/utils.js';
import { generateOfficialWeeklyPlan } from '../../lib/menu.js';

const DAYS  = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];
const MEALS = ['colazione','pranzo','merenda','cena'];

// calcola "persone equivalenti" date le presenze e le età dei primi N bambini
function equivalentsFor(adultsPresent, kidsPresent, kidsAgesTotal) {
  const ages = (kidsAgesTotal || []).slice(0, Math.max(0, kidsPresent));
  const kidsEq = ages.reduce((sum,a)=> sum + kidFactor(a), 0);
  return Math.max(0, (adultsPresent||0) + kidsEq);
}

// crea un piano V2 vuoto con presenze precompilate
function emptyPlanV2(s) {
  const baseKids = Math.max(0, s.kids || 0);
  const baseAdults = Math.max(0, s.adults || 0);
  return DAYS.map((_, idx) => {
    // per default: a pranzo applica gli "skip pranzo"
    const adultsPranzo = Math.max(0, baseAdults - (s.adultsSkipLunch || 0));
    const kidsPranzo   = Math.max(0, baseKids   - (s.kidsSkipLunch   || 0));
    return {
      colazione: { meal: null, adults: baseAdults, kids: baseKids },
      pranzo:    { meal: null, adults: adultsPranzo, kids: kidsPranzo },
      merenda:   { meal: null, adults: baseAdults, kids: baseKids },
      cena:      { meal: null, adults: baseAdults, kids: baseKids },
    };
  });
}

// migra vecchio piano (V1) → V2 (solo cena popolata)
function migrateV1toV2(v1, s) {
  const v2 = emptyPlanV2(s);
  (v1 || []).forEach((d, i) => {
    if (!v2[i]) return;
    v2[i].cena.meal = d?.meal || null;
    // le porzioni di V1 non le usiamo più: ora si calcolano dalle presenze
  });
  return v2;
}

export default function Planner() {
  const settings = loadSettings();
  const allowDiet = dietPredicate(settings);

  const key = 'app.plan.v2';
  const setPlan = v => localStorage.setItem(key, JSON.stringify(v));
  const getPlan = () => {
    try {
      const v2 = JSON.parse(localStorage.getItem(key) || 'null');
      if (Array.isArray(v2) && v2[0]?.cena) return v2;
    } catch {}
    // se non esiste V2, prova a migrare V1
    try {
      const v1 = JSON.parse(localStorage.getItem('app.plan') || 'null');
      if (Array.isArray(v1) && v1[0]?.meal !== undefined) {
        const m = migrateV1toV2(v1, settings);
        setPlan(m);
        return m;
      }
    } catch {}
    const init = emptyPlanV2(settings);
    setPlan(init);
    return init;
  };

  const allTags = [...new Set(RECIPES.flatMap(r => r.tags || []))].sort();

  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `
    <h1>Planner settimanale (4 pasti)</h1>
    <div class="small" style="margin-bottom:8px">
      Dieta: <strong>${settings.diet}</strong> · Giorno spesa: <strong>${settings.shoppingDay}</strong>
    </div>

    <div style="display:grid; gap:10px; grid-template-columns: 1fr auto; align-items:center; margin-bottom:8px">
      <input id="q" class="input" placeholder="Cerca ricetta (nome o ingrediente)..." />
      <div id="tags" style="display:flex; gap:6px; flex-wrap:wrap"></div>
    </div>

    <div style="display:flex; gap:8px; align-items:center; margin-bottom:8px">
      <button id="regen" class="btn">Rigenera (cena)</button>
      <span class="small">Popola automaticamente le <em>cene</em>; puoi cambiare tutto a mano.</span>
    </div>

    <div id="grid"></div>
  `;

  // chip tag
  const tagsBox = el.querySelector('#tags');
  allTags.forEach(t => {
    const b = document.createElement('button');
    b.className = 'btn secondary';
    b.textContent = t;
    b.dataset.active = '0';
    b.addEventListener('click', () => {
      b.dataset.active = b.dataset.active === '1' ? '0' : '1';
      b.classList.toggle('secondary');
      render();
    });
    tagsBox.appendChild(b);
  });

  const grid = el.querySelector('#grid');
  const qInp = el.querySelector('#q');

  function filteredRecipes() {
    const q = (qInp.value || '').toLowerCase().trim();
    const activeTags = Array.from(tagsBox.querySelectorAll('button[data-active="1"]')).map(b => b.textContent);
    return RECIPES
      .filter(allowDiet)
      .filter(r => activeTags.length ? activeTags.every(t => (r.tags || []).includes(t)) : true)
      .filter(r =>
        !q ||
        r.name.toLowerCase().includes(q) ||
        (r.ingredients || []).some(i => (i.item || '').toLowerCase().includes(q))
      );
  }

  function render() {
    const plan = getPlan();
    const allowed = filteredRecipes();
    grid.innerHTML = '';

    // tabella per ogni giorno
    DAYS.forEach((dayName, dayIdx) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.marginBottom = '12px';
      card.innerHTML = `
        <h3 style="margin-top:0">${dayName}</h3>
        <div class="small" style="margin-bottom:6px">Imposta ricetta e presenze per ogni pasto.</div>
        <div class="table">
          <div class="row head">
            <div class="cell" style="min-width:110px">Pasto</div>
            <div class="cell">Ricetta</div>
            <div class="cell" style="min-width:100px">Adulti</div>
            <div class="cell" style="min-width:100px">Bambini</div>
            <div class="cell" style="min-width:120px">Porzioni (calc.)</div>
          </div>
        </div>
      `;
      const table = card.querySelector('.table');

      MEALS.forEach(mealKey => {
        const row = document.createElement('div');
        row.className = 'row';

        // label pasto
        const cellMeal = document.createElement('div');
        cellMeal.className = 'cell';
        cellMeal.textContent = mealKey[0].toUpperCase() + mealKey.slice(1);

        // select ricetta
        const cellSel = document.createElement('div'); cellSel.className='cell';
        const sel = document.createElement('select'); sel.className='input';
        sel.innerHTML = `<option value="">— scegli ricetta —</option>` + 
          allowed.map(r=>`<option value="${r.id}">${r.name}</option>`).join('');
        sel.value = plan[dayIdx][mealKey].meal || '';

        // presenze adulti
        const cellA = document.createElement('div'); cellA.className='cell';
        const inA = document.createElement('input'); inA.className='input'; inA.type='number'; inA.min='0';
        inA.value = plan[dayIdx][mealKey].adults;

        // presenze bambini
        const cellK = document.createElement('div'); cellK.className='cell';
        const inK = document.createElement('input'); inK.className='input'; inK.type='number'; inK.min='0';
        inK.value = plan[dayIdx][mealKey].kids;

        // porzioni calcolate
        const cellS = document.createElement('div'); cellS.className='cell';
        const servingsNow = equivalentsFor(+inA.value||0, +inK.value||0, settings.kidsAges);
        cellS.textContent = servingsNow.toFixed(1);

        // eventi
        sel.addEventListener('change', () => {
          const p = getPlan();
          p[dayIdx][mealKey].meal = sel.value || null;
          setPlan(p);
        });
        const recalc = () => {
          const p = getPlan();
          p[dayIdx][mealKey].adults = Math.max(0, +inA.value || 0);
          p[dayIdx][mealKey].kids   = Math.max(0, +inK.value || 0);
          setPlan(p);
          const s = equivalentsFor(p[dayIdx][mealKey].adults, p[dayIdx][mealKey].kids, settings.kidsAges);
          cellS.textContent = s.toFixed(1);
        };
        inA.addEventListener('change', recalc);
        inK.addEventListener('change', recalc);

        // monta riga
        cellSel.appendChild(sel);
        cellA.appendChild(inA);
        cellK.appendChild(inK);
        row.append(cellMeal, cellSel, cellA, cellK, cellS);
        table.appendChild(row);
      });

      grid.appendChild(card);
    });
  }

  // popolazione automatica delle CENE (puoi poi cambiare)
  el.querySelector('#regen').addEventListener('click', () => {
    const auto = generateOfficialWeeklyPlan(); // restituisce 7 ricette (cena)
    const plan = getPlan();
    auto.forEach((d, i) => { if (plan[i]?.cena) plan[i].cena.meal = d.meal; });
    setPlan(plan);
    render();
  });

  qInp.addEventListener('input', render);
  render();
  return el;
}
