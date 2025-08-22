// src/lib/menu.js
import { RECIPES, getRecipes } from '../data/recipes.js';
import { dietPredicate } from './utils.js';

const DAYS = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];

function pickSeven(recipes, allow){
  const pool = (recipes || []).filter(allow);
  const out = [];
  for (let i=0;i<7;i++){
    if (!pool.length) { out.push(null); continue; }
    out.push(pool[Math.floor(Math.random()*pool.length)]);
  }
  return out;
}

// SINCRONA: usa RECIPES (cache) se presente, altrimenti fallback neutro
export function generateOfficialWeeklyPlan(settings = {}){
  const allow = dietPredicate(settings || {});
  const dinners = (RECIPES && RECIPES.length)
    ? RECIPES.filter(r => (r.tags||[]).includes('cena'))
    : []; // se vuoto, gestiamo sotto

  const chosen = pickSeven(dinners.length ? dinners : RECIPES, allow);

  return DAYS.map((_, i) => ({
    meal: chosen[i]?.id || null,
    servings: Math.max(1, (settings.adults || 0) + (settings.kids || 0)) // approssimazione
  }));
}

// ASINCRONA: garantisce dati dal loader
export async function generateOfficialWeeklyPlanAsync(settings = {}){
  const recipes = await getRecipes();
  const allow = dietPredicate(settings || {});
  const dinners = recipes.filter(r => (r.tags||[]).includes('cena'));
  const chosen = pickSeven(dinners.length ? dinners : recipes, allow);

  return DAYS.map((_, i) => ({
    meal: chosen[i]?.id || null,
    servings: Math.max(1, (settings.adults || 0) + (settings.kids || 0))
  }));
}
