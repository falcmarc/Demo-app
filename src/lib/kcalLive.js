// src/lib/kcalLive.js
// kcal/macros live: compute on-demand dai provider con cache per ricetta

import { computeMacrosAsync } from './nutritionService.js';

const CACHE_KEY = 'kcal.live.cache.v1';
const DEFAULT_TTL_DAYS = 30;

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); }
  catch { return {}; }
}
function writeCache(obj) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(obj)); } catch {}
}
function isFresh(ts, ttlDays = DEFAULT_TTL_DAYS) {
  return (Date.now() - ts) < ttlDays*24*60*60*1000;
}

// firma stabile basata su ingredienti & porzioni base
function signature(recipe) {
  const serv = Math.max(1, +recipe.servings || 2);
  const items = (recipe.ingredients || []).map(i => ({
    qty: +i.qty || 0,
    unit: (i.unit || '').toLowerCase().trim(),
    item: (i.item || '').toLowerCase().trim()
  }));
  // ordina per nome così la firma non dipende dall’ordine
  items.sort((a,b)=> a.item.localeCompare(b.item) || a.unit.localeCompare(b.unit));
  return JSON.stringify({ serv, items });
}

/**
 * Ritorna { total, perServing } SEMPRE calcolati dai provider
 * con cache per ricetta-id e firma ingredienti.
 * Se la ricetta non ha id, usa una firma “anonima” come chiave.
 */
export async function getPerServingMacros(recipe, { ttlDays = DEFAULT_TTL_DAYS } = {}) {
  const keyId = recipe?.id || 'anon';
  const sig = signature(recipe);
  const cache = readCache();
  const hit = cache[keyId];

  if (hit && hit.sig === sig && isFresh(hit.ts, ttlDays)) {
    return hit.macros; // { total, perServing }
  }

  const serv = Math.max(1, +recipe.servings || 2);
  const macros = await computeMacrosAsync(recipe.ingredients || [], serv);

  cache[keyId] = { ts: Date.now(), sig, macros };
  writeCache(cache);

  return macros;
}

/**
 * Prefetch in coda (throttled) per un array di ricette,
 * utile per aggiornare la cache “in background”.
 */
export async function prefetchMacros(recipes = [], { delayMs = 400, ttlDays = DEFAULT_TTL_DAYS } = {}) {
  for (const r of recipes) {
    try { await getPerServingMacros(r, { ttlDays }); }
    catch { /* ignora errori singoli */ }
    await new Promise(res => setTimeout(res, delayMs));
  }
}

/** Invalida cache di una ricetta (dopo edit) */
export function invalidateRecipeMacros(recipeId) {
  const cache = readCache();
  if (cache[recipeId]) { delete cache[recipeId]; writeCache(cache); }
}