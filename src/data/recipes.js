// src/data/recipes.js
const FILES = [
  './recipes/colazioni.json',
  './recipes/pranzi.json',
  './recipes/merende.json',
  './recipes/cene.json'
];

export async function getRecipes() {
  let all = [];
  for (const f of FILES) {
    try {
      const res = await fetch(f, { cache: 'no-store' });
      if (!res.ok) { console.warn('File non trovato:', f); continue; }
      const data = await res.json();
      all = all.concat(data);
    } catch (e) {
      console.error('Errore caricando', f, e);
    }
  }
  return all;
}
