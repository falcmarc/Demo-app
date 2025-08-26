// src/lib/store.js
const LS = {
  fav:  'app.favorites.v1',   // array di recipeId
  rate: 'app.ratings.v1',     // { [recipeId]: 1..5 }
  mine: 'app.myrecipes.v1',   // array di ricette create da me
  vis:  'app.visibility.v1',  // { [recipeId]: 'private'|'public' }
  asg:  'app.assigned.v1',    // array di recipeId "assegnate dal professionista"
};

function read(k, fallback){ try{ return JSON.parse(localStorage.getItem(k) || 'null') ?? fallback }catch{ return fallback } }
function write(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)) }catch{} }

export function getFavorites(){ return read(LS.fav, []) }
export function toggleFavorite(id){
  const cur = new Set(getFavorites());
  cur.has(id) ? cur.delete(id) : cur.add(id);
  write(LS.fav, [...cur]); 
  return [...cur];
}

export function getRatings(){ return read(LS.rate, {}) }
export function setRating(id, n){
  const r = getRatings(); r[id] = Math.max(1, Math.min(5, n)); write(LS.rate, r); return r[id];
}

export function getVisibilityMap(){ return read(LS.vis, {}) }
export function setVisibility(id, vis){ const v = getVisibilityMap(); v[id] = vis; write(LS.vis, v); return vis; }

export function getMyRecipes(){ return read(LS.mine, []) }       // [{id,name,...}]
export function saveMyRecipes(arr){ write(LS.mine, arr||[]) }

export function getAssigned(){ return read(LS.asg, []) }          // [recipeId]
export function setAssigned(arr){ write(LS.asg, arr||[]) }
