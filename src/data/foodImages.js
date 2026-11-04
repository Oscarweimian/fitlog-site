// Category illustrations only: never used to identify foods or calculate nutrition.
// AI images are bundled locally; review status is tracked in the manifest.
const photo = id => ({id,src:`/images/foods-ai-v1/${id}.webp`,position:'center',size:'cover'});
const derivative = /\b(juice|smoothie|oil|sauce|soup|broth|stock|jam|jelly|candy|candies|muffins?|cakes?|cookies?|crackers?|chips|flavou?red|extract|powder)\b/;
export function imageFor(label) {
  if(typeof label !== 'string') return null;
  let text=label.toLowerCase().normalize('NFKC').replace(/[–—-]/g,' ').replace(/\s+/g,' ').trim();
  // Match curated pork forms before the generic pork/sausage fallback.
  if(/^(?:snacks,\s*)?beef jerky\b/.test(text))return photo('beef');
  if(/^pulled pork(?: · bbq sauce| in barbecue sauce)?$/.test(text) ||
     /^pork chop(?: · pan fried)?$/.test(text) ||
     /^pork, fresh, loin, top loin \(chops\), boneless\b/.test(text))return photo('pulled-pork');
  if(/^pepperoni(?: · beef & pork|, beef and pork, sliced)?$/.test(text) ||
     /^bacon(?: · pan fried)?$/.test(text) ||
     /^pork, cured, bacon\b/.test(text))return photo('bacon');
  if(/^cream cake · whipped cream \(estimate\)$/.test(text))return photo('cream-cake');
  if(/^(?:french fries\b|fast foods, potato, french fried\b)/.test(text))return photo('potato');
  if(!text || derivative.test(text))return null;
  // Composite dishes take precedence over their meat/vegetable toppings.
  if(/^pizza rolls?\b/.test(text))return null;
  if(/^(?:pizza\b|fast food, pizza chain\b|pizza hut\b|domino's\b)/.test(text))return photo('pizza');
  if(/^(?:quesadilla|cheese quesadilla)\b/.test(text))return photo('quesadilla');
  if(/\b(burritos?|tortillas?)\b/.test(text))return photo('flatbread');
  if(/^(?:bread|white bread|bread · white \(plain\)|bread, white, commercially prepared \(includes soft bread crumbs\))$/.test(text))return photo('bread');
  if(/\b(bread|pie|pudding|yogurt|ice cream|sandwich|rolls?)\b/.test(text))return null;
  text=text.replace(/^(?:(?:fresh|raw|cooked|grilled|roasted|baked|boiled|steamed|fried|scrambled|hard boiled|soft boiled|sliced|diced|chopped|frozen|lean|ground|boneless|skinless)\s+)+/,'');
  if(/^(beef|steak)\b/.test(text))return photo('beef');
  if(/^chicken\b/.test(text) && /\b(breasts?|legs?|thighs?)\b/.test(text))return photo('chicken-breast');
  if(/^pork\b/.test(text) || (/^sausages?\b/.test(text) && (!/\b(turkey|chicken|beef|vegan|vegetarian)\b/.test(text) || /\bpork\b/.test(text))))return photo('pork-sausage');
  if(/^(?:fish,\s*)?salmon\b/.test(text))return photo('salmon');
  if(/^(?:fish,\s*)?cod\b/.test(text))return photo('cod');
  if(/^eggs?\b/.test(text) && !/\b(substitute|replacement|custard|noodles)\b/.test(text))return photo('eggs');
  if(/^broccoli\b/.test(text))return photo('broccoli');
  if(/^(?:(?:romaine|iceberg|butterhead|red leaf|green leaf|cos)\s+)?lettuce\b/.test(text))return photo('lettuce');
  if(/^(?:cherry\s+)?tomato(?:es)?\b/.test(text))return photo('tomato');
  if(/^potato(?:es)?\b/.test(text))return photo('potato');
  if(/^(blueberr(?:y|ies)|bananas?|oranges?|tangerines?|mandarins?|clementines?|hami melon|cantaloupes?|melons?|grapes?|fruit)\b/.test(text) && !/\b(chicken|beef|pork|fish|salmon)\b/.test(text))return photo('fruit');
  return null;
}
export function galleryFor(foods) {
  return [...new Map(foods.map(food=>{
    const image=imageFor(food.label);
    return [food.label,{...food,image,pendingImage:!image}];
  })).values()];
}
