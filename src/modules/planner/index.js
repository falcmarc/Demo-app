// src/modules/planner/index.js
import { getRecipes } from '../../data/recipes.js';
import { loadSettings, dietPredicate, kidFactor } from '../../lib/utils.js';
import { generateBalancedWeeklyMenu } from '../../lib/balancedMenu.js';

const DAYS  = ['Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato','Domenica'];
const MEALS = ['colazione','pranzo','merenda','cena'];

const PLAN_KEY = 'app.plan.v3';
const getPlan = () => JSON.parse(localStorage.getItem(PLAN_KEY) || 'null');
const setPlan = (p) => localStorage.setItem(PLAN_KEY, JSON.stringify(p));

// piano vuoto 7×4
function emptyPlan(){
  return DAYS.map(()=> Object.fromEntries(MEALS.map(m => [m, { meal:null, excluded:false }])) );
}

// --- partecipazione/porzioni (coerente con Start) ---
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

// --- icone in base ai tag ---
function iconsForRecipe(r){
  const t = (r?.tags || []).map(x=>x.toLowerCase());
  const name = (r?.name || '').toLowerCase();
  const icons = [];
  if (t.includes('pesce') || /salmone|merluzzo|tonno|spada|orata|branzino|sgombro/.test(name)) icons.push('🐟');
  if (t.includes('carne') || /manzo|bistecca|ragù|salsiccia|pollo|maiale|tacchino|burger/.test(name)) icons.push('🍗');
  if (t.includes('vegano') || t.includes('veg') || t.includes('vegetariano') || /tofu|verdure|insalat/.test(name)) icons.push('🌱');
  if (t.includes('pasta') || /pasta|spaghetti|penne|fusilli|riso|risotto|couscous/.test(name)) icons.push('🍝');
  if (t.includes('pizza')) icons.push('🍕');
  if (t.includes('latticini') || /yogurt|mozzarella|formaggio|latte/.test(name)) icons.push('🧀');
  if (t.includes('dolce') || /torta|biscotti|pancake|marmellata|miele|nocciolata/.test(name)) icons.push('🍩');
  return icons.length ? icons.join(' ') : '🍽️';
}

// --- overlay / modale generica ---
function ensureOverlayRoot(){
  let root = document.getElementById('overlay-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'overlay-root';
    root.style.position = 'fixed';
    root.style.inset = '0';
    root.style.zIndex = '9999';
    root.style.display = 'none';
    document.body.appendChild(root);
  }
  return root;
}
function openOverlay(contentHTML, { fullscreen=false } = {}){
  const root = ensureOverlayRoot();
  root.innerHTML = `
    <div style="
      position:absolute; inset:0; background:rgba(0,0,0,0.45);
      display:flex; align-items:${fullscreen?'stretch':'center'}; justify-content:center; padding:20px;">
      <div style="
        background:var(--bg, #111); color:inherit;
        width:${fullscreen?'min(1200px, 96vw)':'min(640px, 96vw)'};
        max-height: 92vh; overflow:auto; border-radius:12px; border:1px solid var(--border,#333);
        box-shadow: 0 15px 50px rgba(0,0,0,0.45); padding:${fullscreen?'18px 18px 8px':'16px'};">
        ${contentHTML}
      </div>
    </div>`;
  root.style.display = 'block';
  // chiudi cliccando sul backdrop
  root.firstElementChild.addEventListener('click', (e)=>{
    if (e.target === root.firstElementChild) closeOverlay();
  });
}
function closeOverlay(){
  const root = ensureOverlayRoot();
  root.style.display = 'none';
  root.innerHTML = '';
}

