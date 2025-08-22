// src/lib/balancedMenu.js
// Generatore di menu settimanale bilanciato (output: piano v3 7×4)
// - Bilanciamento per bucket (pesce, legumi, veg, carne, cereali, ecc.)
// - Evita ripetizioni consecutive dello stesso "bucket"
// - Rispetta dieta da settings (vegano/vegetariano/pesce/senza lattosio/etc.) usando i tag delle ricette
// - Applica esclusioni per pasto se in Start il mode è "nessuno"

//
// TIPI ATTESI NELLE RICETTE
// {
//   id: string,
//   name: string,
//   servings: number,
//   tags: string[]        // es: ['cena','pesce'] oppure ['pranzo','vegetariano']
//   ingredients: [{ item, qty, unit }]
// }
//
// TAG CONSIGLIATI (non obbligatori ma utili per il bilanciamento):
//  - 'colazione' | 'pranzo' | 'merenda' | 'cena' (almeno uno per instradare per pasto)
//  - 'pesce','carne','legumi','veg','vegetariano','vegano','pasta','pizza','latticini','dolce','senza lattosio', ...
//

// --- classificatore "bucket" per varietà ---
function bucket(r){
  const name = (r.name || '').toLowerCase();
  const t = (r.tags || []).map(x => (x || '').toLowerCase());

  if (t.includes('pesce') || /salmone|merluzzo|tonno|spada|orata|branzino|sgombro/.test(name)) return 'pesce';
  if (t.includes('legumi') || /ceci|lenticchie|fagioli|piselli/.test(name)) return 'legumi';
  if (t.includes('vegano') || t.includes('veg') || t.includes('vegetariano') || /tofu|verdure|insalat/.test(name)) return 'veg';
  if (t.includes('carne')  || /manzo|bistecca|ragù|salsiccia|pollo|maiale|tacchino|burger/.test(name)) return 'carne';
  if (t.includes('pasta')  || /pasta|spaghetti|penne|fusilli|riso|risotto|couscous/.test(name)) return 'cereali';
  if (t.includes('pizza')) return 'pizza';
  if (t.includes('dolce')) return 'dolce';
  if (t.includes('latticini')) return 'latticini';
  return 'altro';
}

// --- filtro dieta (semplice, basato su tag) ---
function fitsDiet(r, diet){
  const t = (r.tags || []).map(x => (x || '').toLowerCase());
  const d = (diet || '').toLowerCase();

  if (!d) return true;

  if (d === 'vegano') {
    // niente carne/pesce/latticini
    if (t.includes('carne') || t.includes('pesce') || t.includes('latticini')) return false;
  }
  if (d === 'vegetariano') {
    // niente carne
    if (t.includes('carne')) return false;
  }
  if (d === 'pesce') {
    // niente carne, pesce ok
    if (t.includes('carne')) return false;
  }
  if (d.includes('senza lattosio')) {
    if (t.includes('latticini')) return false;
  }
  // per senza glutine servirebbero tag specifici sugli ingredienti (qui non vendiamo tag "glutine")

  return true;
}

