// src/lib/menu.js
import { RECIPES } from "../data/recipes.js";
import { loadSettings, equivalents, dietPredicate } from "./utils.js";

// Classifica rapida per varietà
function bucketOf(r) {
  const name = (r.name || '').toLowerCase();
  if ((r.tags||[]).includes('pesce') || /salmone|merluzzo|tonno|vongole|sgombro|orata|branzino/.test(name)) return 'pesce';
  if ((r.tags||[]).includes('veg')) return 'veg';
  if (/pollo|tacchino|manzo|salsiccia|spezzatino|carne/.test(name)) return 'carne';
  if (/riso|pasta|gnocchi|lasagne|couscous|farro|orzo|quinoa/.test(name)) return 'cereali';
  return 'altro';
}

// Pesca ricette garantendo varietà: evita stesso "bucket" due giorni di fila
function pickWeek(allowed) {
  const days = 7;
  const poolByBucket = allowed.reduce((m,r)=>{
    const b = bucketOf(r);
    (m[b] ||= []).push(r);
    return m;
  }, {});
  const buckets = Object.keys(poolByBucket).sort((a,b)=>poolByBucket[b].length - poolByBucket[a].length);

  const result = [];
  let lastBucket = null;

  for (let i=0; i<days; i++) {
    // ordina i bucket preferendo quelli ≠ lastBucket e con più scelta residua
    const candidatesBuckets = buckets
      .filter(b => b !== lastBucket && poolByBucket[b].length > 0)
      .concat(buckets.filter(b => poolByBucket[b].length > 0)); // fallback se necessario

    let picked = null, pickedBucket = null;
    for (const b of candidatesBuckets) {
      if (poolByBucket[b].length === 0) continue;
      // prendi una ricetta poco usata (shift per non ripetere)
      picked = poolByBucket[b].shift();
      pickedBucket = b;
      break;
    }
    if (!picked) break; // niente più ricette
    result.push(picked);
    lastBucket = pickedBucket;
  }
  return result;
}

/**
 * Genera un piano settimanale per 1 pasto/giorno (coerente con l'attuale Planner).
 * Imposta le porzioni = persone equivalenti (considera skip pranzo, età bambini, ecc.)
 * Rispetta la dieta selezionata ed evita ripetizioni di categoria in giorni consecutivi.
 * Ritorna un array di 7 elementi: [{ meal: 'id_ricetta', servings: number }]
 */
export function generateOfficialWeeklyPlan() {
  const s = loadSettings();
  const eq = Math.max(1, Math.round(equivalents(s)));
  const allow = dietPredicate(s);
  const allowed = RECIPES.filter(allow);

  if (allowed.length === 0) {
    // fallback: nessuna ricetta compatibile → piano vuoto
    return Array.from({ length: 7 }, () => ({ meal: null, servings: eq }));
  }

  // ordina per “novità”: prima quelle non usate di recente (se volessimo potremmo leggere uno storico)
  // per ora: sufficiente l’ordine originale

  const picked = pickWeek(allowed);
  // Se meno di 7, riusa ricette diverse dal giorno precedente
  while (picked.length < 7) {
    const last = picked[picked.length - 1];
    const more = allowed.find(r => r.id !== last?.id && bucketOf(r) !== bucketOf(last || {}));
    picked.push(more || allowed[(picked.length) % allowed.length]);
  }

  return picked.slice(0,7).map(r => ({ meal: r.id, servings: eq }));
}
