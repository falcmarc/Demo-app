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
    diet: 'onnivoro'
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
    <div class="small" style="margin-bottom:12px">
      Scegli quando fai la spesa e chi mangia in famiglia. Potrai cambiare tutto in seguito.
    </div>

    <div style="display:grid; gap:12px; grid-template-columns: repeat(2, minmax(220px, 1fr)); max-width:920px">
      <div>
        <label class="small">Giorno della spesa</label>
        <select id="shoppingDay" class="input">
          ${['Lun','Mar','Mer','Gio','Ven','Sab','Dom'].map(d=>`<option ${S.shoppingDay===d?'selected':''}>${d}</option>`).join('')}
        </select>
      </div>

      <div>
        <label class="small">Budget settimanale (€)</label>
        <input id="budget" class="input" type="number" min="0" value="${S.budget}" />
      </div>

      <div>
        <label class="small">Adulti</label>
        <input id="adults" class="input" type="number" min="0" value="${S.adults}" />
      </div>

      <div>
        <label class="small">Bambini</label>
        <input id="kids" class="input" type="number" min="0" value="${S.kids}" />
      </div>

      <div style="grid-column: 1 / -1">
        <label class="small">Età bambini (anni)</label>
        <div id="kidsAges" style="display:flex; gap:8px; flex-wrap:wrap"></div>
      </div>

      <div>
        <label class="small">Adulti che non pranzano</label>
        <input id="adultsSkip" class="input" type="number" min="0" value="${S.adultsSkipLunch}" />
      </div>

      <div>
        <label class="small">Bambini che non pranzano</label>
        <input id="kidsSkip" class="input" type="number" min="0" value="${S.kidsSkipLunch}" />
      </div>

      <div style="grid-column: 1 / -1">
        <label class="small">Regime alimentare</label>
        <select id="diet" class="input" style="max-width:320px">
          ${['onnivoro','vegetariano','vegano','pesce','senza lattosio','senza glutine']
            .map(v=>`<option ${S.diet===v?'selected':''}>${v}</option>`).join('')}
        </select>
      </div>
    </div>

    <div style="margin-top:16px; display:flex; gap:10px; align-items:center">
      <button id="save" class="btn">Salva e continua</button>
      <span id="msg" class="small"></span>
    </div>
  `;

  // Render dinamico delle età bambini
  const kidsBox = el.querySelector('#kidsAges');
  function renderKidsAges() {
    const n = Math.max(0, +el.querySelector('#kids').value || 0);
    const ages = (S.kidsAges || []).slice(0, n);
    while (ages.length < n) ages.push(6); // default 6 anni
    kidsBox.innerHTML = '';
    ages.forEach((age, i) => {
      const input = document.createElement('input');
      input.type = 'number';
      input.min = '0';
      input.className = 'input';
      input.style.width = '90px';
      input.value = age;
      input.placeholder = `Età #${i+1}`;
      input.addEventListener('change', () => {
        ages[i] = Math.max(0, +input.value || 0);
        S.kidsAges = ages;
      });
      kidsBox.appendChild(input);
    });
    S.kidsAges = ages;
  }
  el.querySelector('#kids').addEventListener('change', renderKidsAges);
  renderKidsAges();

  // Salva + genera piano ufficiale + vai al planner
  el.querySelector('#save').addEventListener('click', () => {
    const out = {
      shoppingDay: el.querySelector('#shoppingDay').value,
      budget: Math.max(0, +el.querySelector('#budget').value || 0),
      adults: Math.max(0, +el.querySelector('#adults').value || 0),
      kids: Math.max(0, +el.querySelector('#kids').value || 0),
      kidsAges: S.kidsAges || [],
      adultsSkipLunch: Math.max(0, +el.querySelector('#adultsSkip').value || 0),
      kidsSkipLunch: Math.max(0, +el.querySelector('#kidsSkip').value || 0),
      diet: el.querySelector('#diet').value || 'onnivoro'
    };
    save(out);

    // Generazione piano ufficiale (7 giorni, 1 pasto/giorno) e salvataggio
    const plan = generateOfficialWeeklyPlan();
    localStorage.setItem('app.plan', JSON.stringify(plan));

    el.querySelector('#msg').textContent = 'Impostazioni salvate e menu generato ✔';
    location.hash = '#/planner';
  });

  return el;
}
