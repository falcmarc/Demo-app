// src/modules/start/index.js
import { generateOfficialWeeklyPlan } from '../../lib/menu.js';

export default function Start() {
  const KEY = 'app.settings';
  const def = {
    shoppingDay: 'Sab',
    adults: 2,
    kids: 0,
    kidsAges: [],
    adultsSkipLunch: 0,
    kidsSkipLunch: 0,
    budget: 100,
    diet: 'onnivoro',
    participation: {
      colazione: { mode: 'tutti' },
      pranzo:    { mode: 'tutti' },          // puoi cambiare in 'solo_adulti', 'solo_bambini', 'nessuno', 'custom'
      merenda:   { mode: 'solo_bambini' },
      cena:      { mode: 'tutti' },
    }
  };
  const load = () => {
    try { return { ...def, ...(JSON.parse(localStorage.getItem(KEY) || 'null') || {}) }; }
    catch { return def; }
  };
  const save = (v) => localStorage.setItem(KEY, JSON.stringify(v));
  const S = load();

  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `
    <h1>Impostazioni iniziali</h1>

    <div style="display:grid; gap:12px; grid-template-columns: repeat(2, minmax(240px, 1fr)); max-width:980px">
      <div>
        <label class="small">Giorno spesa</label>
        <select id="shoppingDay" class="input">
          ${['Lun','Mar','Mer','Gio','Ven','Sab','Dom'].map(d=>`<option ${S.shoppingDay===d?'selected':''}>${d}</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="small">Budget settimanale (€)</label>
        <input id="budget" class="input" type="number" min="0" value="${S.budget}">
      </div>

      <div>
        <label class="small">Adulti</label>
        <input id="adults" class="input" type="number" min="0" value="${S.adults}">
      </div>
      <div>
        <label class="small">Bambini</label>
        <input id="kids" class="input" type="number" min="0" value="${S.kids}">
      </div>

      <div style="grid-column:1/-1">
        <label class="small">Età bambini (anni)</label>
        <div id="kidsAges" style="display:flex; gap:8px; flex-wrap:wrap"></div>
      </div>

      <div>
        <label class="small">Adulti che non pranzano</label>
        <input id="adultsSkip" class="input" type="number" min="0" value="${S.adultsSkipLunch}">
      </div>
      <div>
        <label class="small">Bambini che non pranzano</label>
        <input id="kidsSkip" class="input" type="number" min="0" value="${S.kidsSkipLunch}">
      </div>

      <div style="grid-column:1/-1">
        <label class="small">Regime alimentare</label>
        <select id="diet" class="input" style="max-width:320px">
          ${['onnivoro','vegetariano','vegano','pesce','senza lattosio','senza glutine'].map(v=>`<option ${S.diet===v?'selected':''}>${v}</option>`).join('')}
        </select>
      </div>
    </div>

    <h2 style="margin-top:18px">Chi partecipa ai pasti (macro)</h2>
    <div class="small" style="margin-bottom:6px">La tabella del planner userà queste regole per calcolare le porzioni.</div>

    <div style="display:grid; gap:10px; grid-template-columns: repeat(2, minmax(240px, 1fr)); max-width:980px">
      ${['colazione','pranzo','merenda','cena'].map(meal => `
        <div class="card" style="padding:12px">
          <div class="small" style="margin-bottom:6px">${meal[0].toUpperCase()+meal.slice(1)}</div>
          <select data-meal="${meal}" class="input meal-mode" style="margin-bottom:8px">
            ${[
              ['tutti','Tutti'],
              ['solo_adulti','Solo adulti'],
              ['solo_bambini','Solo bambini'],
              ['nessuno','Nessuno'],
              ['custom','Personalizzato…'],
            ].map(([val,label])=>`<option value="${val}" ${((S.participation?.[meal]?.mode)||'tutti')===val?'selected':''}>${label}</option>`).join('')}
          </select>
          <div class="custom" data-meal="${meal}" style="display:${(S.participation?.[meal]?.mode)==='custom'?'block':'none'}">
            <div style="display:flex; gap:8px">
              <input class="input a" type="number" min="0" placeholder="Adulti" value="${S.participation?.[meal]?.adults ?? ''}">
              <input class="input k" type="number" min="0" placeholder="Bambini" value="${S.participation?.[meal]?.kids ?? ''}">
            </div>
            <div class="small" style="margin-top:4px">Se vuoto, usa i numeri globali.</div>
          </div>
        </div>
      `).join('')}
    </div>

    <div style="margin-top:16px; display:flex; gap:10px; align-items:center">
      <button id="save" class="btn">Salva e apri Planner</button>
      <span id="msg" class="small"></span>
    </div>
  `;

  // età bimbi
  const kidsBox = el.querySelector('#kidsAges');
  function renderKidsAges() {
    const n = Math.max(0, +el.querySelector('#kids').value || 0);
    const ages = (S.kidsAges || []).slice(0, n);
    while (ages.length < n) ages.push(6);
    kidsBox.innerHTML = '';
    ages.forEach((age, i) => {
      const input = document.createElement('input');
      input.type='number'; input.min='0'; input.className='input'; input.style.width='90px';
      input.value = age;
      input.addEventListener('change', ()=>{ ages[i]=Math.max(0,+input.value||0); S.kidsAges=ages; });
      kidsBox.appendChild(input);
    });
    S.kidsAges = ages;
  }
  el.querySelector('#kids').addEventListener('change', renderKidsAges);
  renderKidsAges();

  // toggle custom blocchi
  el.querySelectorAll('.meal-mode').forEach(sel=>{
    sel.addEventListener('change', ()=>{
      const meal = sel.dataset.meal;
      const box = el.querySelector(`.custom[data-meal="${meal}"]`);
      box.style.display = sel.value==='custom' ? 'block' : 'none';
    });
  });

  // salva
  el.querySelector('#save').addEventListener('click', () => {
    const part = {};
    ['colazione','pranzo','merenda','cena'].forEach(meal=>{
      const mode = el.querySelector(`select[data-meal="${meal}"]`).value;
      const box  = el.querySelector(`.custom[data-meal="${meal}"]`);
      const a = box ? Math.max(0, +box.querySelector('.a').value || 0) : 0;
      const k = box ? Math.max(0, +box.querySelector('.k').value || 0) : 0;
      part[meal] = { mode, ...(mode==='custom' ? { adults:a, kids:k } : {}) };
    });

    const out = {
      shoppingDay: el.querySelector('#shoppingDay').value,
      budget: Math.max(0, +el.querySelector('#budget').value || 0),
      adults: Math.max(0, +el.querySelector('#adults').value || 0),
      kids: Math.max(0, +el.querySelector('#kids').value || 0),
      kidsAges: S.kidsAges || [],
      adultsSkipLunch: Math.max(0, +el.querySelector('#adultsSkip').value || 0),
      kidsSkipLunch: Math.max(0, +el.querySelector('#kidsSkip').value || 0),
      diet: el.querySelector('#diet').value || 'onnivoro',
      participation: part
    };
    save(out);

    // (opzionale) genera cene iniziali
    const plan = generateOfficialWeeklyPlan();
    localStorage.setItem('app.plan', JSON.stringify(plan)); // legacy
    location.hash = '#/planner';
  });

  return el;
}