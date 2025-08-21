export const RECIPES = [
  // PASTA & CEREALI
  {
    id: 'spaghetti_pomodoro',
    name: 'Spaghetti al pomodoro',
    servings: 2, tags: ['pranzo','cena','veg'],
    ingredients: [
      { item: 'spaghetti', qty: 180, unit: 'g' },
      { item: 'passata di pomodoro', qty: 300, unit: 'ml' },
      { item: 'olio extravergine', qty: 20, unit: 'ml' },
      { item: 'sale', qty: 5, unit: 'g' },
      { item: 'basilico', qty: 5, unit: 'g' }
    ]
  },
  {
    id: 'pasta_pesto',
    name: 'Pasta al pesto',
    servings: 2, tags: ['pranzo','cena','veg'],
    ingredients: [
      { item: 'pasta corta', qty: 180, unit: 'g' },
      { item: 'pesto', qty: 80, unit: 'g' }
    ]
  },
  {
    id: 'pasta_tonno',
    name: 'Pasta al tonno',
    servings: 2, tags: ['pranzo','cena'],
    ingredients: [
      { item: 'pasta corta', qty: 180, unit: 'g' },
      { item: 'tonno in scatola', qty: 160, unit: 'g' },
      { item: 'passata di pomodoro', qty: 200, unit: 'ml' },
      { item: 'olio extravergine', qty: 15, unit: 'ml' }
    ]
  },
  {
    id: 'risotto_zafferano',
    name: 'Risotto allo zafferano',
    servings: 2, tags: ['pranzo','cena','veg'],
    ingredients: [
      { item: 'riso', qty: 160, unit: 'g' },
      { item: 'brodo vegetale', qty: 700, unit: 'ml' },
      { item: 'zafferano', qty: 0.5, unit: 'g' },
      { item: 'olio extravergine', qty: 15, unit: 'ml' },
      { item: 'sale', qty: 4, unit: 'g' }
    ]
  },
  {
    id: 'couscous_verdure',
    name: 'Couscous con verdure',
    servings: 2, tags: ['pranzo','cena','veg'],
    ingredients: [
      { item: 'couscous', qty: 160, unit: 'g' },
      { item: 'acqua', qty: 200, unit: 'ml' },
      { item: 'zucchine', qty: 200, unit: 'g' },
      { item: 'peperone', qty: 150, unit: 'g' },
      { item: 'olio extravergine', qty: 20, unit: 'ml' },
      { item: 'sale', qty: 4, unit: 'g' }
    ]
  },

  // CARNE & POLLO
  {
    id: 'pollo_riso',
    name: 'Pollo e riso',
    servings: 2, tags: ['pranzo','cena','glutenfree'],
    ingredients: [
      { item: 'petto di pollo', qty: 300, unit: 'g' },
      { item: 'riso', qty: 160, unit: 'g' },
      { item: 'olio extravergine', qty: 15, unit: 'ml' },
      { item: 'sale', qty: 5, unit: 'g' }
    ]
  },
  {
    id: 'pollo_alla_piastra_insalata',
    name: 'Pollo alla piastra con insalata',
    servings: 2, tags: ['cena','leggero','glutenfree'],
    ingredients: [
      { item: 'petto di pollo', qty: 300, unit: 'g' },
      { item: 'insalata mista', qty: 150, unit: 'g' },
      { item: 'olio extravergine', qty: 15, unit: 'ml' },
      { item: 'sale', qty: 3, unit: 'g' }
    ]
  },
  {
    id: 'polpette_sugo',
    name: 'Polpette al sugo',
    servings: 2, tags: ['pranzo','cena'],
    ingredients: [
      { item: 'carne macinata', qty: 300, unit: 'g' },
      { item: 'uova', qty: 1, unit: 'pz' },
      { item: 'pangrattato', qty: 30, unit: 'g' },
      { item: 'passata di pomodoro', qty: 300, unit: 'ml' },
      { item: 'olio extravergine', qty: 20, unit: 'ml' },
      { item: 'sale', qty: 5, unit: 'g' }
    ]
  },
  {
    id: 'tacchino_verdure_forno',
    name: 'Tacchino con verdure al forno',
    servings: 2, tags: ['cena','glutenfree'],
    ingredients: [
      { item: 'fesa di tacchino', qty: 300, unit: 'g' },
      { item: 'patate', qty: 300, unit: 'g' },
      { item: 'carote', qty: 200, unit: 'g' },
      { item: 'olio extravergine', qty: 25, unit: 'ml' },
      { item: 'sale', qty: 5, unit: 'g' }
    ]
  },
  {
    id: 'spezzatino_patate',
    name: 'Spezzatino con patate',
    servings: 2, tags: ['cena'],
    ingredients: [
      { item: 'spezzatino di manzo', qty: 400, unit: 'g' },
      { item: 'patate', qty: 400, unit: 'g' },
      { item: 'passata di pomodoro', qty: 200, unit: 'ml' },
      { item: 'olio extravergine', qty: 20, unit: 'ml' },
      { item: 'sale', qty: 5, unit: 'g' }
    ]
  },

  // PESCE
  {
    id: 'insalata_tonno',
    name: 'Insalata con tonno',
    servings: 2, tags: ['pranzo','freddo'],
    ingredients: [
      { item: 'insalata mista', qty: 150, unit: 'g' },
      { item: 'tonno in scatola', qty: 160, unit: 'g' },
      { item: 'mais', qty: 100, unit: 'g' },
      { item: 'olio extravergine', qty: 15, unit: 'ml' },
      { item: 'sale', qty: 3, unit: 'g' }
    ]
  },
  {
    id: 'salmone_forno',
    name: 'Salmone al forno con patate',
    servings: 2, tags: ['cena','glutenfree'],
    ingredients: [
      { item: 'salmone', qty: 300, unit: 'g' },
      { item: 'patate', qty: 300, unit: 'g' },
      { item: 'olio extravergine', qty: 20, unit: 'ml' },
      { item: 'sale', qty: 4, unit: 'g' }
    ]
  },
  {
    id: 'merluzzo_piselli',
    name: 'Merluzzo con piselli',
    servings: 2, tags: ['cena','leggero','glutenfree'],
    ingredients: [
      { item: 'filetti di merluzzo', qty: 350, unit: 'g' },
      { item: 'piselli surgelati', qty: 250, unit: 'g' },
      { item: 'olio extravergine', qty: 15, unit: 'ml' },
      { item: 'sale', qty: 4, unit: 'g' }
    ]
  },
  {
    id: 'spaghetti_vongole_fake',
    name: 'Spaghetti alle vongole (surg.)',
    servings: 2, tags: ['pranzo','cena'],
    ingredients: [
      { item: 'spaghetti', qty: 180, unit: 'g' },
      { item: 'vongole surgelate', qty: 250, unit: 'g' },
      { item: 'olio extravergine', qty: 20, unit: 'ml' },
      { item: 'sale', qty: 4, unit: 'g' }
    ]
  },

  // UOVA & VEGETARIANO
  {
    id: 'frittata_verdure',
    name: 'Frittata con verdure',
    servings: 2, tags: ['cena','veg'],
    ingredients: [
      { item: 'uova', qty: 4, unit: 'pz' },
      { item: 'zucchine', qty: 200, unit: 'g' },
      { item: 'olio extravergine', qty: 20, unit: 'ml' },
      { item: 'sale', qty: 4, unit: 'g' }
    ]
  },
  {
    id: 'omelette_formaggio',
    name: 'Omelette al formaggio',
    servings: 2, tags: ['colazione','pranzo','veg'],
    ingredients: [
      { item: 'uova', qty: 4, unit: 'pz' },
      { item: 'formaggio grattugiato', qty: 40, unit: 'g' },
      { item: 'olio extravergine', qty: 10, unit: 'ml' },
      { item: 'sale', qty: 3, unit: 'g' }
    ]
  },
  {
    id: 'burger_veg',
    name: 'Burger vegetale + insalata',
    servings: 2, tags: ['cena','veg'],
    ingredients: [
      { item: 'burger vegetali', qty: 2, unit: 'pz' },
      { item: 'insalata mista', qty: 150, unit: 'g' },
      { item: 'olio extravergine', qty: 10, unit: 'ml' },
      { item: 'sale', qty: 3, unit: 'g' }
    ]
  },
  {
    id: 'zuppa_lenticchie',
    name: 'Zuppa di lenticchie',
    servings: 2, tags: ['cena','veg','glutenfree'],
    ingredients: [
      { item: 'lenticchie secche', qty: 180, unit: 'g' },
      { item: 'passata di pomodoro', qty: 200, unit: 'ml' },
      { item: 'carote', qty: 150, unit: 'g' },
      { item: 'olio extravergine', qty: 15, unit: 'ml' },
      { item: 'sale', qty: 4, unit: 'g' }
    ]
  },
  {
    id: 'chili_fagioli',
    name: 'Chili di fagioli (veg)',
    servings: 2, tags: ['cena','veg','speziato'],
    ingredients: [
      { item: 'fagioli rossi in scatola', qty: 400, unit: 'g' },
      { item: 'passata di pomodoro', qty: 300, unit: 'ml' },
      { item: 'mais', qty: 150, unit: 'g' },
      { item: 'olio extravergine', qty: 15, unit: 'ml' },
      { item: 'sale', qty: 4, unit: 'g' }
    ]
  },

  // PANINI & PIATTI RAPIDI
  {
    id: 'piadina_prosciutto',
    name: 'Piadina prosciutto e insalata',
    servings: 2, tags: ['pranzo','rapido'],
    ingredients: [
      { item: 'piadina', qty: 2, unit: 'pz' },
      { item: 'prosciutto cotto', qty: 120, unit: 'g' },
      { item: 'insalata mista', qty: 80, unit: 'g' }
    ]
  },
  {
    id: 'toast_tacchino',
    name: 'Toast tacchino e formaggio',
    servings: 2, tags: ['colazione','pranzo','rapido'],
    ingredients: [
      { item: 'pane per toast', qty: 4, unit: 'pz' },
      { item: 'fesa di tacchino', qty: 120, unit: 'g' },
      { item: 'formaggio a fette', qty: 80, unit: 'g' }
    ]
  },
  {
    id: 'wrap_tonno',
    name: 'Wrap al tonno',
    servings: 2, tags: ['pranzo','rapido'],
    ingredients: [
      { item: 'tortilla', qty: 2, unit: 'pz' },
      { item: 'tonno in scatola', qty: 160, unit: 'g' },
      { item: 'insalata mista', qty: 100, unit: 'g' }
    ]
  },

  // INSALATE & FREDDI
  {
    id: 'insalata_greca',
    name: 'Insalata greca',
    servings: 2, tags: ['pranzo','freddo','veg'],
    ingredients: [
      { item: 'pomodori', qty: 300, unit: 'g' },
      { item: 'cetriolo', qty: 200, unit: 'g' },
      { item: 'cipolla', qty: 60, unit: 'g' },
      { item: 'feta', qty: 150, unit: 'g' },
      { item: 'olio extravergine', qty: 20, unit: 'ml' },
      { item: 'sale', qty: 4, unit: 'g' }
    ]
  },
  {
    id: 'insalata_couscous_fredda',
    name: 'Couscous freddo con tonno e mais',
    servings: 2, tags: ['pranzo','freddo'],
    ingredients: [
      { item: 'couscous', qty: 160, unit: 'g' },
      { item: 'acqua', qty: 200, unit: 'ml' },
      { item: 'tonno in scatola', qty: 160, unit: 'g' },
      { item: 'mais', qty: 150, unit: 'g' }
    ]
  },
  {
    id: 'insalata_riso',
    name: 'Insalata di riso',
    servings: 2, tags: ['pranzo','freddo'],
    ingredients: [
      { item: 'riso', qty: 160, unit: 'g' },
      { item: 'piselli surgelati', qty: 100, unit: 'g' },
      { item: 'mais', qty: 100, unit: 'g' },
      { item: 'tonno in scatola', qty: 120, unit: 'g' }
    ]
  },

  // VERDURE & CONTORNI SOSTANZIOSI
  {
    id: 'verdure_griglia_quinoa',
    name: 'Verdure alla griglia con quinoa',
    servings: 2, tags: ['cena','veg','glutenfree'],
    ingredients: [
      { item: 'quinoa', qty: 160, unit: 'g' },
      { item: 'peperone', qty: 200, unit: 'g' },
      { item: 'zucchine', qty: 200, unit: 'g' },
      { item: 'olio extravergine', qty: 20, unit: 'ml' },
      { item: 'sale', qty: 4, unit: 'g' }
    ]
  },
  {
    id: 'patate_forno_rosmarino',
    name: 'Patate al forno al rosmarino',
    servings: 2, tags: ['contorno','veg','glutenfree'],
    ingredients: [
      { item: 'patate', qty: 500, unit: 'g' },
      { item: 'olio extravergine', qty: 25, unit: 'ml' },
      { item: 'sale', qty: 5, unit: 'g' }
    ]
  },
  {
    id: 'minestrone',
    name: 'Minestrone di verdure',
    servings: 2, tags: ['cena','veg','glutenfree'],
    ingredients: [
      { item: 'misto verdure surgelato', qty: 600, unit: 'g' },
      { item: 'brodo vegetale', qty: 800, unit: 'ml' },
      { item: 'olio extravergine', qty: 15, unit: 'ml' },
      { item: 'sale', qty: 4, unit: 'g' }
    ]
  },

  // PIATTI UNICI & FORNO
  {
    id: 'lasagne_veg_simplified',
    name: 'Lasagne vegetariane (sempl.)',
    servings: 2, tags: ['pranzo','forno','veg'],
    ingredients: [
      { item: 'sfoglia per lasagne', qty: 150, unit: 'g' },
      { item: 'passata di pomodoro', qty: 300, unit: 'ml' },
      { item: 'mozzarella', qty: 200, unit: 'g' }
    ]
  },
  {
    id: 'pasta_al_forno',
    name: 'Pasta al forno',
    servings: 2, tags: ['pranzo','forno'],
    ingredients: [
      { item: 'pasta corta', qty: 180, unit: 'g' },
      { item: 'passata di pomodoro', qty: 300, unit: 'ml' },
      { item: 'mozzarella', qty: 150, unit: 'g' }
    ]
  },
  {
    id: 'parmigiana_light',
    name: 'Parmigiana light',
    servings: 2, tags: ['cena','forno','veg'],
    ingredients: [
      { item: 'melanzane', qty: 400, unit: 'g' },
      { item: 'passata di pomodoro', qty: 300, unit: 'ml' },
      { item: 'mozzarella', qty: 150, unit: 'g' },
      { item: 'olio extravergine', qty: 20, unit: 'ml' },
      { item: 'sale', qty: 4, unit: 'g' }
    ]
  },

  // INTERNazionale / VARI
  {
    id: 'pollo_curry_riso',
    name: 'Pollo al curry con riso',
    servings: 2, tags: ['cena'],
    ingredients: [
      { item: 'petto di pollo', qty: 300, unit: 'g' },
      { item: 'riso', qty: 160, unit: 'g' },
      { item: 'latte di cocco', qty: 200, unit: 'ml' },
      { item: 'curry in polvere', qty: 10, unit: 'g' },
      { item: 'olio extravergine', qty: 15, unit: 'ml' },
      { item: 'sale', qty: 4, unit: 'g' }
    ]
  },
  {
    id: 'shakshuka',
    name: 'Shakshuka (uova in salsa)',
    servings: 2, tags: ['cena','veg'],
    ingredients: [
      { item: 'passata di pomodoro', qty: 400, unit: 'ml' },
      { item: 'uova', qty: 4, unit: 'pz' },
      { item: 'olio extravergine', qty: 15, unit: 'ml' },
      { item: 'sale', qty: 4, unit: 'g' }
    ]
  },
  {
    id: 'pancake_salati_tonno',
    name: 'Pancake salati al tonno',
    servings: 2, tags: ['colazione','pranzo'],
    ingredients: [
      { item: 'farina', qty: 120, unit: 'g' },
      { item: 'uova', qty: 2, unit: 'pz' },
      { item: 'latte', qty: 180, unit: 'ml' },
      { item: 'tonno in scatola', qty: 120, unit: 'g' },
      { item: 'sale', qty: 3, unit: 'g' }
    ]
  },
  {
    id: 'riso_fritto_verdure_uovo',
    name: 'Riso fritto con verdure e uovo',
    servings: 2, tags: ['pranzo'],
    ingredients: [
      { item: 'riso', qty: 160, unit: 'g' },
      { item: 'piselli surgelati', qty: 150, unit: 'g' },
      { item: 'carote', qty: 150, unit: 'g' },
      { item: 'uova', qty: 2, unit: 'pz' },
      { item: 'olio extravergine', qty: 20, unit: 'ml' },
      { item: 'sale', qty: 4, unit: 'g' }
    ]
  },
  {
    id: 'gnocchi_burro_salvia_light',
    name: 'Gnocchi burro e salvia (light)',
    servings: 2, tags: ['pranzo','veg'],
    ingredients: [
      { item: 'gnocchi di patate', qty: 400, unit: 'g' },
      { item: 'olio extravergine', qty: 15, unit: 'ml' },
      { item: 'sale', qty: 4, unit: 'g' }
    ]
  },
  {
    id: 'farro_pomodoro_mozzarella',
    name: 'Insalata di farro pomodoro e mozzarella',
    servings: 2, tags: ['pranzo','freddo','veg'],
    ingredients: [
      { item: 'farro', qty: 160, unit: 'g' },
      { item: 'pomodori', qty: 250, unit: 'g' },
      { item: 'mozzarella', qty: 150, unit: 'g' },
      { item: 'olio extravergine', qty: 15, unit: 'ml' },
      { item: 'sale', qty: 4, unit: 'g' }
    ]
  },
  {
    id: 'riso_fagioli',
    name: 'Riso e fagioli',
    servings: 2, tags: ['cena','veg','glutenfree'],
    ingredients: [
      { item: 'riso', qty: 160, unit: 'g' },
      { item: 'fagioli cannellini in scatola', qty: 240, unit: 'g' },
      { item: 'passata di pomodoro', qty: 200, unit: 'ml' },
      { item: 'olio extravergine', qty: 15, unit: 'ml' },
      { item: 'sale', qty: 4, unit: 'g' }
    ]
  },
  {
    id: 'orzo_verdure',
    name: 'Orzotto alle verdure',
    servings: 2, tags: ['pranzo','veg'],
    ingredients: [
      { item: 'orzo', qty: 160, unit: 'g' },
      { item: 'zucchine', qty: 200, unit: 'g' },
      { item: 'carote', qty: 150, unit: 'g' },
      { item: 'olio extravergine', qty: 20, unit: 'ml' },
      { item: 'sale', qty: 4, unit: 'g' }
    ]
  },
  {
    id: 'pasta_broccoli_salsiccia',
    name: 'Pasta broccoli e salsiccia',
    servings: 2, tags: ['pranzo'],
    ingredients: [
      { item: 'pasta corta', qty: 180, unit: 'g' },
      { item: 'broccoli', qty: 300, unit: 'g' },
      { item: 'salsiccia', qty: 200, unit: 'g' },
      { item: 'olio extravergine', qty: 20, unit: 'ml' },
      { item: 'sale', qty: 4, unit: 'g' }
    ]
  },
  {
    id: 'pasta_alla_norma_light',
    name: 'Pasta alla Norma (light)',
    servings: 2, tags: ['pranzo','veg'],
    ingredients: [
      { item: 'pasta corta', qty: 180, unit: 'g' },
      { item: 'melanzane', qty: 300, unit: 'g' },
      { item: 'passata di pomodoro', qty: 300, unit: 'ml' },
      { item: 'olio extravergine', qty: 25, unit: 'ml' },
      { item: 'sale', qty: 4, unit: 'g' }
    ]
  },
  {
    id: 'ragu_rapido',
    name: 'Ragù rapido',
    servings: 2, tags: ['condimento'],
    ingredients: [
      { item: 'carne macinata', qty: 250, unit: 'g' },
      { item: 'passata di pomodoro', qty: 400, unit: 'ml' },
      { item: 'olio extravergine', qty: 15, unit: 'ml' },
      { item: 'sale', qty: 4, unit: 'g' }
    ]
  },
  {
    id: 'tortilla_patate',
    name: 'Tortilla di patate',
    servings: 2, tags: ['cena','veg'],
    ingredients: [
      { item: 'uova', qty: 4, unit: 'pz' },
      { item: 'patate', qty: 400, unit: 'g' },
      { item: 'olio extravergine', qty: 25, unit: 'ml' },
      { item: 'sale', qty: 4, unit: 'g' }
    ]
  },
  {
    id: 'pollo_arrosto_patate',
    name: 'Pollo arrosto con patate',
    servings: 2, tags: ['cena','forno','glutenfree'],
    ingredients: [
      { item: 'cosce di pollo', qty: 500, unit: 'g' },
      { item: 'patate', qty: 400, unit: 'g' },
      { item: 'olio extravergine', qty: 25, unit: 'ml' },
      { item: 'sale', qty: 5, unit: 'g' }
    ]
  },
  {
    id: 'pasta_piselli_prosciutto',
    name: 'Pasta piselli e prosciutto',
    servings: 2, tags: ['pranzo'],
    ingredients: [
      { item: 'pasta corta', qty: 180, unit: 'g' },
      { item: 'piselli surgelati', qty: 150, unit: 'g' },
      { item: 'prosciutto cotto', qty: 120, unit: 'g' },
      { item: 'olio extravergine', qty: 15, unit: 'ml' },
      { item: 'sale', qty: 4, unit: 'g' }
    ]
  },
  {
    id: 'riso_pollo_verdure_wok',
    name: 'Riso pollo e verdure al wok',
    servings: 2, tags: ['pranzo'],
    ingredients: [
      { item: 'riso', qty: 160, unit: 'g' },
      { item: 'petto di pollo', qty: 250, unit: 'g' },
      { item: 'zucchine', qty: 200, unit: 'g' },
      { item: 'peperone', qty: 150, unit: 'g' },
      { item: 'olio extravergine', qty: 20, unit: 'ml' },
      { item: 'sale', qty: 4, unit: 'g' }
    ]
  },
  {
    id: 'spaghetti_aglio_olio',
    name: 'Spaghetti aglio e olio',
    servings: 2, tags: ['pranzo','veg','rapido'],
    ingredients: [
      { item: 'spaghetti', qty: 180, unit: 'g' },
      { item: 'olio extravergine', qty: 25, unit: 'ml' },
      { item: 'sale', qty: 4, unit: 'g' }
    ]
  }
];
