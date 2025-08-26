// src/data/nutrition/providers/usda.js
// USDA FoodData Central - richiede API key

import { CONFIG } from "../../../config.js";

const USDA_SEARCH = "https://api.nal.usda.gov/fdc/v1/foods/search";

// mappa nutrienti -> FDC nutrientNumber
const MAP = {
  kcal:   208, // Energy (kcal)
  protein:203,
  fat:    204,
  carbs:  205,
  sugar:  269,
  fiber:  291,
  sodium: 307, // mg -> convertire a sale
};

function extractNutrient(foodNutrients, num){
  const row = (foodNutrients||[]).find(n=> n.nutrientNumber == num || n.nutrient?.number == num);
  return row?.value ?? null;
}

export async function usdaLookup(name){
  if (!CONFIG.USDA_API_KEY) return null; // senza chiave saltiamo
  const q = name?.trim();
  if (!q) return null;

  const url = `${USDA_SEARCH}?api_key=${encodeURIComponent(CONFIG.USDA_API_KEY)}&query=${encodeURIComponent(q)}&pageSize=5`;
  const res = await fetch(url, { cache:"no-store" });
  if (!res.ok) throw new Error(`USDA ${res.status}`);
  const data = await res.json();
  const foods = data?.foods || [];
  if (!foods.length) return null;

  // scegli il primo “branded” o “survey” che abbia più nutrienti
  const score = (f)=>{
    const fn = f.foodNutrients || [];
    let s = 0;
    if (extractNutrient(fn, MAP.kcal)   != null) s += 3;
    if (extractNutrient(fn, MAP.protein)!= null) s += 1;
    if (extractNutrient(fn, MAP.carbs)  != null) s += 1;
    if (extractNutrient(fn, MAP.fat)    != null) s += 1;
    if (extractNutrient(fn, MAP.sugar)  != null) s += 1;
    return s;
  };
  const best = foods.sort((a,b)=> score(b)-score(a))[0];
  if (!best) return null;

  const fn = best.foodNutrients || [];
  const sodiumMg = extractNutrient(fn, MAP.sodium) || 0;
  const salt = sodiumMg ? (sodiumMg/1000)*2.5 : 0; // mg -> g -> sale

  return {
    source: "USDA",
    name: best.description || q,
    unit: "g",
    per100: {
      kcal:   Math.round(extractNutrient(fn, MAP.kcal)   ?? 0),
      protein:Math.round(extractNutrient(fn, MAP.protein)?? 0),
      carbs:  Math.round(extractNutrient(fn, MAP.carbs)  ?? 0),
      sugar:  Math.round(extractNutrient(fn, MAP.sugar)  ?? 0),
      fat:    Math.round(extractNutrient(fn, MAP.fat)    ?? 0),
      satFat: null, // USDA search non sempre include saturated fat; si può arricchire con foods/{fdcId}
      fiber:  Math.round(extractNutrient(fn, MAP.fiber)  ?? 0),
      salt:   Math.round(salt*100)/100,
    },
  };
}
