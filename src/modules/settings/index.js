export default function Settings() {
  const key = 'app.settings';
  const get = () => JSON.parse(localStorage.getItem(key) || '{"adults":2,"kids":0,"budget":100}');
  const set = v => localStorage.setItem(key, JSON.stringify(v));
  const s = get();

  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `
    <h1>Impostazioni</h1>
    <div style="display:grid; gap:12px; grid-template-columns: repeat(3,1fr); max-width:520px">
      <div><label>Adulti</label><input id="ad" class="input" type="number" min="0" value="${s.adults}"/></div>
      <div><label>Bambini</label><input id="kd" class="input" type="number" min="0" value="${s.kids}"/></div>
      <div><label>Budget (€)</label><input id="bg" class="input" type="number" min="0" value="${s.budget}"/></div>
    </div>
    <div style="margin-top:12px">
      <button id="save" class="btn">Salva</button>
      <span id="msg" class="small"></span>
    </div>
  `;
  el.querySelector('#save').addEventListener('click', () => {
    set({
      adults: +el.querySelector('#ad').value || 0,
      kids: +el.querySelector('#kd').value || 0,
      budget: +el.querySelector('#bg').value || 0,
    });
    el.querySelector('#msg').textContent = 'Impostazioni salvate ✔';
  });
  return el;
}