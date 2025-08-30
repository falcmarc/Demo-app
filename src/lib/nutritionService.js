// src/lib/nutritionService.js
//
// Calcolo macro/kcal da ingredienti con:
//  - mapping IT/EN (nutritionMap.json)
//  - conversione unità (g, ml, pz → g/ml) con pesi medi
//  - query ai provider: OpenFoodFacts -> USDA (fallback)
//  - output dettagliato: totale, per porzione, per-ingrediente (con pezzi+grammi)
//
// Dipendenze opzionali: src/config.js con { USDA_API_KEY?: string }

import CONFIG from '../config.js'; // può essere { USDA_API_KEY: '...' } o vuoto

const MAP_URL = '/Demo-app/public/nutrition/nutritionMap.json';   // ↙ adatta al tuo repo
// Se deploy in sottocartella diversa, valuta path relativo: './public/nutrition/nutritionMap.json'

/* ---------- Pesi medi per 'pz' (in grammi) ---------- */
const PIECE_WEIGHTS = {
  uovo: 60, uova: 60, "uovo medio": 60, "egg": 60, "eggs": 60,
  banana: 120, mela: 150, pera: 170, arancia: 180, limone: 100,
  carota: 60, cipolla: 80, patata: 170, zucchina: 150, pomodoro: 120,
  aglio: 5,
  // salumi/carni “a fetta” (stima)
  "fetta prosciutto": 25, "fetta pancetta": 25, "fetta guanciale": 25,
};

/* ---------- Densità per ml -> g (stima) ---------- */
const DENSITY = {
  "acqua": 1.0, "water": 1.0,
  "latte": 1.03, "milk": 1.03,
  "olio": 0.91, "olio extravergine": 0.91, "olive oil": 0.91,
  "miele": 1.42, "honey": 1.42,
  "yogurt": 1.05, "yogurt greco": 1.03
};

/* ---------- Cache in memoria ---------- */
const cache = new Map(); // key -> { ts, data }
const TTL_MS = 30 * 24*60*60*1000; // 30 giorni

/* ---------- Util ---------- */
const sleep = (ms)=> new Promise(r=>setTimeout(r, ms));
function now(){ return Date.now(); }
function fromCache(key){ const v=cache.get(key); return v && (now()-v.ts<TTL_MS) ? v.data : null; }
function toCache(key,data){ cache.set(key, { ts:now(), data }); }
function norm(s){ return (s||'').toLowerCase().trim(); }
function safeNum(x){ const n=+x; return Number.isFinite(n) ? n : 0; }

/* ---------- Carica mapping IT/EN ---------- */
let NAME_MAP = null;
async function loadNameMap(){
  if (NAME_MAP) return NAME_MAP;
  try {
    const res = await fetch(MAP_URL, { cache:'no-store' });
    if (!res.ok) throw new Error(res.status);
    NAME_MAP = await res.json();
  } catch (e) {
    console.warn('[nutrition] mapping non disponibile, proseguo senza', e);
    NAME_MAP = {};
  }
  return NAME_MAP;
}

/* ---------- Conversioni quantità ---------- */
function gramsFromMl(item, ml){
  // prova match densità per nome
  const n = norm(item);
  const key = Object.keys(DENSITY).find(k => n.includes(k));
  const dens = key ? DENSITY[key] : 1.0;
  return ml * dens;
}
function gramsFromPieces(item, pz){
  const n = norm(item);
  // match più specifico
  const key = Object.keys(PIECE_WEIGHTS).find(k => n.includes(k));
  const g = key ? PIECE_WEIGHTS[key] : 50; // default prudente
  return pz * g;
}

/**
 * Converte una riga ingrediente in grammi.
 * Ritorna anche un testo “originale → stimato”, es. “2 pz (≈120 g)”.
 */
function normalizeAmount(ing){
  const qty = safeNum(ing.qty);
  const unit = norm(ing.unit);
  const item = ing.item || '';

  if (unit === 'g' || unit === 'grammi' || unit === 'gr') {
    return { grams: qty, ml: 0, display: `${qty} g`, note: null };
  }
  if (unit === 'ml') {
    const g = gramsFromMl(item, qty);
    return { grams: g, ml: qty, display: `${qty} ml (≈${Math.round(g)} g)`, note: 'densità stimata' };
  }
  if (unit === 'pz' || unit === 'pezzi' || unit === 'pezzo') {
    const g = gramsFromPieces(item, qty);
    return { grams: g, ml: 0, display: `${qty} pz (≈${Math.round(g)} g)`, note: 'peso medio per pezzo' };
  }
  // fallback: trattalo come grammi
  return { grams: qty, ml: 0, display: `${qty} ${ing.unit||''}`.trim(), note: 'unità non riconosciuta (assumo grammi)' };
}

/* ---------- Mapping nome IT -> EN / canonical ---------- */
async function mapName(item){
  const map = await loadNameMap();
  const n = norm(item);
  // match esatto
  if (map[n]) return map[n];
  // prova match contains
  const key = Object.keys(map).find(k => n.includes(k));
  return map[key] || item; // se niente, usa l’originale
}

