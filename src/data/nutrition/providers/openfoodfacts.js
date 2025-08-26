// src/data/nutrition/providers/openfoodfacts.js
// Query a OpenFoodFacts (senza API key). Restituisce macro per 100g/ml.

const OFF_ENDPOINT = "https://world.openfoodfacts.org/cgi/search.pl";
const FIELDS = [
  "product_name",
  "generic_name",
  "brands",
  "nutriments",
].join(",");

function normalizeName(name=""){
  return name.toLowerCase().trim()
    .replace(/\s+/g, " ")
    .replace(/[àáâä]/g,"a").replace(/[èéêë]/g,"e")
    .replace(/[ìíîï]/g,"i").replace(/[òóôö]/g,"o")
    .replace(/[ùúûü]/g,"u");
}

function pickBestProduct(json, qNorm){
  const items = (json?.products || []).filter(p => p?.nutriments);
  if (!items.length) return null;

  const score = (p)=>{
    const name = normalizeName(p.product_name || p.generic_name || "");
    let s = 0;
    if (name.includes(qNorm)) s += 5;
    const n = p.nutriments || {};
    if (n["energy-kcal_100g"] != null || n["energy-kj_100g"] != null || n["energy_100g"] != null) s += 3;
    if (n.proteins_100g != null)      s += 1;
    if (n.carbohydrates_100g != null) s += 1;
    if (n.sugars_100g != null)        s += 1;
    if (n.fat_100g != null)           s += 1;
    return s;
  };

  return items.sort((a,b)=> score(b)-score(a))[0];
}

export async function offLookup(name){
  const q = name?.trim();
  if (!q) return null;

  const url = `${OFF_ENDPOINT}?search_terms=${encodeURIComponent(q)}&json=1&page_size=8&fields=${encodeURIComponent(FIELDS)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`OFF ${res.status}`);
  const data = await res.json();

  const best = pickBestProduct(data, normalizeName(q));
  if (!best) return null;

  const n = best.nutriments || {};

  // kcal: se manca energy-kcal_100g prova a convertire i kJ → kcal (1 kJ ≈ 0.239006 kcal)
  let kcal100 = n["energy-kcal_100g"];
  if (kcal100 == null) {
    const kj = n["energy-kj_100g"] ?? n["energy_100g"];
    if (kj != null) kcal100 = Math.round(+kj * 0.239006);
  }

  // OFF: sodium in g/100g; a volte solo mg → convertiamo e poi NaCl ≈ Na * 2.5
  let sodium = n.sodium_100g;
  if (sodium == null && n.sodium_value && n.sodium_unit === "mg") sodium = +n.sodium_value / 1000;
  const salt = sodium != null ? Math.round(sodium * 2.5 * 100)/100 : 0;

  return {
    source: "OFF",
    name: best.product_name || best.generic_name || q,
    unit: "g",
    per100: {
      kcal:   Math.round(kcal100 ?? 0),
      protein:Math.round(n.proteins_100g ?? 0),
      carbs:  Math.round(n.carbohydrates_100g ?? 0),
      sugar:  Math.round(n.sugars_100g ?? 0),
      fat:    Math.round(n.fat_100g ?? 0),
      satFat: Math.round(n["saturated-fat_100g"] ?? 0),
      fiber:  Math.round(n.fiber_100g ?? 0),
      salt
    },
  };
}
