// src/lib/nutritionService.js
//
// Miglioramenti:
// - mapping preferito per pollo/petto (stima più realistica)
// - kcal arrotondate a 0 decimali in output (viste)
// - macro per-ingrediente con display quantità (pz→g, ml→g)

import CONFIG from '../config.js'; // può essere {} se non usi USDA

const MAP_URL = './public/nutrition/nutritionMap.json';

const PIECE_WEIGHTS = {
  uovo: 60, uova: 60, "uovo medio": 60, egg: 60, eggs: 60,
  banana: 120, mela: 150, pera: 170, arancia: 180, limone: 100,
  carota: 60, cipolla: 80, patata: 170, zucchina: 150, pomodoro: 120,
  aglio: 5, "fetta prosciutto": 25, "fetta pancetta": 25, "fetta guanciale": 25,
};

const DENSITY = {
  acqua: 1.0, water: 1.0,
  latte: 1.03, milk: 1.03,
  olio: 0.91, "olio extravergine": 0.91, "olive oil": 0.91,
  miele: 1.42, honey: 1.42,
  yogurt: 1.05, "yogurt greco": 1.03
};

const cache = new Map();
const TTL_MS = 30*24*60*60*1000;

const sleep = (ms)=> new Promise(r=>setTimeout(r, ms));
const now = ()=> Date.now();
const fromCache = k => { const v=cache.get(k); return v && (now()-v.ts<TTL_MS) ? v.data : null; };
const toCache   = (k,d)=> cache.set(k,{ts:now(),data:d});
const norm = s => (s||'').toLowerCase().trim();
const safeNum = x => { const n=+x; return Number.isFinite(n) ? n : 0; };

let NAME_MAP = null;
async function loadNameMap(){
  if (NAME_MAP) return NAME_MAP;
  try {
    const res = await fetch(MAP_URL, { cache:'no-store' });
    if (!res.ok) throw new Error(res.status);
    NAME_MAP = await res.json();
  } catch (e) {
    console.warn('[nutrition] mapping non disponibile', e);
    NAME_MAP = {};
  }
  return NAME_MAP;
}

// Preferenze "forti" per alcune chiavi (bypassano il mapping generico)
const PREFERRED_MAP = {
  'pollo': 'chicken, raw',
  'petto di pollo': 'chicken breast, raw',
  'petto pollo': 'chicken breast, raw',
  'coscia di pollo': 'chicken, dark meat, raw',
  'cosce di pollo': 'chicken, dark meat, raw',
};

function gramsFromMl(item, ml){
  const n = norm(item);
  const key = Object.keys(DENSITY).find(k => n.includes(k));
  const dens = key ? DENSITY[key] : 1.0;
  return ml * dens;
}
function gramsFromPieces(item, pz){
  const n = norm(item);
  const key = Object.keys(PIECE_WEIGHTS).find(k => n.includes(k));
  const g = key ? PIECE_WEIGHTS[key] : 50;
  return pz * g;
}
function normalizeAmount(ing){
  const qty = safeNum(ing.qty);
  const unit = norm(ing.unit);
  const item = ing.item || '';
  if (unit === 'g' || unit === 'grammi' || unit === 'gr') return { grams: qty, ml: 0, display: `${qty} g`, note: null };
  if (unit === 'ml') { const g = gramsFromMl(item, qty); return { grams:g, ml:qty, display:`${qty} ml (≈${Math.round(g)} g)`, note:'densità stimata' }; }
  if (unit === 'pz' || unit === 'pezzi' || unit === 'pezzo') { const g = gramsFromPieces(item, qty); return { grams:g, ml:0, display:`${qty} pz (≈${Math.round(g)} g)`, note:'peso medio' }; }
  return { grams: qty, ml: 0, display: `${qty} ${ing.unit||''}`.trim(), note:'unità non riconosciuta (assumo g)' };
}

async function mapName(item){
  const n = norm(item);
  // preferenze forti
  for (const k of Object.keys(PREFERRED_MAP)) if (n.includes(k)) return PREFERRED_MAP[k];
  const map = await loadNameMap();
  if (map[n]) return map[n];
  const key = Object.keys(map).find(k => n.includes(k));
  return map[key] || item;
}

