export default function Home() {
  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `
    <h1>Home</h1>
    <p class="small">Modulo: <strong>home</strong></p>

    <div style="display:grid; gap:12px; grid-template-columns: 1fr auto;">
      <input id="itemText" class="input" placeholder="Aggiungi voce alla lista..." />
      <button id="btnAdd" class="btn">Aggiungi</button>
    </div>

    <ul id="list" class="list" style="margin-top:12px;"></ul>
  `;

  const key = 'demo.items';
  const listEl = el.querySelector('#list');
  const input = el.querySelector('#itemText');
  const btnAdd = el.querySelector('#btnAdd');

  const getItems = () => JSON.parse(localStorage.getItem(key) || '[]');
  const setItems = (arr) => localStorage.setItem(key, JSON.stringify(arr));

  const render = () => {
    const items = getItems();
    listEl.innerHTML = items.map((t, i) =>
      `<li>
        ${t}
        <button data-i="${i}" class="btn secondary" style="float:right">Elimina</button>
       </li>`
    ).join('') || '<li class="small">Nessun elemento, aggiungine uno sopra.</li>';

    listEl.querySelectorAll('button[data-i]').forEach(b => {
      b.addEventListener('click', () => {
        const idx = +b.getAttribute('data-i');
        const items = getItems();
        items.splice(idx, 1);
        setItems(items);
        render();
      });
    });
  };

  btnAdd.addEventListener('click', () => {
    const v = input.value.trim();
    if (!v) return;
    const items = getItems();
    items.unshift(v);
    setItems(items);
    input.value = '';
    render();
  });

  render();
  return el;
}