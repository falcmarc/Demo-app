import { DEFAULT_PANTRY } from '../../data/pantry.js';

export default function Pantry() {
  const key = 'app.pantry';
  const get = () => JSON.parse(localStorage.getItem(key) || 'null') || DEFAULT_PANTRY;
  const set = v => localStorage.setItem(key, JSON.stringify(v));

  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `
    <h1>Dispensa</h1>
    <div style="display:grid; gap:10px; grid-template-columns: 1fr 100px 80px auto; max-width:720px">
      <input id="it" class="input" placeholder="Articolo (es. riso)"/>
      <input id="qt" class="input" type="number" min="0" placeholder="Quantità"/>
      <input id="un" class="input" placeholder="Unità (g/ml/pezzi)"/>
      <button id="add" class="btn">Aggiungi</button>
    </div>
    <ul id="list" class="list" style="margin-top:12px"></ul>
  `;

  const render = () => {
    const data = get();
    const ul = el.querySelector('#list');
    ul.innerHTML = data.map((r,i)=>`
      <li>
        <strong>${r.item}</strong> — ${r.qty} ${r.unit}
        <button class="btn secondary" data-i="${i}" style="float:right">Elimina</button>
      </li>
    `).join('');
    ul.querySelectorAll('button[data-i]').forEach(b=>{
      b.addEventListener('click', ()=>{
        const idx = +b.dataset.i;
        const rows = get(); rows.splice(idx,1); set(rows); render();
      });
    });
  };

  el.querySelector('#add').addEventListener('click', ()=>{
    const item = el.querySelector('#it').value.trim();
    const qty  = +el.querySelector('#qt').value || 0;
    const unit = el.querySelector('#un').value.trim() || 'g';
    if(!item || qty<=0) return;
    const rows = get();
    const found = rows.find(r=>r.item.toLowerCase()===item.toLowerCase() && r.unit===unit);
    if(found) found.qty += qty; else rows.push({item,qty,unit});
    set(rows); render();
    el.querySelector('#it').value=''; el.querySelector('#qt').value=''; el.querySelector('#un').value='';
  });

  render();
  return el;
}
