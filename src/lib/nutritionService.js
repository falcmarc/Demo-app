// src/lib/nutritionService.js
// Orchestratore: cache -> OFF -> USDA, con timeout e normalizzazione

import { CONFIG } from "../config.js";
import { offLookup } from "../data/nutrition/providers/openfoodfacts.js";
import { usdaLookup } from "../data/nutrition/providers/usda.js";

const CACHE_KEY = "nutrition.cache.v1";

function readCache(){
  try{ return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}") } catch{ return {} }
}
function writeCache(obj){
  try{ localStorage.setItem(CACHE_KEY, JSON.stringify(obj)) }catch{}
}
function isFresh(ts){
  const days = CONFIG.NUTRITION_CACHE_DAYS || 30;
  const ms = days * 24*60*60*1000;
  return (Date.now() - ts) < ms;
}

function normKey(name){
  return (name||"").toLowerCase().trim().replace(/\s+/g," ");
}

async function withTimeout(promise, ms=6000){
  const ctrl = new AbortController();
  const t = setTimeout(()=> ctrl.abort("timeout"), ms);
  try {
    const res = await promise(ctrl.signal);
    clearTimeout(t);
    return res;
  } catch(e){
    clearTimeout(t);
    throw e;
  }
}

// provider wrappers per uniformare la signature (supportano AbortController)
async function tryOFF(name, _signal){
  return await offLookup(name); // OFF non supporta abort nativo nel nostro wrapper, ma ok
}
async function tryUSDA(name, _signal){
  return await usdaLookup(name);
}

/** Lookup macro per 100g/ml (o g equivalenti) con fallback.
 *  Ritorna: { source, name, unit:'g', per100:{kcal,protein,carbs,sugar,fat,satFat,fiber,salt} }
 */
export async function lookupNutritionUnified(name){
  const key = normKey(name);
  if (!key) return null;

  // cache
  const cache = readCache();
  const hit = cache[key];
  if (hit && isFresh(hit.ts)) return hit.data;

  // OFF first
  try {
    const data = await withTimeout(async ()=> await tryOFF(key), 6000);
    if (data?.per100){
      cache[key] = { ts: Date.now(), data };
      writeCache(cache);
      return data;
    }
  } catch(e){ /* silenzio, proviamo USDA */ }

  // USDA fallback
  try {
    const data = await withTimeout(async ()=> await tryUSDA(key), 6000);
    if (data?.per100){
      cache[key] = { ts: Date.now(), data };
      writeCache(cache);
      return data;
    }
  } catch(e){ /* niente */ }

  // nulla trovato
  return null;
}

/** Calcola macro totali e per porzione usando i provider remoti.
 *  ingredients: [{ qty, unit:'g'|'ml'|'pz', item }]
 *  servingsBase: numero porzioni della ricetta
 */
export async function computeMacrosAsync(ingredients=[], servingsBase=2){
  const total = { kcal:0, protein:0, carbs:0, sugar:0, fat:0, satFat:0, fiber:0, salt:0 };

  for (const ing of ingredients){
    if (!ing?.item || !ing?.qty) continue;
    const meta = await lookupNutritionUnified(ing.item);
    if (!meta?.per100) continue;

    // qty normalizzata a grammi (pz ~ 50g se non sappiamo il peso medio)
    const u = (ing.unit||"g").toLowerCase();
    let grams = +ing.qty || 0;
    if (u === "pz") grams = grams * 50; // TODO: mappare peso medio per item
    // 'ml' lo trattiamo come g (densità ~ acqua) per una stima semplice

    const factor = grams / 100;
    Object.keys(total).forEach(k => {
      total[k] += Math.round((meta.per100[k] ?? 0) * factor);
    });
  }

  const perServing = {};
  const s = Math.max(1, +servingsBase || 1);
  Object.keys(total).forEach(k => perServing[k] = Math.round(total[k] / s));

  return { total, perServing };
}
