import test from 'node:test';
import assert from 'node:assert/strict';
import { quotes, nextQuoteIndex } from '../src/data/quotes.js';

test('all 50 approved quotes are distinct, complete, and sourced', () => {
  assert.equal(quotes.length, 50);
  assert.equal(new Set(quotes.map(q => q.id)).size, 50);
  assert.equal(new Set(quotes.map(q => q.text)).size, 50);
  for (const quote of quotes) {
    for (const field of ['id', 'text', 'author', 'work', 'sourceUrl', 'wording']) {
      assert.ok(quote[field]?.trim(), `${quote.id}: missing ${field}`);
    }
    assert.equal(new URL(quote.sourceUrl).protocol, 'https:');
    assert.ok(!/[\u3400-\u9fff]/u.test(quote.text + quote.author + quote.work));
  }
});

test('adaptations and original excerpts retain their approved labels and context', () => {
  assert.ok(quotes.slice(0, 30).every(q => q.wording === 'English adaptation'));
  assert.ok(quotes.slice(30).every(q => q.wording === 'English original excerpt'));
  assert.match(quotes.find(q => q.id === 'douglass-progress').context, /freedom and equality/);
  assert.match(quotes[0].sourceUrl, /216/);
  assert.match(quotes[49].sourceUrl, /if---/);
});

test('Next quote visits every entry exactly once before wrapping', () => {
  const visited = [];
  let index = 0;
  for (let step = 0; step < quotes.length; step++) {
    visited.push(quotes[index].id);
    index = nextQuoteIndex(index);
  }
  assert.equal(new Set(visited).size, 50);
  assert.equal(index, 0);
});
