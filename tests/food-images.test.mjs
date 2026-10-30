import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { imageFor, galleryFor } from '../src/data/foodImages.js';

test('only the approved AI set is active', () => {
  assert.equal(imageFor('Beef')?.src,'/images/foods-ai-v1/beef.webp');
  assert.equal(imageFor('Bananas, raw')?.src,'/images/foods-ai-v1/fruit.webp');
  assert.equal(imageFor('Chicken, breast, roasted')?.src,'/images/foods-ai-v1/chicken-breast.webp');
});

test('requested English food names map to local photo categories', () => {
  for (const [name,id] of [
    ['Beef','beef'],['grilled beef steak','beef'],['Chicken breast','chicken-breast'],
    ['Pork','pork-sausage'],['Pork sausage','pork-sausage'],['Sausages','pork-sausage'],
    ['Salmon','salmon'],['Eggs','eggs'],['Scrambled eggs','eggs'],['Broccoli','broccoli'],
    ['Romaine lettuce','lettuce'],['Tomatoes','tomato'],['Boiled potatoes','potato']
  ]) assert.equal(imageFor(name)?.id,id,name);
});

test('USDA names and preparation punctuation map without changing nutrition', () => {
  for (const [name,id] of [
    ['Beef, loin, cooked, grilled','beef'],
    ['Chicken, broilers or fryers, breast, meat only, cooked, roasted','chicken-breast'],
    ['Sausage, pork, cooked','pork-sausage'],['Fish, salmon, Atlantic, farmed, cooked, dry heat','salmon'],
    ['Egg, whole, cooked, hard-boiled','eggs'],['Broccoli, frozen, cooked, boiled','broccoli'],
    ['Lettuce, cos or romaine, raw','lettuce'],['Tomatoes, red, ripe, raw','tomato'],['Potatoes, flesh and skin, boiled','potato']
  ]) assert.equal(imageFor(name)?.id,id,name);
  const food={label:'Egg, whole, raw, fresh',grams:100,kcal:143,protein:12.6};
  assert.equal(galleryFor([food])[0].kcal,143);
  assert.equal(food.image,undefined);
});

test('listed fruit names share one image, not individual network requests', () => {
  for(const name of ['Blueberries','Banana','Oranges','Tangerines, (mandarin oranges), raw','Hami melon','Melons, cantaloupe, raw','Grapes, red or green (European type), raw','Fruit salad','blueberry','mandarin'])
    assert.equal(imageFor(name)?.src,'/images/foods-ai-v1/fruit.webp',name);
});

test('pizza and burritos share a single representative image, ahead of toppings', () => {
  for(const name of ['Pizza','Mexican burrito','Tortillas, ready-to-bake or -fry, flour','TACO BELL, BURRITO SUPREME with beef','Fast Food, Pizza Chain, 14" pizza, sausage topping, thin crust'])
    assert.equal(imageFor(name)?.src,'/images/foods-ai-v1/flatbread.webp',name);
});

test('unrelated foods and misleading substrings keep the neutral placeholder', () => {
  for(const name of ['',null,'Rice','Eggplant','Grapefruit juice','Orange chicken','Banana bread','Blueberry muffin','Tomato sauce','Salmon oil','Turkey sausage','Tortilla chips','Pizza flavored crackers','Sweet potatoes'])
    assert.equal(imageFor(name),null,String(name));
  const rows=galleryFor([{label:'Rice'},{label:'Beef'},{label:'Beef'}]);
  assert.equal(rows.length,2);
  assert.equal(rows[0].pendingImage,true);
  assert.equal(rows[1].pendingImage,false);
});

test('all eleven approved AI images are bundled WebPs with provenance', () => {
  const records=JSON.parse(fs.readFileSync('public/images/foods-ai-v1/manifest.json','utf8'));
  assert.equal(records.length,11);
  for(const photo of records){
    assert.match(photo.src,/^\/images\/foods-ai-v1\/[a-z-]+\.webp$/);
    const bytes=fs.readFileSync(`public${photo.src}`);
    assert.equal(bytes.toString('ascii',0,4),'RIFF');
    assert.equal(bytes.toString('ascii',8,12),'WEBP');
    assert.equal(bytes.length,photo.bytes);
    assert.equal(photo.approved,true);
    assert.equal(photo.source,'AI-generated with OpenAI ImageGen');
    assert.ok(photo.generatedFile && photo.width && photo.height);
  }
});
