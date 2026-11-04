import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CREAM_CAKE_ID, DEEP_FRIED_COD_ID, PAN_FRIED_COD_ID, PAN_FRIED_SALMON_ID, createFoodBrowser, foodBrowserResults } from '../src/data/foodBrowse.js';

const catalog = JSON.parse(readFileSync(new URL('../public/data/usda-sr-2018-v1.json', import.meta.url), 'utf8'));
const browser = createFoodBrowser(catalog);

test('food picker contains only the previously requested foods', () => {
  assert.equal(browser.records.length, 32);
  assert.equal(browser.categories.find(category => category.id === 'all').count, 32);
  assert.deepEqual(browser.categories.filter(category => category.id !== 'all').map(category => category.count), [3, 2, 5, 3, 3, 4, 2, 6, 4]);
  const estimates = [CREAM_CAKE_ID, PAN_FRIED_COD_ID, DEEP_FRIED_COD_ID, PAN_FRIED_SALMON_ID];
  assert.ok(browser.records.every(choice => estimates.includes(choice.id) || catalog.some(food => food.id === choice.id)));
  assert.equal(browser.records.some(choice => /bagel|kfc/i.test(choice.label)), false);
  assert.equal(browser.records.filter(choice => /restaurant/i.test(choice.label)).every(choice => choice.id === '169035'), true);
});

test('typing beef, chicken, pork and potato only offers the agreed choices', () => {
  assert.deepEqual(foodBrowserResults(browser, { query: 'beef' }).items.map(choice => choice.id), ['174034', '169484', '167536']);
  assert.deepEqual(foodBrowserResults(browser, { query: 'chicken' }).items.map(choice => choice.id), ['172380', '171477']);
  assert.deepEqual(foodBrowserResults(browser, { query: 'pork' }).items.map(choice => choice.id), ['167887', '173344', '174575', '168322', '174578']);
  assert.deepEqual(foodBrowserResults(browser, { query: 'potato' }).items.map(choice => choice.id), ['170698', '170093', '170440']);
});

test('typing filters the small personal menu and categories allow direct selection', () => {
  assert.equal(foodBrowserResults(browser, { query: 'chicken breast' }).items[0].label, 'Chicken breast meat · roasted');
  assert.equal(foodBrowserResults(browser, { query: 'mandarin' }).items[0].label, 'Tangerine · raw');
  assert.equal(foodBrowserResults(browser, { query: 'bread' }).items[0].label, 'Bread · white (plain)');
  assert.equal(foodBrowserResults(browser, { query: 'cake' }).items[0].label, 'Cream cake · whipped cream (estimate)');
  assert.deepEqual(foodBrowserResults(browser, { category: 'bread' }).items.map(choice => choice.id), ['174924', CREAM_CAKE_ID, '173292', '169035']);
  assert.deepEqual(foodBrowserResults(browser, { query: 'pizza' }).items.map(choice => choice.id), ['173292']);
  assert.deepEqual(foodBrowserResults(browser, { query: 'quesadilla' }).items.map(choice => choice.id), ['169035']);
  assert.equal(foodBrowserResults(browser, { query: 'broccoli' }).items[0].label, 'Broccoli · cooked');
  assert.deepEqual(foodBrowserResults(browser, { query: 'egg' }).items.map(choice => choice.id), ['173424', '173423']);
  assert.deepEqual(foodBrowserResults(browser, { query: 'fried egg' }).items.map(choice => choice.id), ['173423']);
  assert.deepEqual(foodBrowserResults(browser, { category: 'fish' }).items.map(choice => choice.id), [PAN_FRIED_COD_ID, DEEP_FRIED_COD_ID, '175167', PAN_FRIED_SALMON_ID]);
  assert.deepEqual(foodBrowserResults(browser, { category: 'eggs' }).items.map(choice => choice.id), ['173424', '173423']);
  assert.deepEqual(foodBrowserResults(browser, { query: 'cod' }).items.map(choice => choice.id), [PAN_FRIED_COD_ID, DEEP_FRIED_COD_ID]);
  assert.deepEqual(foodBrowserResults(browser, { query: 'salmon' }).items.map(choice => choice.id), ['175167', PAN_FRIED_SALMON_ID]);
  assert.equal(foodBrowserResults(browser, { query: 'banana bread' }).total, 0);
  assert.equal(foodBrowserResults(browser, { category: 'fruit' }).total, 6);
});

test('pan-fried fish and deep-fried cod disclose their nutrition estimates', () => {
  const oil = catalog.find(food => food.id === '171413');
  for (const [id, fishId] of [[PAN_FRIED_COD_ID, '171956'], [PAN_FRIED_SALMON_ID, '175168']]) {
    const food = browser.records.find(choice => choice.id === id).food;
    const fish = catalog.find(item => item.id === fishId);
    for (const nutrient of ['kcal', 'protein', 'carbs', 'fat', 'fiber', 'sodium'])
      assert.equal(food[nutrient], Number((fish[nutrient] * 0.95 + oil[nutrient] * 0.05).toFixed(3)));
    assert.match(food.sourceLabel, /95% Fish, .+ \+ 5% Oil, olive/);
  }
  const cod = browser.records.find(choice => choice.id === DEEP_FRIED_COD_ID).food;
  const friedFish = catalog.find(food => food.id === '169846');
  assert.equal(cod.kcal, friedFish.kcal);
  assert.match(cod.sourceLabel, /generic fish reference; cod-specific data unavailable/);
});

test('cream cake uses a declared sponge and whipped cream estimate', () => {
  const cake = browser.records.find(choice => choice.id === CREAM_CAKE_ID).food;
  const sponge = catalog.find(food => food.id === '172706');
  const cream = catalog.find(food => food.id === '170860');
  for (const nutrient of ['kcal', 'protein', 'carbs', 'fat', 'fiber', 'sodium']) {
    assert.equal(cake[nutrient], Number((sponge[nutrient] * 0.7 + cream[nutrient] * 0.3).toFixed(3)));
  }
  assert.match(cake.sourceLabel, /70% Cake, sponge.*30% Cream, whipped/);
});