// --- UI principale ---
export default function Planner(){
  const settings = loadSettings();
  const allow    = dietPredicate(settings);
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

  function recipeById(id){ return (RECIPES || []).find(r => r.id === id); }

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

      MEALS.forEach(meal=>{
        const td = document.createElement('td'); td.style.padding='6px';

        // select ricette
        const sel = document.createElement('select');
        sel.className = 'input';
        sel.title = 'Seleziona ricetta';
        sel.style.minWidth = '220px';
        sel.innerHTML = `<option value="">—</option>` + 
          allowed
            .filter(r => (r.tags||[]).includes(meal)) // priorità per tipo pasto
            .concat(allowed)                           // fallback: tutte
            .filter((r,i,arr)=> arr.findIndex(a=>a.id===r.id)===i) // dedupe
            .map(r=>`<option value="${r.id}">${r.name}</option>`).join('');

        sel.value = day[meal].meal || '';
        sel.disabled = !!day[meal].excluded;

        // riga meta: icone + kcal
        const meta = document.createElement('div');
        meta.className = 'small';
        meta.style.marginTop = '4px';
        updateMeta(meta, sel.value, meal);

        sel.addEventListener('change', ()=>{
          const p = getPlan(); p[dIdx][meal].meal = sel.value || null; setPlan(p);
          updateMeta(meta, sel.value, meal);
        });

        // bottone Dettagli
        const btn = document.createElement('button');
        btn.className = 'btn secondary';
        btn.textContent = 'Dettagli';
        btn.disabled = !day[meal].meal || !!day[meal].excluded;
        btn.style.marginLeft = '6px';

        btn.addEventListener('click', ()=>{
          const rec = recipeById(day[meal].meal);
          if (!rec) return;
          openMini(rec, meal);
        });

        // exclude
        const lab = document.createElement('label'); lab.className='small';
        lab.style.display='flex'; lab.style.gap='6px'; lab.style.alignItems='center'; lab.style.marginTop='6px';
        const chk = document.createElement('input'); chk.type='checkbox'; chk.checked = !!day[meal].excluded;
        chk.addEventListener('change', ()=>{
          const p = getPlan(); p[dIdx][meal].excluded = chk.checked; setPlan(p);
          // disabilita/abilita
          sel.disabled = chk.checked;
          btn.disabled = chk.checked || !sel.value;
          updateMeta(meta, sel.value, meal);
        });
        lab.append(chk, document.createTextNode('Escludi'));

        td.appendChild(sel);
        td.appendChild(btn);
        td.appendChild(meta);
        td.appendChild(lab);
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });
  }

  function updateMeta(metaEl, recipeId, mealKey){
    const rec = recipeById(recipeId);
    const counts = countsForMeal(settings, mealKey);
    const servings = eqServings(counts.adults, counts.kids, settings.kidsAges);
    if (!rec) {
      metaEl.textContent = '—';
      return;
    }
    const icons = iconsForRecipe(rec);
    const kcalPer = rec.kcalPerServing || null;
    const kcalTot = kcalPer ? Math.round(kcalPer * servings) : null;
    metaEl.textContent = `${icons} • ${kcalPer ? `${kcalPer} kcal/porz` : 'kcal n.d.'}${kcalTot ? ` · tot ~${kcalTot}` : ''}`;
  }

  // reset
  el.querySelector('#reset').addEventListener('click', ()=>{
    setPlan(emptyPlan());
    render();
  });

  // precompila bilanciato
  el.querySelector('#auto').addEventListener('click', async ()=>{
    if (!RECIPES.length) RECIPES = await getRecipes();
    const plan = generateBalancedWeeklyMenu(RECIPES, settings);
    setPlan(plan);
    render();
  });

  // --- MINI popup dettagli ---
  function openMini(rec, mealKey){
    const counts = countsForMeal(settings, mealKey);
    const servings = eqServings(counts.adults, counts.kids, settings.kidsAges);
    const factor = (servings || 1) / (rec.servings || 2);
    const kcalPer = rec.kcalPerServing || null;
    const kcalTot = kcalPer ? Math.round(kcalPer * servings) : null;

    const ingredientHTML = (rec.ingredients || []).map(ing=>{
      const qty = (ing.qty || 0) * factor;
      const qtyStr = Number.isInteger(qty) ? qty : Math.round(qty);
      return `<li><strong>${ing.item}</strong> — ${qtyStr} ${ing.unit || ''}</li>`;
    }).join('');

    openOverlay(`
      <div style="display:flex; justify-content:space-between; align-items:center">
        <h2 style="margin:0">${iconsForRecipe(rec)} ${rec.name}</h2>
        <button id="closeMini" class="btn secondary">Chiudi</button>
      </div>
      <div class="small" style="margin:6px 0 10px">
        ${[...(rec.tags||[])].join(' · ') || '—'}
      </div>
      <div style="display:grid; grid-template-columns: repeat(2, minmax(160px,1fr)); gap:12px; margin-bottom:10px">
        <div class="card" style="padding:10px">
          <div class="small">Partecipanti</div>
          <div>Adulti: <strong>${counts.adults}</strong></div>
          <div>Bambini: <strong>${counts.kids}</strong></div>
          <div>Porzioni eq: <strong>${servings.toFixed(1)}</strong></div>
        </div>
        <div class="card" style="padding:10px">
          <div class="small">Nutrizione (stima)</div>
          <div>Kcal/porzione: <strong>${kcalPer ? kcalPer : 'n.d.'}</strong></div>
          <div>Kcal totali: <strong>${kcalTot ?? 'n.d.'}</strong></div>
        </div>
      </div>
      <h3>Ingredienti</h3>
      <ul class="list">${ingredientHTML || '<li class="small">Nessun ingrediente indicato.</li>'}</ul>
      <div style="display:flex; gap:8px; margin-top:12px">
        <button id="openFull" class="btn">Ricetta completa</button>
        <button id="copyList" class="btn secondary">Copia ingredienti</button>
      </div>
    `, { fullscreen:false });

    document.getElementById('closeMini')?.addEventListener('click', closeOverlay);
    document.getElementById('copyList')?.addEventListener('click', ()=>{
      const text = (rec.ingredients||[]).map(ing=>{
        const qty = (ing.qty || 0) * factor;
        const qtyStr = Number.isInteger(qty) ? qty : Math.round(qty);
        return `${ing.item}: ${qtyStr} ${ing.unit||''}`;
      }).join('\n') || 'Nessun ingrediente';
      navigator.clipboard.writeText(text);
    });
    document.getElementById('openFull')?.addEventListener('click', ()=>{
      closeOverlay();
      openRecipeFull(rec, settings, mealKey);
    });
  }

  // --- “Pagina” ricetta fullscreen con ricalcolo ---
  function openRecipeFull(rec, settings, mealKey='cena'){
    const counts0 = countsForMeal(settings, mealKey);
    let a = counts0.adults;
    let k = counts0.kids;

    const renderFull = ()=>{
      const servings = eqServings(a, k, settings.kidsAges);
      const factor   = (servings || 1) / (rec.servings || 2);
      const kcalPer  = rec.kcalPerServing || null;
      const kcalTot  = kcalPer ? Math.round(kcalPer * servings) : null;

      const ingredients = (rec.ingredients || []).map(ing=>{
        const qty = (ing.qty || 0) * factor;
        const qtyStr = Number.isInteger(qty) ? qty : Math.round(qty);
        return `<li><strong>${ing.item}</strong> — ${qtyStr} ${ing.unit||''}</li>`;
      }).join('');

      openOverlay(`
        <div style="display:flex; justify-content:space-between; align-items:center">
          <h2 style="margin:0">${iconsForRecipe(rec)} ${rec.name}</h2>
          <div style="display:flex; gap:8px">
            <button id="print" class="btn secondary">Stampa</button>
            <button id="closeFull" class="btn">Chiudi</button>
          </div>
        </div>
        <div class="small" style="margin:6px 0 10px">
          ${[...(rec.tags||[])].join(' · ') || '—'}
        </div>

        <div class="card" style="padding:12px; margin-bottom:12px">
          <div class="small" style="margin-bottom:6px">Partecipanti (modifica per ricalcolare):</div>
          <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap">
            <label class="small">Adulti <input id="adIn" type="number" min="0" class="input" value="${a}" style="width:90px; margin-left:6px"></label>
            <label class="small">Bambini <input id="kidIn" type="number" min="0" class="input" value="${k}" style="width:90px; margin-left:6px"></label>
            <div class="small">Porzioni eq: <strong>${servings.toFixed(1)}</strong></div>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-bottom:10px">
          <div class="card" style="padding:12px">
            <h3 style="margin-top:0">Ingredienti</h3>
            <ul class="list">${ingredients || '<li class="small">Nessun ingrediente</li>'}</ul>
          </div>
          <div class="card" style="padding:12px">
            <h3 style="margin-top:0">Nutrizione</h3>
            <div class="small">Kcal per porzione: <strong>${kcalPer ?? 'n.d.'}</strong></div>
            <div class="small">Kcal totali: <strong>${kcalTot ?? 'n.d.'}</strong></div>
            <div class="small" style="opacity:.7; margin-top:6px">Le calorie sono mostrate solo se presenti nella ricetta.</div>
          </div>
        </div>

        <div class="card" style="padding:12px">
          <h3 style="margin-top:0">Istruzioni</h3>
          <div class="small">Aggiungi nel JSON un campo <code>steps</code> per vedere la preparazione qui sotto.</div>
          <div style="margin-top:6px">${rec.steps ? `<ol>${rec.steps.map(s=>`<li>${s}</li>`).join('')}</ol>` : '<em class="small">Nessuna istruzione disponibile.</em>'}</div>
        </div>
      `, { fullscreen:true });

      document.getElementById('closeFull')?.addEventListener('click', closeOverlay);
      document.getElementById('print')?.addEventListener('click', ()=> window.print());
      const adIn = document.getElementById('adIn');
      const kidIn = document.getElementById('kidIn');
      adIn?.addEventListener('change', ()=>{ a = Math.max(0, +adIn.value||0); renderFull(); });
      kidIn?.addEventListener('change', ()=>{ k = Math.max(0, +kidIn.value||0); renderFull(); });
    };

    renderFull();
  }

  return el;
}
