import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { foodSuggestions, meatSuggestions } from '../src/data/foodMatch.js';
import { imageFor } from '../src/data/foodImages.js';

const catalog = JSON.parse(readFileSync(new URL('../public/data/usda-sr-2018-v1.json', import.meta.url), 'utf8'));
const byId = new Map(catalog.map(food => [food.id, food]));

test('broad meat names offer only the foods the user actually records', () => {
  assert.deepEqual(meatSuggestions('beef', byId).map(choice => choice.id), ['174034', '169484', '167536']);
  assert.deepEqual(meatSuggestions('chicken', byId).map(choice => choice.id), ['172380', '171477']);
  assert.deepEqual(meatSuggestions('pork', byId).map(choice => choice.id), ['167887', '173344', '174575', '168322', '174578']);
});

test('more specific words narrow the choices without adding restaurant meals', () => {
  assert.deepEqual(meatSuggestions('beef jerky', byId).map(choice => choice.id), ['167536']);
  assert.deepEqual(meatSuggestions('pork bacon', byId).map(choice => choice.id), ['168322']);
  assert.deepEqual(meatSuggestions('chicken breast', byId).map(choice => choice.id), ['171477']);
  assert.equal(meatSuggestions('beef tortilla', byId).length, 0);
});

test('all curated meats have source nutrients and reuse one image per meat category', () => {
  for (const [query, image] of [['beef', 'beef.webp'], ['chicken', 'chicken-breast.webp'], ['pork', 'pork-sausage.webp']]) {
    for (const choice of meatSuggestions(query, byId)) {
      assert.equal(typeof choice.food.kcal, 'number');
      assert.equal(imageFor(choice.label)?.src, `/images/foods-ai-v1/${image}`);
      assert.equal(imageFor(choice.food.label)?.src, `/images/foods-ai-v1/${image}`);
    }
  }
});

test('potatoes offer only fries, baked and boiled while sharing the existing potato image', () => {
  const expected = ['170698', '170093', '170440'];
  for (const query of ['potato', 'potatoes']) {
    const choices = foodSuggestions(query, byId);
    assert.deepEqual(choices.map(choice => choice.id), expected);
    for (const choice of choices) {
      assert.equal(imageFor(choice.label)?.id, 'potato');
      assert.equal(imageFor(choice.food.label)?.id, 'potato');
    }
  }
  assert.equal(foodSuggestions('broccoli', byId).length, 0);
});
