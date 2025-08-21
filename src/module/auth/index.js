export default function Auth() {
  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `
    <h1>Login (fake)</h1>
    <p class="small">Modulo: <strong>auth</strong> — demo locale senza backend</p>

    <div style="display:grid; gap:12px;">
      <input id="email" class="input" type="email" placeholder="Email" />
      <input id="pwd" class="input" type="password" placeholder="Password" />
      <button id="login" class="btn">Accedi</button>
      <span id="msg" class="small"></span>
    </div>
  `;

  const email = el.querySelector('#email');
  const pwd = el.querySelector('#pwd');
  const btn = el.querySelector('#login');
  const msg = el.querySelector('#msg');

  btn.addEventListener('click', () => {
    const ok = !!email.value && !!pwd.value;
    if (ok) {
      localStorage.setItem('demo.token', 'token-' + Date.now());
      msg.textContent = 'Login riuscito ✔ (token salvato in localStorage)';
    } else {
      msg.textContent = 'Inserisci email e password';
    }
  });

  return el;
}