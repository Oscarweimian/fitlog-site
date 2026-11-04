import { useEffect, useMemo, useState } from 'react';
import { resolveFood } from '../data/foodMatch.js';
import { createFoodBrowser, foodBrowserResults } from '../data/foodBrowse.js';
import FoodPicker from './FoodPicker.jsx';
let catalogPromise;
function loadCatalog() {
  if(!catalogPromise)catalogPromise=fetch('/data/usda-sr-2018-v1.json').then(response=>{if(!response.ok)throw new Error('Food database unavailable');return response.json();}).catch(error=>{catalogPromise=null;throw error;});
  return catalogPromise;
}
const blank = () => ({ id:crypto.randomUUID(), query:'', food:null, grams:'', caloriesOverride:'' });
export default function MealEditor({ meal, onSubmit }) {
  const maxEntries=meal.id==='lunch'?60:30;
  const [isOpen,setIsOpen]=useState(false);
  const [entries,setEntries]=useState(()=>meal.foods?.length ? meal.foods.map(f=>({id:crypto.randomUUID(),query:f.label,food:f,grams:f.grams,caloriesOverride:f.caloriesOverride??''})) : [blank()]);
  const [error,setError]=useState('');
  const [foods,setFoods]=useState([]);
  const [activeFoodId,setActiveFoodId]=useState(null);
  const browser=useMemo(()=>createFoodBrowser(foods),[foods]);
  useEffect(()=>{if(!isOpen)return;let active=true;loadCatalog().then(data=>{if(active)setFoods(data);}).catch(()=>{if(active)setError('Food database could not load. Close and reopen to retry.');});return ()=>{active=false;};},[isOpen]);
  const update=(id,patch)=>{setError('');setEntries(all=>all.map(e=>e.id===id?{...e,...patch}:e));};
  function save(event) {
    event.preventDefault();
    if(entries.some(e=>!e.query.trim())) {setError('Enter a food name for every row.');return;}
    if(entries.some(e=>e.caloriesOverride!=='' && e.caloriesOverride!=null && (!Number.isFinite(Number(e.caloriesOverride)) || Number(e.caloriesOverride)<0 || Number(e.caloriesOverride)>50000))) {
      setError('Enter calories from 0 to 50,000, or leave the field blank.');return;
    }
    if(!foods.length && entries.some(e=>!e.food)) {setError('Food database is loading. Please try saving again.');return;}
    const resolved=entries.map(e=>e.food?{food:e.food,reason:null}:resolveFood(e.query,foods));
    const unresolvedIndex=resolved.findIndex(item=>!item.food);
    if(unresolvedIndex!==-1) {
      const name=entries[unresolvedIndex].query.trim();
      const choices=foodBrowserResults(browser,{query:name,limit:1});
      if(choices.total)setActiveFoodId(entries[unresolvedIndex].id);
      setError(choices.total
        ? `Choose a specific food from the list for “${name}”.`
        : resolved[unresolvedIndex].reason==='ambiguous'
          ? `“${name}” matches multiple foods. Add the type and preparation so the nutrition can be calculated accurately.`
          : `No nutrition record found for “${name}”. Try a more specific name and preparation.`);
      return;
    }
    const result=entries.map((e,index)=>{
      const food=resolved[index].food;
      const record={...food,label:e.food?food.label:resolved[index].displayLabel||e.query.trim(),sourceLabel:food.sourceLabel||food.label,source:food.source||'USDA SR Legacy 2018',grams:Number(e.grams)};
      if(e.caloriesOverride!=='' && e.caloriesOverride!=null) record.caloriesOverride=Number(e.caloriesOverride);
      else delete record.caloriesOverride;
      return record;
    });
    if(result.some(f=>!Number.isFinite(f.grams)||f.grams<=0||f.grams>5000||['kcal','protein','carbs','fat'].some(k=>f[k]===''||!Number.isFinite(Number(f[k]))||f[k]<0||f[k]>(k==='kcal'?1000:100)))) {setError('Check weights and all four nutrition values.');return;}
    onSubmit({id:meal.id,name:meal.name,foods:result});setError('');setIsOpen(false);
  }
  return <article className={'meal-record '+(isOpen?'is-open':'')}>
    <button className="meal-row" type="button" onClick={()=>{setIsOpen(!isOpen);setActiveFoodId(null);}} aria-expanded={isOpen}>
      <span className="meal-name">{meal.name}</span><span className="meal-summary">{meal.summary}</span><span className="meal-calories">{meal.completed?`${Math.round(meal.calories)} kcal`:'Not logged'}</span><span className="row-action">{isOpen?'Collapse':meal.completed?'Edit':'Log'}</span>
    </button>
    {isOpen && <form className="meal-editor" onSubmit={save}>
      {entries.map(entry=>{
        return <section className="meal-entry" key={entry.id}>
          {entries.length>1 && <header className="meal-entry-heading"><button type="button" onClick={()=>setEntries(all=>all.filter(e=>e.id!==entry.id))}>Remove</button></header>}
          <div className="exact-grid food-entry-fields"><FoodPicker entry={entry} browser={browser} loaded={!!foods.length}
            active={activeFoodId===entry.id} onActivate={()=>setActiveFoodId(entry.id)} onClose={()=>setActiveFoodId(null)}
            onChange={query=>{update(entry.id,{query,food:null});setActiveFoodId(entry.id);}}
            onSelect={choice=>update(entry.id,{query:choice.label,food:{...choice.food,label:choice.label,sourceLabel:choice.food.sourceLabel||choice.food.label,source:choice.food.source||'USDA SR Legacy 2018'}})} />
          <label className="field"><span>Weight (g)</span><input required type="number" min="0.1" max="5000" step="0.1" value={entry.grams} onFocus={()=>setActiveFoodId(null)} onChange={e=>update(entry.id,{grams:e.target.value})}/></label>
          <label className="field"><span>Portion calories (kcal)</span><input type="number" min="0" max="50000" step="0.1" inputMode="decimal" placeholder="Optional" value={entry.caloriesOverride} onFocus={()=>setActiveFoodId(null)} onChange={e=>update(entry.id,{caloriesOverride:e.target.value})}/></label></div>
        </section>;
      })}
      <button className="add-food-entry" type="button" disabled={entries.length>=maxEntries} onClick={()=>setEntries(all=>[...all,blank()])}>＋ Add food</button>
      {error && <p role="alert">{error}</p>}
      <footer className="editor-footer"><button className="primary-action" type="submit">Save meal</button></footer>
    </form>}
  </article>;
}
