const normalize = value => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');

// Only aliases with a specific, documented preparation map directly to a USDA record.
const aliases = new Map([
  ['banana', '173944'],
  ['raw banana', '173944'],
  ['blueberry', '171711'],
  ['blueberries', '171711'],
  ['raw blueberries', '171711'],
  ['raw broccoli', '170379'],
  ['broccoli raw', '170379'],
  ['broccoli', '169967'],
  ['cooked broccoli', '169967'],
  ['raw tomato', '170457'],
  ['tomato raw', '170457'],
  ['tomato', '170050'],
  ['tomatoes', '170050'],
  ['cooked tomato', '170050'],
  ['cooked tomatoes', '170050'],
  ['egg', '173424'],
  ['eggs', '173424'],
  ['salmon', '175168'],
  ['cooked salmon', '175168'],
  ['lettuce', '169247'],
  ['orange', '169097'],
  ['oranges', '169097'],
  ['tangerine', '169105'],
  ['tangerines', '169105'],
  ['mandarin', '169105'],
  ['mandarins', '169105'],
  ['grape', '174683'],
  ['grapes', '174683'],
  ['cantaloupe', '169092'],
  ['hami melon', '169092'],
  ['hard boiled egg', '173424'],
  ['egg hard boiled', '173424'],
  ['skinless chicken breast roasted', '171477'],
  ['roasted skinless chicken breast', '171477'],
]);

// A short personal menu, backed by specific local USDA records rather than
// whichever unrelated dish happens to contain the search word first.
const meatChoices = [
  { category: 'beef', id: '174034', label: 'Ground beef crumbles · 85/15 estimate' },
  { category: 'beef', id: '169484', label: 'Beef steak · cooked (general estimate)' },
  { category: 'beef', id: '167536', label: 'Beef jerky · formed (general estimate)' },
  { category: 'chicken', id: '172380', label: 'Chicken leg/thigh meat · roasted' },
  { category: 'chicken', id: '171477', label: 'Chicken breast meat · roasted' },
  { category: 'pork', id: '167887', label: 'Pork chop · pan-fried' },
  { category: 'pork', id: '173344', label: 'Pulled pork · BBQ sauce' },
  { category: 'pork', id: '174575', label: 'Pepperoni · beef & pork' },
  { category: 'pork', id: '168322', label: 'Bacon · pan-fried' },
  { category: 'pork', id: '174578', label: 'Pork sausage · pan-fried' },
];

const potatoChoices = [
  { category: 'potato', id: '170698', label: 'French fries · fried in oil' },
  { category: 'potato', id: '170093', label: 'Baked potato · plain' },
  { category: 'potato', id: '170440', label: 'Boiled potato · plain' },
];

export function meatSuggestions(query, catalogById) {
  const name = normalize(query);
  if (name.length < 2) return [];
  const words = name.split(' ');
  const requestedCategory = ['beef', 'chicken', 'pork'].includes(words[0]) ? words[0] : null;
  return meatChoices.flatMap(choice => {
    if (requestedCategory && choice.category !== requestedCategory) return [];
    const terms = normalize(`${choice.category} ${choice.label}`).split(' ');
    const food = catalogById.get(choice.id);
    return food && words.every(word => terms.some(term => term.startsWith(word)))
      ? [{ ...choice, food }]
      : [];
  });
}

export function foodSuggestions(query, catalogById) {
  const name = normalize(query);
  const words = name.split(' ');
  const potatoes = name.length < 2 ? [] : potatoChoices.flatMap(choice => {
    const terms = normalize(`potato potatoes ${choice.label}`).split(' ');
    const food = catalogById.get(choice.id);
    return food && words.every(word => terms.some(term => term.startsWith(word)))
      ? [{ ...choice, food }]
      : [];
  });
  return [...meatSuggestions(query, catalogById), ...potatoes];
}

export function resolveFood(query, catalog) {
  const name = normalize(query);
  if (!name) return { food: null, reason: 'empty' };

  const exact = catalog.filter(item => normalize(item.label) === name);
  if (exact.length === 1) return { food: exact[0], reason: null };
  if (exact.length > 1) return { food: null, reason: 'ambiguous' };

  const aliasId = aliases.get(name);
  if (aliasId) {
    const food = catalog.find(item => item.id === aliasId);
    if (food) return { food, reason: null };
  }

  const words = name.split(' ');
  const matches = catalog.filter(item => {
    const labelWords = new Set(normalize(item.label).split(' '));
    return words.every(word => labelWords.has(word));
  });
  if (matches.length === 1) return { food: matches[0], reason: null };
  return { food: null, reason: matches.length ? 'ambiguous' : 'not-found' };
}
