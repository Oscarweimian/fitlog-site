import { useMemo, useState } from 'react';
import { drinkOptions } from '../data/journal';

function drinkSummary(entry) {
  if (entry.type === 'Protein powder') return ['Protein powder', entry.scoops ? `${entry.scoops} scoops` : '', entry.amount ? `${entry.amount} mL` : ''].filter(Boolean).join(' · ');
  return [entry.type || 'Drink', entry.amount ? `${entry.amount} mL` : ''].filter(Boolean).join(' ');
}

const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== '';
const validAmount = (value, max) => hasValue(value) && Number.isFinite(Number(value)) && Number(value) > 0 && Number(value) <= max;

export function prepareDrinkEntries(draft) {
  const saved = [];
  draft.forEach((entry, index) => {
    const row = index + 1;
    if (!['type', 'amount', 'scoops', 'proteinPerScoop', 'caloriesPerScoop'].some((key) => hasValue(entry[key]))) return;
    if (!entry.type) throw new Error(`Choose a drink for row ${row}.`);
    if (entry.type === 'Protein powder') {
      if (!validAmount(entry.scoops, 20)) throw new Error(`Enter scoops for row ${row}.`);
      if (!validAmount(entry.proteinPerScoop, 100)) throw new Error(`Enter protein per scoop for row ${row}.`);
      if (!validAmount(entry.caloriesPerScoop, 1000)) throw new Error(`Enter calories per scoop for row ${row}.`);
      if (!validAmount(entry.amount, 5000)) throw new Error(`Enter water for row ${row}.`);
    } else if (!validAmount(entry.amount, 5000)) {
      throw new Error(`Enter milliliters for row ${row}.`);
    }
    saved.push(entry);
  });
  return saved;
}

export default function WaterEditor({ entries, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(entries);
  const [error, setError] = useState('');
  const total = useMemo(() => entries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0), [entries]);
  const summary = entries.length ? entries.map(drinkSummary).join(' · ') : 'Not logged';

  const updateEntry = (id, patch) => { setError(''); setDraft(all => all.map((entry) => entry.id === id ? { ...entry, ...patch } : entry)); };
  const selectDrink = (id, type) => { setError(''); setDraft(all => all.map((entry) => {
    if (entry.id !== id || entry.type === type) return entry;
    const { nutrients, inMeals, scoops, proteinPerScoop, caloriesPerScoop, ...rest } = entry;
    const amount = entry.type === 'Protein powder' || type === 'Protein powder' ? '' : entry.amount;
    return type === 'Protein powder' ? { ...rest, type, amount, scoops: '', proteinPerScoop: '', caloriesPerScoop: '' } : { ...rest, type, amount };
  })); };
  const updateNumber = (id, key, value, max) => {
    if (value === '' || Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= max) updateEntry(id, { [key]: value });
  };
  const addEntry = () => { setError(''); setDraft(all => all.concat({ id: 'water-' + Date.now() + '-' + all.length, type: '', amount: '' })); };
  const removeEntry = (id) => { setError(''); setDraft(all => all.filter((entry) => entry.id !== id)); };
  const save = (event) => {
    event.preventDefault();
    try {
      const saved = prepareDrinkEntries(draft);
      onChange(saved);
      setDraft(saved);
      setError('');
      setIsOpen(false);
    } catch (problem) {
      setError(problem.message);
    }
  };

  return (
    <article className={'meal-record water-record ' + (isOpen ? 'is-open' : '')}>
      <button className="meal-row" type="button" onClick={() => setIsOpen(!isOpen)} aria-expanded={isOpen}>
        <span className="meal-name">Hydration</span>
        <span className="meal-summary">{summary}</span>
        <span className="meal-calories">{total} mL</span>
        <span className="row-action">{isOpen ? 'Collapse' : entries.length ? 'Edit' : 'Log'}</span>
      </button>

      {isOpen && <form className="water-editor" onSubmit={save}>
        <div className="water-entry-list">
          {draft.map((entry, index) => <div className={'water-entry' + (entry.type === 'Protein powder' ? ' water-entry--powder' : '')} key={entry.id}>
            <span className="water-entry-index">{index + 1}</span>
            <label className="field"><span>Drink</span><select value={entry.type} onChange={(event) => selectDrink(entry.id, event.target.value)}>
              <option value="" disabled>Select drink</option>
              {entry.type && !drinkOptions.includes(entry.type) && <option value={entry.type}>{entry.type} (saved)</option>}
              {drinkOptions.map((drink) => <option value={drink} key={drink}>{drink}</option>)}
            </select></label>
            {entry.type === 'Protein powder' ? <div className="water-powder-fields">
              <label className="field"><span>Scoops</span><input type="number" min="0" max="20" step="0.25" value={entry.scoops ?? ''} onChange={(event) => updateNumber(entry.id, 'scoops', event.target.value, 20)} inputMode="decimal" /></label>
              <label className="field"><span>Protein per scoop (g)</span><input type="number" min="0" max="100" step="0.1" value={entry.proteinPerScoop ?? ''} onChange={(event) => updateNumber(entry.id, 'proteinPerScoop', event.target.value, 100)} inputMode="decimal" /></label>
              <label className="field"><span>Calories per scoop (kcal)</span><input type="number" min="0" max="1000" step="1" value={entry.caloriesPerScoop ?? ''} onChange={(event) => updateNumber(entry.id, 'caloriesPerScoop', event.target.value, 1000)} inputMode="decimal" /></label>
              <label className="field"><span>Water (mL)</span><input type="number" min="0" max="5000" step="1" value={entry.amount} onChange={(event) => updateNumber(entry.id, 'amount', event.target.value, 5000)} inputMode="numeric" /></label>
            </div> : <label className="field"><span>Milliliters</span><input type="number" min="0" max="5000" step="1" value={entry.amount} onChange={(event) => updateNumber(entry.id, 'amount', event.target.value, 5000)} inputMode="numeric" placeholder="e.g. 350" /></label>}
            <button type="button" className="remove-water-entry" onClick={() => removeEntry(entry.id)} aria-label={'Remove drink ' + (index + 1)}>Remove</button>
          </div>)}
        </div>
        <button type="button" className="add-food-entry add-water-entry" onClick={addEntry}>＋ Add drink</button>
        {error && <p role="alert">{error}</p>}
        <footer className="editor-footer"><button className="primary-action" type="submit">Save drinks</button></footer>
      </form>}
    </article>
  );
}
