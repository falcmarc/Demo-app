function openRecipeMini(rec, mealKey){
  const { adults, kids } = countsForMeal(settings, mealKey);
  const servings = eqServings(adults, kids, settings.kidsAges);
  const factor   = (servings || 1) / (rec.servings || 2);
  const kcalPer  = rec.kcalPerServing || null;
  const kcalTot  = kcalPer ? Math.round(kcalPer * servings) : null;

  const ingHTML = (rec.ingredients||[]).map(ing=>{
    const qty = (ing.qty||0)*factor;
    const show = Number.isInteger(qty) ? qty : Math.round(qty);
    return `<li><strong>${ing.item}</strong> — ${show} ${ing.unit||''}</li>`;
  }).join('');

  const favSet = new Set(getFavorites());
  const ratings = getRatings();
  const myRate  = ratings[rec.id] || 0;

  ensureOverlay(`
    <div style="display:flex; justify-content:space-between; align-items:center; gap:8px">
      <h2 style="margin:0">${rec.name}</h2>
      <button id="miniClose" class="btn secondary">Chiudi</button>
    </div>

    <div class="small" style="margin:8px 0">
      Porzioni eq: <strong>${servings.toFixed(1)}</strong>
      · Kcal/porzione: <strong>${kcalPer ?? 'n.d.'}</strong>
      · Kcal totali: <strong>${kcalTot ?? 'n.d.'}</strong>
    </div>

    <div style="display:flex; gap:10px; align-items:center; margin:8px 0">
      <button id="favBtn" class="fav-btn ${favSet.has(rec.id)?'active':''}">⭐ Preferito</button>
      <div class="stars" id="stars">${[1,2,3,4,5].map(i=>`<span class="star ${i<=myRate?'active':''}" data-v="${i}">★</span>`).join('')}</div>
      <span class="small" id="rateLabel">${myRate? myRate+'/5' : 'Non valutata'}</span>
    </div>

    <h3 style="margin:10px 0 6px">Ingredienti</h3>
    <ul class="list" style="margin-bottom:10px">${ingHTML || '<li class="small">Nessun ingrediente</li>'}</ul>

    ${Array.isArray(rec.steps)&&rec.steps.length ? `
      <h3 style="margin:10px 0 6px">Procedimento</h3>
      <ol class="list">${rec.steps.map(s=>`<li>${s}</li>`).join('')}</ol>` : ''
    }
  `);

  document.getElementById('miniClose')?.addEventListener('click', closeOverlay);

  const favBtn = document.getElementById('favBtn');
  favBtn?.addEventListener('click', ()=>{
    const after = new Set(toggleFavorite(rec.id));
    if (after.has(rec.id)) favBtn.classList.add('active'); else favBtn.classList.remove('active');
  });

  const starsEl = document.getElementById('stars');
  starsEl?.addEventListener('click', (e)=>{
    const v = +e.target?.dataset?.v || 0;
    if (!v) return;
    setRating(rec.id, v);
    // refresh stelle
    Array.from(starsEl.querySelectorAll('.star')).forEach((s,idx)=>{
      s.classList.toggle('active', idx < v);
    });
    const lab = document.getElementById('rateLabel');
    if (lab) lab.textContent = v+'/5';
  });
}