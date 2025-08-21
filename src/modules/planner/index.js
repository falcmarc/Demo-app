import { RECIPES } from '../../data/recipes.js';
import { loadSettings, equivalents, dietPredicate } from '../../lib/utils.js';

const days = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];

export default function Planner() {
  const key = 'app.plan';
  const set = v => localStorage.setItem(key, JSON.stringify(v));
  const get = () => JSON.parse(localStorage.getItem(key) || 'null') || days.map(()=>({meal:null, servings:2}));

  const s  = loadSettings();
  const eq = Math.max(1, Math.round(equivalents(s)));
  const allowDiet = dietPredicate(s);

  // ricava tutti i tag noti
  const allTags = [...new Set(RECIPES.flatMap(r => r.tags || []))].sort();

  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `
    <h1>Planner settimanale</h1>
    <div class="small" style="margin-bottom:8px">
      Dieta: <strong>${s.diet}</strong> · Persone eq: <strong>${eq}</strong> · Giorno spesa: <strong>${s.shoppingDay}</strong>
    </div>

    <div style="display:grid; gap:10px; grid-template-columns: 1fr auto; align-items:center; margin-bottom:8px">
      <input id="q" class="input" placeholder="Cerca ricetta (nome o ingrediente)..." />
      <div id="tags" style="display:flex; gap:6px; flex-wrap:wrap"></div>
    </div>

    <div id="grid" style="display:grid; gap:10px; grid-template-columns: 100px 1fr 100px"></div>
  `;

  // render chip tag
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

  function filterRecipes() {
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

  const render = () => {
    const plan = get();
    const allowed = filterRecipes();

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

  qInp.addEventListener('input', () => render());
  render();
  return el;
}
