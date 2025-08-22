// src/data/recipes.js
//
// Loader ricette per 4 file separati:
//   colazioni.json, pranzi.json, merende.json, cene.json
// Robusto per GitHub Pages: prova ./recipes/... e fallback ./public/recipes/...
// Espone:
//   - export let RECIPES = []
//   - export async function getRecipes()
//   - export async function loadRecipes()
//
// Metti i file qui nel repo:
//   public/recipes/colazioni.json
//   public/recipes/pranzi.json
//   public/recipes/merende.json
//   public/recipes/cene.json
//
// Con build tool: saranno serviti come /recipes/...;
// senza build (Pages “as-is”): /public/recipes/...

const FILES = ['colazioni.json', 'pranzi.json', 'merende.json', 'cene.json'];
const TRY_DIRS = ['./recipes/', './public/recipes/']; // ordine di tentativo

const LS_KEY_CACHE = 'app.recipes.cache.v2'; // bump per invalidare vecchie cache
const CACHE_MS = 6 * 60 * 60 * 1000; // 6 ore

export let RECIPES = []; // compatibilità moduli legacy

function uniqById(arr) {
  const seen = new Set();
  const out = [];
  for (const r of arr) {
    if (!r || !r.id) continue;
    if (!seen.has(r.id)) { seen.add(r.id); out.push(r); }
  }
  return out;
}

async function fetchFirst(paths) {
  for (const p of paths) {
    try {
      const res = await fetch(p, { cache: 'no-store' });
      if (res.ok) return await res.json();
    } catch (e) {
      // continua al prossimo
    }
  }
  // se nessun path ok, lancia errore con l’ultimo tentativo
  throw new Error(`Impossibile caricare: ${paths.join(' OR ')}`);
}

async function loadOne(fileName) {
  // prova entrambe le radici
  const candidates = TRY_DIRS.map(dir => dir + fileName);
  return fetchFirst(candidates);
}

function readCache() {
  try {
    const raw = localStorage.getItem(LS_KEY_CACHE);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || !obj.ts || !Array.isArray(obj.items)) return null;
    if (Date.now() - obj.ts > CACHE_MS) return null;
    return obj.items;
  } catch {
    return null;
  }
}

function writeCache(items) {
  try {
    localStorage.setItem(LS_KEY_CACHE, JSON.stringify({ ts: Date.now(), items }));
  } catch {
    // no-op
  }
}

export async function loadRecipes() {
  // cache localStorage valida?
  const cached = readCache();
  if (cached) {
    RECIPES = cached;
    return RECIPES;
  }

  // fetch dei 4 file (in serie per messaggi d’errore più chiari)
  let all = [];
  for (const fn of FILES) {
    try {
      const arr = await loadOne(fn);
      if (Array.isArray(arr)) {
        all = all.concat(arr);
      } else {
        console.warn('[recipes] formato inatteso in', fn);
      }
    } catch (e) {
      console.warn('[recipes] non trovato', fn, e?.message || e);
      // continuiamo: se manca un file, carichiamo comunque gli altri
    }
  }

  // deduplica e salva
  RECIPES = uniqById(all);
  writeCache(RECIPES);
  return RECIPES;
}

export async function getRecipes() {
  // usa la copia in memoria se già disponibile
  if (RECIPES && RECIPES.length) return RECIPES;
  return loadRecipes();
}

// tentativo non bloccante per scaldare la cache
loadRecipes().catch(() => {});