/* -------- Providers -------- */

async function providerOFF(search, grams){
  const key = `off:${search}`;
  const hit = fromCache(key); if (hit) return hit;
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(search)}&search_simple=1&json=1&page_size=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('OFF HTTP ' + res.status);
  const js = await res.json();
  const p = js?.products?.[0];
  if (!p) throw new Error('OFF: no result');
  const nutr = p['nutriments'] || {};
  const per100 = {
    kcal: safeNum(nutr['energy-kcal_100g'] ?? (nutr['energy_100g'] ? nutr['energy_100g']/4.184 : 0)),
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

async function providerUSDA(search, grams){
  if (!CONFIG?.USDA_API_KEY) throw new Error('USDA: missing key');
  const key = `usda:${search}`;
  const hit = fromCache(key); if (hit) return hit;
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${CONFIG.USDA_API_KEY}&query=${encodeURIComponent(search)}&pageSize=5`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('USDA HTTP ' + res.status);
  const js = await res.json();
  let f = (js?.foods || [])[0];
  // se cerco petto di pollo preferisco "breast" e "raw"
  const q = norm(search);
  if (js?.foods?.length) {
    const candidates = js.foods;
    const pref = candidates.find(x => /breast/i.test(x.description) && /raw/i.test(x.description)) ||
                 candidates.find(x => /chicken/i.test(x.description) && /raw/i.test(x.description)) ||
                 candidates[0];
    f = pref;
  }
  if (!f) throw new Error('USDA: no result');
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
    fiber: getN('fiber'),
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

/* -------- per-ingrediente -------- */

async function macrosForIngredient(ing){
  const conv = normalizeAmount(ing);
  const grams = conv.grams || 0;
  if (!grams) {
    return { ok:false, reason:'quantità non valida', conv, search:ing.item, source:null, macros:emptyMacros() };
  }
  const canonical = await mapName(ing.item);
  let res=null, err=null;
  try {
    res = await providerOFF(canonical, grams);
  } catch(e1){
    try{ await sleep(120); res = await providerUSDA(canonical, grams); }
    catch(e2){ err = `${e1?.message||e1} | ${e2?.message||e2}`; }
  }
  if (!res) return { ok:false, reason:err||'nessun provider', conv, search:canonical, source:null, macros:emptyMacros() };
  const out = {
    ok: true,
    conv,
    search: canonical,
    source: res._source,
    macros: {
      kcal: res.kcal, protein: res.protein, carbs: res.carbs, sugar: res.sugar,
      fat: res.fat, satFat: res.satFat, fiber: res.fiber
    }
  };
  return out;
}

function emptyMacros(){ return { kcal:0, protein:0, carbs:0, sugar:0, fat:0, satFat:0, fiber:0 }; }

/* -------- API -------- */

/**
 * ingredients: [{ qty, unit:'g|ml|pz', item }, ...]
 * servings: porzioni base
 */
export async function computeMacrosAsync(ingredients = [], servings = 2){
  const itemsOut = [];
  const agg = { kcal:0, protein:0, carbs:0, sugar:0, fat:0, satFat:0, fiber:0 };

  for (const ing of ingredients) {
    const r = await macrosForIngredient(ing);
    const grams = r.conv?.grams || 0;
    if (r.ok) Object.keys(agg).forEach(k => { agg[k] += r.macros[k]; });

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

  // arrotondamenti in output
  const total = {
    kcal: Math.round(agg.kcal),
    protein: Math.round(agg.protein*10)/10,
    carbs: Math.round(agg.carbs*10)/10,
    sugar: Math.round(agg.sugar*10)/10,
    fat: Math.round(agg.fat*10)/10,
    satFat: Math.round(agg.satFat*10)/10,
    fiber: Math.round(agg.fiber*10)/10,
  };
  const perServing = {};
  Object.keys(total).forEach(k => {
    const v = servings ? total[k] / servings : 0;
    perServing[k] = (k==='kcal') ? Math.round(v) : Math.round(v*10)/10;
  });

  return { total, perServing, items: itemsOut };
}

export default { computeMacrosAsync };
