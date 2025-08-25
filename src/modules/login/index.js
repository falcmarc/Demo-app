// src/modules/login/index.js
import { getUser, getUserCached, onAuthChange, signInWithEmail, signOut } from '../../lib/auth.js';

export default function Login(){
  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `
    <h1>Accedi</h1>
    <p class="small">Usa l'e-mail per ricevere un <strong>link magico</strong> di accesso.</p>

    <div id="logged" style="display:none; margin-top:10px">
      <div class="small">Sei autenticato come:</div>
      <div id="who" style="margin:6px 0 12px"></div>
      <button id="logout" class="btn secondary">Esci</button>
    </div>

    <div id="form" style="display:none; margin-top:8px">
      <label class="small">Email</label>
      <input id="email" class="input" type="email" placeholder="tuo@email.it" style="width:280px; max-width:100%">
      <div style="display:flex; gap:8px; margin-top:10px">
        <button id="send" class="btn">Inviami il link</button>
      </div>
      <div id="msg" class="small" style="margin-top:10px"></div>
    </div>
  `;

  const $form   = el.querySelector('#form');
  const $logged = el.querySelector('#logged');
  const $who    = el.querySelector('#who');
  const $msg    = el.querySelector('#msg');

  function render(user){
    if (user) {
      $who.textContent = user.email || user.id;
      $logged.style.display = '';
      $form.style.display = 'none';
    } else {
      $logged.style.display = 'none';
      $form.style.display = '';
    }
  }

  // stato iniziale: cached o fetch
  render(getUserCached());
  getUser().then(u => render(u));

  // cambia su eventi auth
  onAuthChange((u) => render(u));

  el.querySelector('#send').addEventListener('click', async ()=>{
    const email = el.querySelector('#email').value.trim();
    if (!email) { $msg.textContent = 'Inserisci un\'email valida.'; return; }
    $msg.textContent = 'Invio in corso…';
    try {
      await signInWithEmail(email);
      $msg.textContent = 'Controlla la tua email e clicca il link per accedere.';
    } catch (e) {
      $msg.textContent = 'Errore: ' + (e?.message || e);
    }
  });

  el.querySelector('#logout').addEventListener('click', async ()=>{
    await signOut();
    render(null);
  });

  return el;
}