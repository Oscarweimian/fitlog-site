import { useState } from 'react';
import { foodBrowserResults } from '../data/foodBrowse.js';

const PAGE_SIZE = 40;

export default function FoodPicker({ entry, browser, loaded, active, onActivate, onClose, onChange, onSelect }) {
  const [category, setCategory] = useState(null);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const query = entry.query.trim();
  const results = loaded && (query || category)
    ? foodBrowserResults(browser, { query, category, limit })
    : null;
  const menuId = `food-choices-${entry.id}`;
  const inputId = `food-name-${entry.id}`;
  const select = choice => { onSelect(choice); onClose(); };

  const handleInputKeyDown = event => {
    if (event.key === 'Escape') { onClose(); return; }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      onActivate();
      requestAnimationFrame(() => document.getElementById(menuId)?.querySelector('.food-choice-option')?.focus());
    }
  };

  const handleMenuKeyDown = event => {
    if (event.key === 'Escape') { event.preventDefault(); onClose(); document.getElementById(inputId)?.focus(); return; }
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    const options = [...event.currentTarget.querySelectorAll('.food-choice-option')];
    const index = options.indexOf(document.activeElement);
    const next = event.key === 'ArrowDown' ? index + 1 : index - 1;
    if (options[next]) { event.preventDefault(); options[next].focus(); }
  };

  return <div className="field food-name-field" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) onClose(); }}>
    <label htmlFor={inputId}>Food name</label>
    <div className="food-name-input-row">
      <input id={inputId} required maxLength="160" value={entry.query} onFocus={onActivate}
        onKeyDown={handleInputKeyDown} onChange={event => { onChange(event.target.value); setCategory(null); setLimit(PAGE_SIZE); }}
        placeholder="Search or choose a food" aria-expanded={active} aria-controls={active ? menuId : undefined}
        aria-autocomplete="list" role="combobox" />
      <button type="button" className="food-browse-toggle" aria-label={active ? 'Close food menu' : 'Browse foods'}
        aria-expanded={active} aria-controls={active ? menuId : undefined} onClick={() => active ? onClose() : onActivate()}>
        <span aria-hidden="true">⌄</span>
      </button>
    </div>
    {active && <div id={menuId} className="food-choice-list" aria-label="Food choices" onKeyDown={handleMenuKeyDown}>
      {!loaded ? <p className="food-choice-status">Loading foods…</p>
        : !query && !category ? <>
          <p className="food-choice-meta">Browse {browser.records.length.toLocaleString('en-US')} foods by category</p>
          <div className="food-category-grid">{browser.categories.map(item =>
            <button key={item.id} type="button" onClick={() => { setCategory(item.id); setLimit(PAGE_SIZE); }}>
              <span>{item.label}</span><small>{item.count.toLocaleString('en-US')}</small>
            </button>
          )}</div>
        </> : <>
          <div className="food-choice-heading">
            {!query && <button type="button" className="food-category-back" onClick={() => setCategory(null)}>← Categories</button>}
            <span>{query ? `${results.total.toLocaleString('en-US')} matches` : `${browser.categories.find(item => item.id === category)?.label} · ${results.total.toLocaleString('en-US')}`}</span>
          </div>
          {results.items.length ? <div className="food-choice-options" role="listbox" aria-label="Matching foods">
            {results.items.map(choice => <button key={choice.key} type="button" className="food-choice-option" role="option" aria-selected={false}
              title={choice.food.label} onClick={() => select(choice)}>
              <span>{choice.label}</span><small>{Math.round(choice.food.kcal)} kcal / 100 g</small>
            </button>)}
          </div> : <p className="food-choice-status">No matching food. Try another name.</p>}
          {results.total > results.items.length && <button type="button" className="food-choice-more" onClick={() => setLimit(current => current + PAGE_SIZE)}>
            Show more · {results.total - results.items.length} remaining
          </button>}
        </>}
    </div>}
  </div>;
}
