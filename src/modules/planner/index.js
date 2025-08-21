import { RECIPES } from '../../data/recipes.js';
import { loadSettings, equivalents, dietPredicate } from '../../lib/utils.js';

const days = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];

export default function Planner() {
  const key = 'app.plan';
  const set = v => localStorage.setItem(key, JSON.stringify(v));
  const get = () => JSON.parse(localStorage.getItem(key) || 'null') || days.map(()=>({meal:null, servings:2}));

  const settings = loadSettings();
  const eq = Math.max(1, Math.round(equivalents(settings)));
  const allowed = RECIPES.filter(dietPredicate(settings));

  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `
    <h1>Planner settimanale</h1>
    <div class="small" style="margin-bottom:8px">
      Dieta: <strong>${settings.diet}</strong> · Persone eq: <strong>${eq}</strong> · Giorno spesa: <strong>${settings.shoppingDay}</strong>
    </div>
    <div id="grid" style="display:grid; gap:10px; grid-template-columns: 100px 1fr 100px"></div>
  `;

  const grid = el.querySelector('#grid');

  const render = () => {
    const plan = get();
    grid.innerHTML = '';
    days.forEach((d, idx) => {
      const day = document.createElement('div'); day.textContent=d; day.className='small'; day.style.padding='10px 0';
      const sel = document.createElement('select'); sel.className='input';
      sel.innerHTML = `<option value="">— scegli ricetta —</option>` + allowed.map(r=>`<option value="${r.id}">${r.name}</option>`).join('');
      sel.value = plan[idx].meal || '';
      const serv = document.createElement('input'); serv.type='number'; serv.min='1'; serv.className='input';
      serv.value = plan[idx].servings ? plan[idx].servings : eq;

      sel.addEventListener('change', ()=>{ const p=get(); p[idx].meal=sel.value||null; set(p); });
      serv.addEventListener('change', ()=>{ const p=get(); p[idx].servings=Math.max(1,+serv.value||eq); set(p); });

      grid.append(day, sel, serv);
    });
  };

  render();
  return el;
}