/* ---------- Provider: OFF ---------- */
async function providerOFF(search, grams){
  const key = `off:${search}`;
  const hit = fromCache(key);
  if (hit) return hit;

  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(search)}&search_simple=1&json=1&page_size=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('OFF HTTP ' + res.status);
  const js = await res.json();

  const p = js?.products?.[0];
  if (!p) throw new Error('OFF: nessun risultato');

  // valori per 100g
  const nutr = p['nutriments'] || {};
  const per100 = {
    kcal: safeNum(nutr['energy-kcal_100g'] ?? nutr['energy_100g'] ? nutr['energy_100g']/4.184 : 0),
    protein: safeNum(nutr['proteins_100g']),
    carbs: safeNum(nutr['carbohydrates_100g']),
    sugar: safeNum(nutr['sugars_100g']),
    fat: safeNum(nutr['fat_100g']),
    satFat: safeNum(nutr['saturated-fat_100g']),
    fiber: safeNum(nutr['fiber_100g']),
  };
  const factor = grams/100;
  const out = {
    kcal: per100.kcal*factor, protein: per100.protein*factor, carbs: per100.carbs*factor,
    sugar: per100.sugar*factor, fat: per100.fat*factor, satFat: per100.satFat*factor, fiber: per100.fiber*factor,
    _source: 'OFF', _per100: per100
  };
  toCache(key, out);
  return out;
}

/* ---------- Provider: USDA ---------- */
async function providerUSDA(search, grams){
  if (!CONFIG?.USDA_API_KEY) throw new Error('USDA: manca API key');
  const key = `usda:${search}`;
  const hit = fromCache(key);
  if (hit) return hit;

  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${CONFIG.USDA_API_KEY}&query=${encodeURIComponent(search)}&pageSize=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('USDA HTTP ' + res.status);
  const js = await res.json();
  const f = js?.foods?.[0];
  if (!f) throw new Error('USDA: nessun risultato');

  // nutrients array contiene value per 100g
  const getN = (name) => {
    const n = (f.foodNutrients || []).find(n => norm(n.nutrientName).includes(name));
    return safeNum(n?.value);
  };
  const per100 = {
    kcal: getN('energy') || getN('kcal'),
    protein: getN('protein'),
    carbs: getN('carbohydrate'),
    sugar: getN('sugar'),
    fat: getN('total lipid') || getN('fat'),
    satFat: getN('saturated'),
    fiber: getN('fiber')
  };
  const factor = grams/100;
  const out = {
    kcal: per100.kcal*factor, protein: per100.protein*factor, carbs: per100.carbs*factor,
    sugar: per100.sugar*factor, fat: per100.fat*factor, satFat: per100.satFat*factor, fiber: per100.fiber*factor,
    _source: 'USDA', _per100: per100
  };
  toCache(key, out);
  return out;
}

/* ---------- Macro per singolo ingrediente ---------- */
async function macrosForIngredient(ing){
  // 1) quantità → grammi
  const conv = normalizeAmount(ing);        // { grams, ml, display, note }
  const grams = conv.grams || 0;

  if (!grams) {
    return { ok:false, reason:'quantità non valida', conv, search:ing.item, source:null, macros:emptyMacros() };
  }

  // 2) mapping IT/EN
  const canonical = await mapName(ing.item);

  // 3) provider: OFF → (se KO) USDA
  let res = null, source=null, err=null;
  try {
    res = await providerOFF(canonical, grams);
    source = res._source;
  } catch(e1){
    try{
      // rallenta leggermente prima del fallback
      await sleep(150);
      res = await providerUSDA(canonical, grams);
      source = res._source;
    } catch(e2){
      err = `${e1?.message || e1} | ${e2?.message || e2}`;
    }
  }

  if (!res) {
    return { ok:false, reason:err||'nessun provider', conv, search:canonical, source:null, macros:emptyMacros() };
  }

  const out = {
    ok: true,
    conv,                  // info su conversione (mostra “2 pz (≈120 g)”)
    search: canonical,     // query usata
    source,
    macros: {
      kcal: res.kcal, protein: res.protein, carbs: res.carbs, sugar: res.sugar,
      fat: res.fat, satFat: res.satFat, fiber: res.fiber
    }
  };
  return out;
}

function emptyMacros(){
  return { kcal:0, protein:0, carbs:0, sugar:0, fat:0, satFat:0, fiber:0 };
}

/* ---------- API principale ---------- */
/**
 * ingredients: [{ qty, unit:'g|ml|pz', item }, ...]
 * servings: porzioni base della ricetta
 *
 * Ritorna:
 * {
 *   total: {...},
 *   perServing: {...},
 *   items: [
 *     { name, original:{qty,unit}, displayQty, grams, source, ok, macros:{...}, note? }
 *   ]
 * }
 */
export async function computeMacrosAsync(ingredients = [], servings = 2){
  const itemsOut = [];
  const agg = { kcal:0, protein:0, carbs:0, sugar:0, fat:0, satFat:0, fiber:0 };

  for (const ing of ingredients) {
    const r = await macrosForIngredient(ing);
    const grams = r.conv?.grams || 0;

    // somma se ok
    if (r.ok) {
      Object.keys(agg).forEach(k => { agg[k] += r.macros[k]; });
    }

    itemsOut.push({
      name: ing.item,
      original: { qty: ing.qty, unit: ing.unit },
      displayQty: r.conv?.display || '',
      grams,
      source: r.source,
      ok: r.ok,
      reason: r.ok ? null : r.reason,
      macros: r.macros,
      note: r.conv?.note || null
    });
  }

  const per = {};
  Object.keys(agg).forEach(k => per[k] = servings ? (agg[k] / servings) : 0);

  return { total: agg, perServing: per, items: itemsOut };
}

export default { computeMacrosAsync };
