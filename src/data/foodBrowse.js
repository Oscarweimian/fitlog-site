import { meatChoices, potatoChoices } from './foodMatch.js';

export const CREAM_CAKE_ID = 'cream-cake-estimate';
export const PAN_FRIED_COD_ID = 'cod-pan-fried-estimate';
export const DEEP_FRIED_COD_ID = 'cod-deep-fried-estimate';
export const PAN_FRIED_SALMON_ID = 'salmon-pan-fried-estimate';

// The menu contains only foods the user has chosen for this FitLog. The USDA
// catalog remains the source of nutrition values, not a browsing list.
export const foodCategories = [
  { id: 'all', label: 'All foods' },
  { id: 'beef', label: 'Beef' },
  { id: 'chicken', label: 'Chicken' },
  { id: 'pork', label: 'Pork' },
  { id: 'potato', label: 'Potato' },
  { id: 'vegetables', label: 'Vegetables' },
  { id: 'fish', label: 'Fish' },
  { id: 'eggs', label: 'Eggs' },
  { id: 'fruit', label: 'Fruit' },
  { id: 'bread', label: 'Bread' },
];

const choices = [
  ...meatChoices.map(choice => ({ ...choice, keywords: choice.category === 'beef' && choice.id === '174034' ? 'minced beef beef mince ground beef' : '' })),
  ...potatoChoices.map(choice => ({ ...choice, keywords: 'potatoes potato' })),
  { id: '169967', label: 'Broccoli · cooked', category: 'vegetables' },
  { id: '170050', label: 'Tomato · cooked', category: 'vegetables', keywords: 'tomatoes' },
  { id: '169247', label: 'Lettuce · raw', category: 'vegetables' },
  { id: PAN_FRIED_COD_ID, label: 'Cod · pan-fried (estimate)', category: 'fish', keywords: 'fried cod' },
  { id: DEEP_FRIED_COD_ID, label: 'Cod · deep-fried, battered (fish estimate)', category: 'fish', keywords: 'fried cod' },
  { id: '175167', label: 'Salmon · raw', category: 'fish' },
  { id: PAN_FRIED_SALMON_ID, label: 'Salmon · pan-fried (estimate)', category: 'fish', keywords: 'fried salmon' },
  { id: '173424', label: 'Boiled egg · hard-boiled', category: 'eggs', keywords: 'eggs boiled egg' },
  { id: '173423', label: 'Fried egg · pan-fried', category: 'eggs', keywords: 'eggs fried egg' },
  { id: '173944', label: 'Banana · raw', category: 'fruit', keywords: 'bananas' },
  { id: '171711', label: 'Blueberries · raw', category: 'fruit', keywords: 'blueberry' },
  { id: '169097', label: 'Orange · raw', category: 'fruit', keywords: 'oranges' },
  { id: '169105', label: 'Tangerine · raw', category: 'fruit', keywords: 'mandarin mandarins tangerines' },
  { id: '174683', label: 'Grapes · raw', category: 'fruit', keywords: 'grape' },
  { id: '169092', label: 'Cantaloupe · raw', category: 'fruit', keywords: 'hami melon' },
  { id: '174924', label: 'Bread · white (plain)', category: 'bread', keywords: 'white bread' },
  { id: CREAM_CAKE_ID, label: 'Cream cake · whipped cream (estimate)', category: 'bread', keywords: 'cake cream cake sponge cake' },
  { id: '173292', label: 'Pizza · cheese, regular crust (fast-food estimate)', category: 'bread', keywords: 'cheese pizza' },
  { id: '169035', label: 'Quesadilla · cheese (restaurant estimate)', category: 'bread', keywords: 'cheese quesadilla' },
];

const normalize = value => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');

export function createFoodBrowser(catalog) {
  const byId = new Map(catalog.map(food => [food.id, food]));
  const oliveOil = byId.get('171413');
  const panFried = (id, label, fishId) => {
    const fish = byId.get(fishId);
    if (!fish || !oliveOil) return;
    const mix = key => Number((fish[key] * 0.95 + oliveOil[key] * 0.05).toFixed(3));
    byId.set(id, {
      id, label,
      sourceLabel: `95% ${fish.label} + 5% ${oliveOil.label} (estimated retained oil)`,
      source: 'Estimate from USDA SR Legacy 2018 ingredients',
      kcal: mix('kcal'), protein: mix('protein'), carbs: mix('carbs'), fat: mix('fat'),
      fiber: mix('fiber'), sodium: mix('sodium'),
    });
  };
  panFried(PAN_FRIED_COD_ID, 'Cod · pan-fried (estimate)', '171956');
  panFried(PAN_FRIED_SALMON_ID, 'Salmon · pan-fried (estimate)', '175168');
  const friedFish = byId.get('169846');
  if (friedFish) byId.set(DEEP_FRIED_COD_ID, {
    ...friedFish, id: DEEP_FRIED_COD_ID,
    label: 'Cod · deep-fried, battered (fish estimate)',
    sourceLabel: `${friedFish.label} (generic fish reference; cod-specific data unavailable)`,
    source: 'Estimate from USDA SR Legacy 2018 generic fried fish',
  });
  const sponge = byId.get('172706');
  const whippedCream = byId.get('170860');
  if (sponge && whippedCream) {
    const mix = key => Number((sponge[key] * 0.7 + whippedCream[key] * 0.3).toFixed(3));
    byId.set(CREAM_CAKE_ID, {
      id: CREAM_CAKE_ID,
      label: 'Cream cake · whipped cream (estimate)',
      sourceLabel: '70% Cake, sponge, commercially prepared + 30% Cream, whipped, cream topping, pressurized',
      source: 'Estimate from USDA SR Legacy 2018 ingredients',
      kcal: mix('kcal'), protein: mix('protein'), carbs: mix('carbs'), fat: mix('fat'),
      fiber: mix('fiber'), sodium: mix('sodium'),
    });
  }
  const records = choices.flatMap((choice, order) => {
    const food = byId.get(choice.id);
    return food ? [{ ...choice, key: `choice-${choice.id}`, food, order, normalized: normalize(`${choice.label} ${choice.keywords || ''}`) }] : [];
  });
  const grouped = Object.fromEntries(foodCategories.map(({ id }) => [id, id === 'all' ? records : records.filter(choice => choice.category === id)]));
  return { records, grouped, categories: foodCategories.map(category => ({ ...category, count: grouped[category.id].length })) };
}

export function foodBrowserResults(browser, { query = '', category = 'all', limit = 40 } = {}) {
  const term = normalize(query);
  if (!term) {
    const items = browser.grouped[category] || browser.grouped.all;
    return { items: items.slice(0, limit), total: items.length };
  }
  const categoryMatch = browser.grouped[term];
  if (categoryMatch) return { items: categoryMatch.slice(0, limit), total: categoryMatch.length };
  const words = term.split(' ');
  const matches = browser.records.filter(choice => words.every(word => choice.normalized.split(' ').some(part => part.startsWith(word))));
  return { items: matches.slice(0, limit), total: matches.length };
}
