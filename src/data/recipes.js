// src/data/recipes.js
//
// Loader ricette con doppio supporto:
// - recipes.json (ricette esplicite)
// - recipes.compact.json (template -> 150+ ricette)
// Usa URL relativi alla cartella del file grazie a import.meta.url (niente più 404).
//
// Esporta:
//   - let RECIPES = []                   (compat legacy)
//   - async function getRecipes()
//   - async function loadRecipes()
//   - function setRecipesURLs(urls[])    (per puntare a URL esterni se vuoi)

const BASE = new URL('.', import.meta.url); // -> .../src/data/
const DEFAULT_URLS = [
  new URL('recipes.json?v=2', BASE).href,          // es: /src/data/recipes.json
  new URL('recipes.compact.json?v=1', BASE).href,  // es: /src/data/recipes.compact.json
];

const LS_KEY_URLS  = 'app.recipes.urls';   // JSON array di URL
const LS_KEY_CACHE = 'app.recipes.cache';  // { ts, urls:[...], items:[...] }
const CACHE_MS     = 6 * 60 * 60 * 1000;   // 6 ore

export let RECIPES = []; // compat: alcuni moduli legacy importavano { RECIPES }

// ------------------------ configurazione URL ------------------------
export function setRecipesURLs(urls){
  try {
    if (!Array.isArray(urls) || !urls.length) return false;
    localStorage.setItem(LS_KEY_URLS, JSON.stringify(urls));
    localStorage.removeItem(LS_KEY_CACHE);
    return true;
  } catch { return false; }
}
function getURLs(){
  try {
    const u = JSON.parse(localStorage.getItem(LS_KEY_URLS) || 'null');
    return Array.isArray(u) && u.length ? u : DEFAULT_URLS;
  } catch { return DEFAULT_URLS; }
}

// ----------------------------- utils -------------------------------
function clone(x){ return JSON.parse(JSON.stringify(x)); }
function validRecipe(r){
  return r && typeof r.id==='string' && typeof r.name==='string' &&
    Array.isArray(r.ingredients) && r.ingredients.every(i => i && i.item && i.unit);
}
function pushSafe(out, r){
  if (validRecipe(r) && !out.some(x => x.id===r.id)) out.push(r);
}
async function fetchJson(url){
  const res = await fetch(url, { cache:'no-store' });
  if (!res.ok) throw new Error(url+' -> '+res.status);
  return res.json();
}

// --------------------- espansione compact -> ricette ----------------
function expandBreakfast(compact, out, max=40){
  const bases = compact?.colazione?.bases || [];
  const cap   = compact?.meta?.max_per_category?.colazione ?? max;

  for (const b of bases){
    // base
    pushSafe(out, {
      id: b.id,
      name: b.name,
      servings: b.servings || 2,
      tags: [...new Set([...(b.tags||[]), 'colazione'])],
      ingredients: clone(b.ingredients || [])
    });
    if (out.filter(x=>x.tags?.includes('colazione')).length >= cap) break;

    // varianti
    for (const v of (b.variants || [])) {
      const ingr = clone(b.ingredients || []);
      // replace
      for (const rep of (v.replace || [])) {
        const idx = ingr.findIndex(i => i.item===rep.from);
        if (idx>=0) ingr[idx] = clone(rep.to);
      }
      // add
      for (const add of (v.add || [])) ingr.push(clone(add));

      const rec = {
        id: `${b.id}_${(v.suffix||'').replace(/\W+/g,'').slice(0,18)}` || `${b.id}_v${Math.random().toString(36).slice(2,6)}`,
        name: b.name + (v.suffix || ''),
        servings: b.servings || 2,
        tags: [...new Set([...(b.tags||[]), ...((v.tags)||[]) , 'colazione'])],
        ingredients: ingr
      };
      pushSafe(out, rec);
      if (out.filter(x=>x.tags?.includes('colazione')).length >= cap) break;
    }
  }
}

function expandLunch(compact, out, max=60){
  const cap = compact?.meta?.max_per_category?.pranzo ?? max;
  // pasta combinatoria
  const p = compact?.pranzo?.pasta;
  if (p){
    outer:
    for (const formato of (p.formati||[])){
      for (const sugo of (p.sughi||[])){
        pushSafe(out, {
          id: `pr_${formato.toLowerCase()}_${sugo.name}`,
          name: `${formato} al ${sugo.name}`,
          servings: p.servings || 2,
          tags: ['pranzo', ...(sugo.tags||[])],
          ingredients: [
            { item:'Pasta', qty: p.pasta_qty_g || 180, unit:'g' },
            ...clone(sugo.ingredients||[])
          ]
        });
        if (out.filter(x=>x.tags?.includes('pranzo')).length >= cap) break outer;
      }
    }
  }
  // piatti unici
  for (const r of (compact?.pranzo?.piatti_unici || [])){
    pushSafe(out, { ...r, tags: [...new Set([...(r.tags||[]), 'pranzo'])] });
    if (out.filter(x=>x.tags?.includes('pranzo')).length >= cap) break;
  }
}