// --- selettore settimanale per un pasto ---
// targets: quantità desiderate per bucket (es { pesce:2, legumi:2, carne:1, ... })
function pickWeek(pool, targets = {}) {
  const usedIds = new Set();
  const usedBucketCounts = {};
  let lastBucket = null;

  function candidateList(){
    return pool.filter(r => !usedIds.has(r.id));
  }

  function pickOne(preferredBuckets = []){
    const cands = candidateList();
    if (!cands.length) return null;

    // Scoring:
    // +2 se nel bucket preferito (cioè sotto-target)
    // +1 se bucket sotto-target (anche se non tra i "preferred" espliciti)
    // -1 se ripete il bucket dell'ultima scelta
    const scored = cands.map(r=>{
      const b = bucket(r);
      const under = (targets[b] || 0) - (usedBucketCounts[b] || 0); // >0 se ancora sotto-target
      const p1 = preferredBuckets.includes(b) ? 2 : 0;
      const p2 = under > 0 ? 1 : 0;
      const penalty = (lastBucket && lastBucket === b) ? -1 : 0;
      return { r, b, score: p1 + p2 + penalty };
    }).sort((a,b)=> b.score - a.score);

    const sel = scored[0] || null;
    if (!sel) return null;
    usedIds.add(sel.r.id);
    usedBucketCounts[sel.b] = (usedBucketCounts[sel.b] || 0) + 1;
    lastBucket = sel.b;
    return sel.r;
  }

  const week = [];
  for (let i=0;i<7;i++){
    const remain = Object.entries(targets).filter(([b,qty]) => (usedBucketCounts[b] || 0) < qty).map(([b]) => b);
    const picked = pickOne(remain);
    if (picked) week.push(picked);
    else {
      const any = candidateList().find(r => bucket(r) !== lastBucket) || candidateList()[0] || null;
      if (any) { usedIds.add(any.id); lastBucket = bucket(any); week.push(any); }
      else week.push(null);
    }
  }
  // riempi eventuali buchi con qualsiasi ricetta residua
  for (let i=0;i<week.length;i++){
    if (!week[i]) {
      const any = candidateList()[0];
      if (!any) break;
      usedIds.add(any.id); lastBucket = bucket(any); week[i] = any;
    }
  }
  return week;
}

// --- funzione principale ---
// recipes: array ricette
// settings: oggetto impostazioni Start, usiamo settings.diet e settings.participation
export function generateBalancedWeeklyMenu(recipes, settings = {}) {
  const diet = settings.diet || '';
  const DAYS = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];
  const MEALS = ['colazione','pranzo','merenda','cena'];

  // pool per pasto (filtrato per dieta)
  const pool = {
    colazione: recipes.filter(r => (r.tags || []).includes('colazione') && fitsDiet(r, diet)),
    pranzo:    recipes.filter(r => (r.tags || []).includes('pranzo')    && fitsDiet(r, diet)),
    merenda:   recipes.filter(r => (r.tags || []).includes('merenda')   && fitsDiet(r, diet)),
    cena:      recipes.filter(r => (r.tags || []).includes('cena')      && fitsDiet(r, diet)),
  };

  // se mancano ricette marcate per un pasto, usa fallback da tutto il dataset filtrato
  const allAllowed = recipes.filter(r => fitsDiet(r, diet));
  Object.keys(pool).forEach(k => {
    if (!pool[k].length) pool[k] = allAllowed;
  });

  // target di varietà (regolabili)
  const targets = {
    cena:   { pesce: 2, legumi: 2, carne: 1 },     // il resto veg/cereali
    pranzo: { cereali: 3, veg: 2, carne: 1, pesce: 1 },
    colazione: { latticini: 2, dolce: 2, veg: 2 },
    merenda:   { dolce: 2 } // semplice
  };

  // scegli 7 ricette per ciascun pasto
  const weekCol = pickWeek(pool.colazione, targets.colazione);
  const weekPra = pickWeek(pool.pranzo,    targets.pranzo);
  const weekMer = pickWeek(pool.merenda,   targets.merenda);
  const weekCen = pickWeek(pool.cena,      targets.cena);

  // costruisci piano v3
  const plan = DAYS.map(() => ({
    colazione: { meal: null, excluded: false },
    pranzo:    { meal: null, excluded: false },
    merenda:   { meal: null, excluded: false },
    cena:      { meal: null, excluded: false }
  }));

  for (let i = 0; i < 7; i++) {
    plan[i].colazione.meal = weekCol[i]?.id || null;
    plan[i].pranzo.meal    = weekPra[i]?.id || null;
    plan[i].merenda.meal   = weekMer[i]?.id || null;
    plan[i].cena.meal      = weekCen[i]?.id || null;
  }

  // Applica esclusioni globali da Start:
  // se in Start participation[meal].mode === 'nessuno' → segna tutte le celle di quel pasto come excluded
  MEALS.forEach(meal => {
    const mode = settings?.participation?.[meal]?.mode || 'tutti';
    if (mode === 'nessuno') {
      for (let i = 0; i < 7; i++) plan[i][meal].excluded = true;
    }
  });

  return plan;
}