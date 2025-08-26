// src/data/nutrition.js
// Tabella nutrizionale minimale per ingrediente (per 100 g/ml).
// Se unità = 'pz' usa perPieceGrams (peso medio pezzo) per convertire.
// Campi: kcal, protein, carbs, sugar, fat, satFat, fiber, salt  (tutti in grammi tranne kcal)

export const NUTRITION_DB = [
  { kw:['pasta','spaghetti','penne'],        unit:'g',   kcal:350, protein:12, carbs:72, sugar:3,  fat:1.5, satFat:0.3, fiber:3,  salt:0 },
  { kw:['riso'],                              unit:'g',   kcal:345, protein:7,  carbs:78, sugar:0.5,fat:0.7, satFat:0.2, fiber:1.3,salt:0 },
  { kw:['petto di pollo','pollo'],            unit:'g',   kcal:165, protein:31, carbs:0,  sugar:0,  fat:3.6, satFat:1.0, fiber:0,  salt:0.1 },
  { kw:['manzo','bovino','carne di manzo'],   unit:'g',   kcal:250, protein:26, carbs:0,  sugar:0,  fat:17,  satFat:7,   fiber:0,  salt:0.1 },
  { kw:['maiale','carne di maiale'],          unit:'g',   kcal:300, protein:25, carbs:0,  sugar:0,  fat:22,  satFat:8,   fiber:0,  salt:0.1 },
  { kw:['tonno'],                             unit:'g',   kcal:132, protein:29, carbs:0,  sugar:0,  fat:1,   satFat:0.3, fiber:0,  salt:0.2 },
  { kw:['salmone','salmon'],                   unit:'g',   kcal:208, protein:20, carbs:0,  sugar:0,  fat:13,  satFat:3,   fiber:0,  salt:0.1 },
  { kw:['uovo','uova'],                        unit:'pz',  kcal:155, protein:13, carbs:1.1,sugar:1.1,fat:11,  satFat:3.3, fiber:0,  salt:0.12, perPieceGrams: 60 },
  { kw:['latte'],                              unit:'ml',  kcal:64,  protein:3.3,carbs:4.8,sugar:4.8,fat:3.6, satFat:2.3, fiber:0,  salt:0.1 },
  { kw:['olio','olio d\'oliva'],               unit:'g',   kcal:884, protein:0,  carbs:0,  sugar:0,  fat:100, satFat:14,  fiber:0,  salt:0 },
  { kw:['burro'],                              unit:'g',   kcal:717, protein:0.9,carbs:0.1,sugar:0.1,fat:81,  satFat:51,  fiber:0,  salt:1.5 },
  { kw:['zucchero'],                           unit:'g',   kcal:387, protein:0,  carbs:100,sugar:100,fat:0,   satFat:0,   fiber:0,  salt:0 },
  { kw:['pomodoro','pomodori'],                unit:'g',   kcal:18,  protein:0.9,carbs:3.9,sugar:2.6,fat:0.2, satFat:0.0, fiber:1.2,salt:0 },
  { kw:['cipolla'],                            unit:'g',   kcal:40,  protein:1.1,carbs:9.3,sugar:4.2,fat:0.1, satFat:0.0, fiber:1.7,salt:0 },
  { kw:['aglio'],                              unit:'g',   kcal:149, protein:6.4,carbs:33, sugar:1,  fat:0.5, satFat:0.1, fiber:2.1,salt:0 },
  { kw:['pane'],                               unit:'g',   kcal:265, protein:9,  carbs:49, sugar:5,  fat:3.2, satFat:0.8, fiber:2.7,salt:0.5 },
  { kw:['yogurt','yoghurt'],                   unit:'g',   kcal:60,  protein:5,  carbs:4.7,sugar:4.7,fat:3.3, satFat:2.1, fiber:0,  salt:0.1 },
  { kw:['mela','mele'],                        unit:'g',   kcal:52,  protein:0.3,carbs:14, sugar:10, fat:0.2, satFat:0.0, fiber:2.4,salt:0 },
  { kw:['banana','banane'],                    unit:'g',   kcal:89,  protein:1.1,carbs:23, sugar:12, fat:0.3, satFat:0.1, fiber:2.6,salt:0 },
];

// ritorna il record nutrizionale per un ingrediente o null
export function lookupNutrition(name){
  const n = (name||'').toLowerCase();
  return NUTRITION_DB.find(row => row.kw.some(k => n.includes(k))) || null;
}
