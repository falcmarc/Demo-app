// src/lib/utils.js
export function loadSettings() {
  const def = {
    shoppingDay: 'Sab',
    adults: 2,
    kids: 0,
    kidsAges: [],
    adultsSkipLunch: 0,
    kidsSkipLunch: 0,
    budget: 100,
    diet: 'onnivoro'
  };
  try { return { ...def, ...(JSON.parse(localStorage.getItem('app.settings')||'null')||{}) }; }
  catch { return def; }
}

export function kidFactor(age){
  const a = Number(age)||0;
  if (a<=3) return 0.5;
  if (a<=7) return 0.7;
  if (a<=12) return 0.85;
  return 1.0;
}

export function equivalents(s){
  const kidsEq = (Array.isArray(s.kidsAges)?s.kidsAges:[])
    .slice(0, Math.max(0, s.kids||0))
    .reduce((sum,a)=>sum+kidFactor(a),0);
  const skipA = Math.min(s.adults||0, s.adultsSkipLunch||0)*0.5;
  const skipK = Math.min(s.kids||0,   s.kidsSkipLunch||0)*0.35;
  return Math.max(0, (s.adults||0) + kidsEq - (skipA+skipK));
}

export function dietPredicate(s){
  const d = (s.diet||'onnivoro').toLowerCase();
  const hasLactose = r => (r.ingredients||[]).some(i=>/latte|mozzarella|formaggio|feta|burro|yogurt/i.test(i.item||''));
  const isFish = r => (r.tags||[]).includes('pesce') || /salmone|merluzzo|tonno|vongole/i.test((r.name||'')+' '+(r.id||''));
  const isVeg  = r => (r.tags||[]).includes('veg');
  const isGF   = r => (r.tags||[]).includes('glutenfree');
  return r => {
    switch(d){
      case 'vegetariano': return isVeg(r);
      case 'vegano':      return isVeg(r);
      case 'pesce':       return isFish(r) || isVeg(r);
      case 'senza glutine': return isGF(r) || isFish(r) || isVeg(r);
      case 'senza lattosio': return !hasLactose(r);
      default: return true;
    }
  };
}
