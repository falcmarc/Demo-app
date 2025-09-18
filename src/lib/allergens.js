// src/lib/allergens.js
// Elenco allergeni comuni + matching semplice su ingredienti (IT/EN)

export const ALLERGENS = [
  { key: 'glutine',     label: 'Glutine',     keywords: ['glutine','frumento','grano','pane','pasta','semola','farro','orzo','segale','kamut','bulgur','couscous'] },
  { key: 'latte',       label: 'Latte',       keywords: ['latte','lattosio','formaggio','burro','yogurt','panna','mozzarella','parmigiano','milk','cheese','butter','yogurt','cream'] },
  { key: 'uova',        label: 'Uova',        keywords: ['uovo','uova','egg','eggs','albume','tuorlo'] },
  { key: 'arachidi',    label: 'Arachidi',    keywords: ['arachidi','peanut','peanuts'] },
  { key: 'frutta_guscio',label:'Frutta a guscio', keywords: ['nocciole','noci','mandorle','pistacchi','anacardi','macadamia','pecan','pinoli','walnut','almond','hazelnut','cashew','pistachio'] },
  { key: 'soia',        label: 'Soia',        keywords: ['soia','soy','tofu','edamame','tamari','shoyu','miso'] },
  { key: 'pesce',       label: 'Pesce',       keywords: ['pesce','salmone','merluzzo','tonno','orata','branzino','sgombro','acciughe','fish','cod','salmon','tuna','mackerel','anchovy','sea bass','bream'] },
  { key: 'crostacei',   label: 'Crostacei',   keywords: ['gamberi','mazzancolle','scampi','aragosta','granchio','shrimp','prawn','lobster','crab'] },
  { key: 'molluschi',   label: 'Molluschi',   keywords: ['cozze','vongole','calamari','seppie','polpo','mussels','clams','squid','cuttlefish','octopus'] },
  { key: 'sesamo',      label: 'Sesamo',      keywords: ['sesamo','tahin','tahina','sesame','tahini'] },
  { key: 'sedano',      label: 'Sedano',      keywords: ['sedano','celery'] },
  { key: 'senape',      label: 'Senape',      keywords: ['senape','mustard'] },
  { key: 'lupini',      label: 'Lupini',      keywords: ['lupini','lupin'] },
  { key: 'solanacee',   label: 'Solanacee',   keywords: ['pomodoro','melanzana','peperone','patata','tomato','eggplant','aubergine','pepper','potato'] },
];

// true se la ricetta contiene uno dei selectedKeys
export function recipeHasAllergen(recipe, selectedKeys = []) {
  if (!selectedKeys.length) return false;
  const allKw = new Set(
    ALLERGENS.filter(a => selectedKeys.includes(a.key))
             .flatMap(a => a.keywords.map(k => k.toLowerCase()))
  );
  const items = (recipe.ingredients || []).map(i => (i.item||'').toLowerCase());
  return items.some(it => {
    for (const kw of allKw) if (it.includes(kw)) return true;
    return false;
  });
}

// punteggio preferenze: +2 se un ingrediente contiene una delle parole chiave preferite
export function preferenceScore(recipe, favFoods = []) {
  if (!favFoods.length) return 0;
  const items = (recipe.ingredients || []).map(i => (i.item||'').toLowerCase());
  let s = 0;
  favFoods.map(x=>x.toLowerCase().trim()).forEach(f => {
    if (!f) return;
    if (items.some(it => it.includes(f))) s += 2;
  });
  return s;
}
