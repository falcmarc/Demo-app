import { generateOfficialWeeklyPlan } from "../../lib/menu.js";  // ⬅️ aggiungi import in cima al file

// ... dentro al tuo addEventListener #save, sostituisci il contenuto:
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
  localStorage.setItem('app.settings', JSON.stringify(out));

  // ► Generazione ufficiale del piano settimanale
  const plan = generateOfficialWeeklyPlan();
  localStorage.setItem('app.plan', JSON.stringify(plan));

  el.querySelector('#msg').textContent = 'Impostazioni salvate e menu generato ✔';
  location.hash = '#/planner';
});
