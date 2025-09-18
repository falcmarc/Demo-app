// src/lib/balancedMenu.js
// Generatore menu che rispetta: dieta, allergeni, limiti tempo, preferenze

import { preferenceScore, recipeHasAllergen } from './allergens.js';
import { dietPredicate } from './utils.js';

const MEALS = ['colazione','pranzo','merenda','cena'];

function getMaxMinutesForMeal(settings, mealKey){
  const m = settings?.maxPrep;
  if (!m) return Infinity;
  const def = Number.isFinite(+m.default) ? +m.default : Infinity;
  if (mealKey === 'pranzo' && m.lunchEnabled) {
    const L = Number.isFinite(+m.lunch) ? +m.lunch : def;
    return Math.min(def, L);
  }
  return def;
}

function fitsTime(r, mealKey, settings){
  const max = getMaxMinutesForMeal(settings, mealKey);
  const pm = Number.isFinite(+r.prepMinutes) ? +r.prepMinutes : 20;
  return pm <= max;
}

export function generateBalancedWeeklyMenu(recipes, settings, prevPlan) {
  const plan = prevPlan ? JSON.parse(JSON.stringify(prevPlan)) : null;
  const allowDiet = dietPredicate(settings);
  const allergens = settings?.allergens || [];
  const favFoods  = settings?.favFoods || [];

  // util per non ripetere troppo
  const used = new Set();
  const pick = (mealKey) => {
    // priorità: tag del pasto, no allergeni, tempo ok, dieta ok
    const pool = recipes
      .filter(allowDiet)
      .filter(r => (r.tags||[]).includes(mealKey))
      .filter(r => !recipeHasAllergen(r, allergens))
      .filter(r => fitsTime(r, mealKey, settings));

    // ordina per score preferenze (desc) poi per prepMinutes (asc)
    pool.sort((a,b)=>{
      const pa = preferenceScore(a, favFoods);
      const pb = preferenceScore(b, favFoods);
      if (pb !== pa) return pb - pa;
      const ta = Number.isFinite(+a.prepMinutes)?+a.prepMinutes:30;
      const tb = Number.isFinite(+b.prepMinutes)?+b.prepMinutes:30;
      return ta - tb;
    });

    // evita ripetizioni ravvicinate
    for (const r of pool) {
      if (!used.has(r.id)) {
        used.add(r.id);
        return r.id;
      }
    }
    // fallback: qualunque del pool
    return pool[0]?.id || null;
  };

  // crea nuovo piano
  const days = 7;
  const out = Array.from({length:days}, ()=> ({}));
  for (let d=0; d<days; d++){
    for (const m of MEALS){
      const wasExcluded = plan?.[d]?.[m]?.excluded;
      if (wasExcluded) {
        out[d][m] = { meal: plan[d][m].meal || null, excluded: true };
      } else {
        out[d][m] = { meal: pick(m), excluded: false };
      }
    }
  }
  return out;
}

export default { generateBalancedWeeklyMenu };
