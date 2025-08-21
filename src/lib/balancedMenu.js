// src/lib/balancedMenu.js
import { kidFactor } from './utils.js';

// mapping semplificato: categorizza ricette per bilanciamento
function bucket(r){
  const name = (r.name||'').toLowerCase();
  const tags = r.tags || [];
  if (tags.includes('pesce') || /salmone|merluzzo|tonno|spada|orata|branzino/.test(name)) return 'pesce';
  if (tags.includes('legumi') || /ceci|lenticchie|fagioli/.test(name)) return 'legumi';
  if (tags.includes('veg') || tags.includes('vegetariano') || /tofu|verdure grigliate|insalat/.test(name)) return 'veg';
  if (tags.includes('carne') || /manzo|bistecca|ragù|salsiccia|burger/.test(name)) return 'carne';
  if (tags.includes('pasta') || /pasta|spaghetti|penne|riso|couscous|risotto/.test(name)) return 'cereali';
  if (tags.includes('pizza')) return 'pizza';
  if (tags.includes('dolce')) return 'dolce';
  if (tags.includes('latticini')) return 'latticini';
  return 'altro';
}

function fitsDiet(r, diet){
  const t = (r.tags||[]).map(x=>x.toLowerCase());
  if (diet==='vegano' && (t.includes('carne') || t.includes('pesce') || t.includes('latticini'))) return false;
  if (diet==='vegetariano' && (t.includes('carne'))) return false;
  if (diet==='pesce' && t.includes('carne')) return false;
  if (diet==='senza lattosio' && t.includes('latticini')) return false;
  // (per senza glutine servirebbero tag/grani specifici)
  return true;
}

export function generateBalancedWeeklyMenu(recipes, settings){
  // struttura piano v3
  const DAYS  = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];
  const MEALS = ['colazione','pranzo','merenda','cena'];

  // regole target (puoi ritoccarle)
  const targets = {
    cena:   { pesce:2, legumi:2, carne:1 },   // il resto veg/cereali
    pranzo: { cereali:3, veg:2, carne:1, pesce:1 },
    colazione: { latticini:2, dolce:2, veg:2 }, // largo ai mix, niente vincoli strettissimi
    merenda: { dolce:2, leggero:2 } // gestione semplice
  };

  // pool per pasto
  const pool = {
    colazione: recipes.filter(r=> (r.tags||[]).includes('colazione') && fitsDiet(r, settings.diet)),
    pranzo:    recipes.filter(r=> (r.tags||[]).includes('pranzo')    && fitsDiet(r, settings.diet)),
    merenda:   recipes.filter(r=> (r.tags||[]).includes('merenda')   && fitsDiet(r, settings.diet)),
    cena:      recipes.filter(r=> (r.tags||[]).includes('cena')      && fitsDiet(r, settings.diet))
  };

  function pickWeek(pasto){
    const want = targets[pasto] || {};
    const usedBuckets = {};
    const usedIds = new Set();
    const lastBucket = { prev: null };

    function candidateList(){
      return pool[pasto].filter(r => !usedIds.has(r.id));
    }

    function pickOne(preferredBuckets=[]){
      const cands = candidateList();
      // ordina: 1) bucket preferiti ancora sotto-target, 2) evitare ripetizione bucket
      const scored = cands.map(r=>{
        const b = bucket(r);
        const under = (want[b] || 0) - (usedBuckets[b] || 0); // >0 se sotto-target
        const avoidPenalty = (lastBucket.prev && lastBucket.prev===b) ? -1 : 0;
        const score = (preferredBuckets.includes(b) ? 2 : 0) + (under>0 ? 1 : 0) + (avoidPenalty);
        return { r, b, score };
      }).sort((a,b)=> b.score - a.score);
      const sel = scored[0] || null;
      if (!sel) return null;
      usedIds.add(sel.r.id);
      usedBuckets[sel.b] = (usedBuckets[sel.b]||0) + 1;
      lastBucket.prev = sel.b;
      return sel.r;
    }

    const week = [];
    for (let i=0;i<7;i++){
      // preferisci bucket ancora sotto-target
      const remain = Object.entries(want).filter(([b,qty]) => (usedBuckets[b]||0) < qty).map(([b])=>b);
      const picked = pickOne(remain);
      if (picked) week.push(picked);
      else {
        // fallback qualsiasi evitando bucket uguale consecutivo
        const any = candidateList().find(r => bucket(r)!==lastBucket.prev) || candidateList()[0];
        if (any){ usedIds.add(any.id); lastBucket.prev=bucket(any); week.push(any); }
        else break;
      }
    }
    // se mancano giorni, riempi senza ripetere id
    while (week.length<7) {
      const any = candidateList().find(r=>true);
      if (!any) break;
      usedIds.add(any.id); lastBucket.prev=bucket(any); week.push(any);
    }
    return week.slice(0,7);
  }

  const plan = DAYS.map(()=>({
    colazione:{ meal:null, excluded:false },
    pranzo:   { meal:null, excluded:false },
    merenda:  { meal:null, excluded:false },
    cena:     { meal:null, excluded:false }
  }));

  const col = pickWeek('colazione');
  const pra = pickWeek('pranzo');
  const mer = pickWeek('merenda');
  const cen = pickWeek('cena');

  for (let i=0;i<7;i++){
    plan[i].colazione.meal = col[i]?.id || null;
    plan[i].pranzo.meal    = pra[i]?.id || null;
    plan[i].merenda.meal   = mer[i]?.id || null;
    plan[i].cena.meal      = cen[i]?.id || null;
  }

  // Applica "nessuno" da Start (esclude celle) se la partecipazione è 'nessuno'
  ['colazione','pranzo','merenda','cena'].forEach(meal=>{
    if ((settings.participation?.[meal]?.mode||'tutti') === 'nessuno') {
      for (let i=0;i<7;i++) plan[i][meal].excluded = true;
    }
  });

  return plan;
}
