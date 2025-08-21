// src/data/recipes.js

// Default: usa il file locale nel repo. Puoi cambiare in Start o dalla console con setRecipesURL(...)
const DEFAULT_URL = './data/recipes.json?v=1';
const LS_KEY_URL  = 'app.recipes.url';
const LS_KEY_DATA = 'app.recipes.cache';   // { ts: number, url: string, items: [...] }
const CACHE_MS    = 6 * 60 * 60 * 1000;    // 6 ore

// piccolo fallback di emergenza (se fetch fallisce)
const FALLBACK = [
  { id:'col_cereali', name:'Cereali con latte', servings:2, tags:['colazione','veloce'],
    ingredients:[ { item:'Cereali', qty:80, unit:'g' }, { item:'Latte', qty:200, unit:'ml' } ] },
  { id:'pranzo_pasta_pom', name:'Pasta al pomodoro', servings:2, tags:['pranzo','vegetariano'],
    ingredients:[ { item:'Pasta', qty:180, unit:'g' }, { item:'Passata di pomodoro', qty:200, unit:'g' } ] },
  { id:'mer_frutta', name:'Frutta fresca', servings:2, tags:['merenda','leggero'],
    ingredients:[ { item:'Frutta fresca', qty:200, unit:'g' } ] },
  { id:'cena_pollo_patate', name:'Pollo arrosto con patate', servings:2, tags:['cena','carne'],
    ingredients:[ { item:'Pollo', qty:300, unit:'g' }, { item:'Patate', qty:250, unit:'g' } ] }
];

function readUrl() {
  try { return localStorage.getItem(LS_KEY_URL) || DEFAULT_URL; } catch { return DEFAULT_URL; }
}

function validRecipe(r){
  return r && typeof r.id==='string' && typeof r.name==='string' &&
         Array.isArray(r.ingredients) && r.ingredients.every(i => i && i.item && i.unit);
}

function validate(arr){
  return Array.isArray(arr) ? arr.filter(validRecipe) : [];
}

export function setRecipesURL(url){
  try {
    const u = (url || '').trim();
    if (!u) return false;
    localStorage.setItem(LS_KEY_URL, u);
    // invalida cache
    localStorage.removeItem(LS_KEY_DATA);
    return true;
  } catch { return false; }
}

export async function getRecipes() {
  const url = readUrl();

  // 1) cache locale
  try {
    const cached = JSON.parse(localStorage.getItem(LS_KEY_DATA) || 'null');
    if (cached && cached.url === url && (Date.now() - cached.ts) < CACHE_MS) {
      const items = validate(cached.items);
      if (items.length) return items;
    }
  } catch {}

  // 2) fetch remoto
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP '+res.status);
    const data = await res.json();
    const items = validate(data);
    if (items.length) {
      try { localStorage.setItem(LS_KEY_DATA, JSON.stringify({ ts: Date.now(), url, items })); } catch {}
      return items;
    }
  } catch (e) {
    console.warn('[recipes] fetch fallito per', url, e);
  }

  // 3) fallback
  return FALLBACK;
}
