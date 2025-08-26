// src/lib/nutrition.js
// Funzioni per calcolare macro/kcal totali e per porzione

import { lookupNutrition } from '../data/nutrition.js';

/** Converte qty alla base 100g/ml o usa pezzi -> grammi stimati */
function normalizeQty(qty, unit, name){
  const u = (unit||'g').toLowerCase();
  if (u === 'g' || u === 'ml') return { grams: qty, basis: 100 }; // riferiremo sempre a 100
  if (u === 'pz'){
    const rec = lookupNutrition(name);
    const grams = rec?.perPieceGrams ?? 50; // fallback 50g
    return { grams: qty * grams, basis: 100 };
  }
  // unità non note -> prova a trattare come grammi
  return { grams: qty, basis: 100 };
}

/** Somma macro totali sugli ingredienti (ritorna per ricetta e per porzione) */
export function computeMacros(ingredients=[], servingsBase=2){
  const total = { kcal:0, protein:0, carbs:0, sugar:0, fat:0, satFat:0, fiber:0, salt:0 };

  for (const ing of ingredients){
    const meta = lookupNutrition(ing.item);
    if (!meta || !ing.qty) continue;

    const { grams } = normalizeQty(+ing.qty || 0, ing.unit, ing.item);
    const factor = grams / 100; // per 100g

    total.kcal    += (meta.kcal    ?? 0) * factor;
    total.protein += (meta.protein ?? 0) * factor;
    total.carbs   += (meta.carbs   ?? 0) * factor;
    total.sugar   += (meta.sugar   ?? 0) * factor;
    total.fat     += (meta.fat     ?? 0) * factor;
    total.satFat  += (meta.satFat  ?? 0) * factor;
    total.fiber   += (meta.fiber   ?? 0) * factor;
    total.salt    += (meta.salt    ?? 0) * factor;
  }

  // arrotonda
  Object.keys(total).forEach(k => total[k] = Math.round(total[k]));

  const perServing = {};
  const s = Math.max(1, +servingsBase || 1);
  Object.keys(total).forEach(k => perServing[k] = Math.round(total[k] / s));

  return { total, perServing };
}

/** Estrae solo i macro "torta": proteine, carbo (zuccheri separati), grassi */
export function pieFromMacros(obj){
  // carboidrati totali: possiamo evidenziare la quota zuccheri
  const protein = obj.protein || 0;
  const sugar   = obj.sugar || 0;
  const carbs   = Math.max(0, (obj.carbs||0)); // includono gli zuccheri
  const starch  = Math.max(0, carbs - sugar);  // carbo non zuccheri
  const fat     = obj.fat || 0;

  return [
    { key:'Proteine', value: protein },
    { key:'Zuccheri', value: sugar },
    { key:'Carbo (starch)', value: starch },
    { key:'Grassi', value: fat },
  ];
}