function expandSnack(compact, out, max=30){
  const cap = compact?.meta?.max_per_category?.merenda ?? max;
  const base = compact?.merenda?.items || [];
  for (const r of base){
    pushSafe(out, { ...r, tags:[...(r.tags||[]),'merenda'] });
    if (out.filter(x=>x.tags?.includes('merenda')).length >= cap) break;
  }
  for (const v of (compact?.merenda?.variants || [])){
    const applies = new Set(v.applies || []);
    for (const r of base){
      if (!applies.has(r.id)) continue;
      const ingr = clone(r.ingredients || []);
      for (const rep of (v.replace||[])){
        const idx = ingr.findIndex(i => i.item===rep.from);
        if (idx>=0) ingr[idx] = clone(rep.to);
      }
      for (const add of (v.add||[])) ingr.push(clone(add));
      pushSafe(out, {
        id: `${r.id}_${(v.suffix||'').replace(/\W+/g,'').slice(0,18)}`,
        name: r.name + (v.suffix||''),
        servings: r.servings || 2,
        tags: [...new Set([...(r.tags||[]),'merenda',...((v.tags)||[])])],
        ingredients: ingr
      });
      if (out.filter(x=>x.tags?.includes('merenda')).length >= cap) break;
    }
    if (out.filter(x=>x.tags?.includes('merenda')).length >= cap) break;
  }
}

function expandDinner(compact, out, max=70){
  const cap = compact?.meta?.max_per_category?.cena ?? max;
  const c = compact?.cena;
  if (!c) return;
  outer:
  for (const prot of (c.proteine||[])){
    for (const side of (c.contorni||[])){
      pushSafe(out, {
        id: `c_${prot.name.toLowerCase()}_${side.name.toLowerCase().replace(/\s+/g,'_')}`,
        name: `${prot.name} con ${side.name}`,
        servings: c.servings || 2,
        tags: ['cena', prot.tag || ''],
        ingredients: [
          { item: prot.name, qty: prot.qty, unit: prot.unit },
          { item: side.name, qty: side.qty, unit: side.unit },
          ...(c.extra||[])
        ]
      });
      if (out.filter(x=>x.tags?.includes('cena')).length >= cap) break outer;
    }
  }
}

function expandCompact(json){
  const out = [];
  expandBreakfast(json, out);
  expandLunch(json, out);
  expandSnack(json, out);
  expandDinner(json, out);
  return out;
}

// -------------------- fetch + merge + cache ------------------------
async function loadAllFromURLs(urls){
  const buckets = [];
  for (const u of urls){
    try {
      const data = await fetchJson(u);
      if (Array.isArray(data)) {
        // ricette esplicite
        for (const r of data) if (validRecipe(r)) buckets.push(r);
      } else if (data && typeof data==='object' && (data.colazione || data.pranzo || data.cena || data.merenda)) {
        // template compatto
        const expanded = expandCompact(data);
        for (const r of expanded) if (validRecipe(r)) buckets.push(r);
      }
    } catch (e){
      console.warn('[recipes] errore su', u, e);
    }
  }
  const final = [];
  for (const r of buckets) pushSafe(final, r);
  return final;
}

export async function loadRecipes(){
  const urls = getURLs();

  // cache valida?
  try {
    const cached = JSON.parse(localStorage.getItem(LS_KEY_CACHE) || 'null');
    if (cached && cached.urls?.join('|')===urls.join('|') && (Date.now()-cached.ts)<CACHE_MS){
      RECIPES = cached.items || [];
      return RECIPES;
    }
  } catch {}

  // fetch
  const items = await loadAllFromURLs(urls);
  RECIPES = items;
  try { localStorage.setItem(LS_KEY_CACHE, JSON.stringify({ ts:Date.now(), urls, items })); } catch {}
  return RECIPES;
}

export async function getRecipes(){
  if (RECIPES && RECIPES.length) return RECIPES;
  return loadRecipes();
}

// tentativo non bloccante
loadRecipes().catch(()=>{});
