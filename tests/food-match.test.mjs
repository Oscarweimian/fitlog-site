import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveFood } from '../src/data/foodMatch.js';
import { sumNutrition } from '../src/data/journal.js';

const catalog = JSON.parse(readFileSync(new URL('../public/data/usda-sr-2018-v1.json', import.meta.url), 'utf8'));

test('a broad food name is not silently assigned arbitrary nutrition', () => {
  assert.equal(resolveFood('beef', catalog).reason, 'ambiguous');
  assert.equal(resolveFood('chicken breast', catalog).reason, 'ambiguous');
});

test('clear everyday names and full catalog names resolve to their exact record', () => {
  assert.equal(resolveFood('banana', catalog).food?.id, '173944');
  assert.equal(resolveFood('skinless chicken breast roasted', catalog).food?.id, '171477');
  assert.equal(resolveFood('Egg, whole, cooked, hard-boiled', catalog).food?.id, '173424');
});

test('plain produce and proteins use the agreed cooked or fresh reference records', () => {
  for (const [query, id] of [
    ['broccoli', '169967'], ['tomato', '170050'], ['tomatoes', '170050'],
    ['egg', '173424'], ['eggs', '173424'], ['salmon', '175168'],
    ['lettuce', '169247'], ['orange', '169097'], ['tangerine', '169105'],
    ['banana', '173944'], ['blueberry', '171711'], ['grapes', '174683'],
    ['cantaloupe', '169092'], ['hami melon', '169092'],
  ]) assert.equal(resolveFood(query, catalog).food?.id, id, query);
  const broccoli = resolveFood('broccoli', catalog).food;
  assert.deepEqual(sumNutrition([{foods:[{...broccoli, grams:20}]}]), {
    calories:7, protein:0.5, carbs:1.4, fat:0.1, fiber:0.7, sodium:8.2,
  });
});

test('specific preparations still override the plain-name defaults', () => {
  assert.equal(resolveFood('Broccoli, raw', catalog).food?.id, '170379');
  assert.equal(resolveFood('Egg, whole, cooked, fried', catalog).food?.id, '173423');
  assert.equal(resolveFood('Fish, salmon, sockeye, cooked, dry heat', catalog).food?.id, '173692');
  assert.equal(resolveFood('pizza', catalog).reason, 'ambiguous');
  assert.equal(resolveFood('burrito', catalog).reason, 'ambiguous');
});

test('unknown names never produce guessed nutrition', () => {
  assert.equal(resolveFood('mystery smoothie', catalog).reason, 'not-found');
});
