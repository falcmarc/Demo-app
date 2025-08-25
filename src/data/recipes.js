// src/data/recipes.js
// Carica 4 liste JSON (colazioni, pranzi, merende, cene) da /public/recipes o /recipes
const FILES = ['colazioni.json','pranzi.json','merende.json','cene.json'];
const LS_KEY = 'app.recipes.cache.v5';
const CACHE_MS = 6 * 60 * 60 * 1000; // 6 ore

export let RECIPES = [];

function repoBase() {
  try {
    const p = window.location.pathname || '/';
    const parts = p.split('/').filter(Boolean);
    return parts.length ? `/${parts[0]}/` : '/';
  } catch { return '/'; }
}

async function fetchFirst(urls) {
  for (const u of urls) {
    try {
      const res = await fetch(u, { cache: 'no-store' });
      if (res.ok) return res.json();
      // console.debug('[recipes]', res.status, u);
    } catch {/* next */}
  }
  throw new Error('Nessun URL valido tra: ' + urls.join(' | '));
}

async function loadOne(fileName) {
  const base = repoBase(); // es. /Demo-app/
  const candidates = [
    `./public/recipes/${fileName}`,
    `public/recipes/${fileName}`,
    `${base}public/recipes/${fileName}`,
    `./recipes/${fileName}`,
    `recipes/${fileName}`,
    `${base}recipes/${fileName}`,
  ];
  return fetchFirst(candidates);
}

function readCache() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj?.ts || !Array.isArray(obj.items)) return null;
    if (Date.now() - obj.ts > CACHE_MS) return null;
    return obj.items;
  } catch { return null; }
}
function writeCache(items) {
  try { localStorage.setItem(LS_KEY, JSON.stringify({ ts: Date.now(), items })); } catch {}
}

export async function loadRecipes() {
  const cached = readCache();
  if (cached) { RECIPES = cached; return RECIPES; }

  let all = [];
  for (const fn of FILES) {
    try {
      const arr = await loadOne(fn);
      if (Array.isArray(arr)) all = all.concat(arr);
    } catch (e) {
      console.warn('[recipes] non trovato', fn);
    }
  }

  // de-dup per id
  const seen = new Set();
  RECIPES = [];
  for (const r of all) {
    if (r?.id && !seen.has(r.id)) { seen.add(r.id); RECIPES.push(r); }
  }
  writeCache(RECIPES);
  return RECIPES;
}

export async function getRecipes() {
  if (RECIPES.length) return RECIPES;
  return loadRecipes();
}

// warm-up non bloccante
loadRecipes().catch(()=>{});
