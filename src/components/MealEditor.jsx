import { useEffect, useMemo, useState } from 'react';
import { foodSuggestions, resolveFood } from '../data/foodMatch.js';
let catalogPromise;
function loadCatalog() {
  if(!catalogPromise)catalogPromise=fetch('/data/usda-sr-2018-v1.json').then(response=>{if(!response.ok)throw new Error('Food database unavailable');return response.json();}).catch(error=>{catalogPromise=null;throw error;});
  return catalogPromise;
}
const blank = () => ({ id:crypto.randomUUID(), query:'', food:null, grams:'' });
export default function MealEditor({ meal, onSubmit }) {
  const maxEntries=meal.id==='lunch'?60:30;
  const [isOpen,setIsOpen]=useState(false);
  const [entries,setEntries]=useState(()=>meal.foods?.length ? meal.foods.map(f=>({id:crypto.randomUUID(),query:f.label,food:f,grams:f.grams})) : [blank()]);
  const [error,setError]=useState('');
  const [foods,setFoods]=useState([]);
  const [activeFoodId,setActiveFoodId]=useState(null);
  const foodById=useMemo(()=>new Map(foods.map(food=>[food.id,food])),[foods]);
  useEffect(()=>{if(!isOpen)return;let active=true;loadCatalog().then(data=>{if(active)setFoods(data);}).catch(()=>{if(active)setError('Food database could not load. Close and reopen to retry.');});return ()=>{active=false;};},[isOpen]);
  const update=(id,patch)=>{setError('');setEntries(all=>all.map(e=>e.id===id?{...e,...patch}:e));};
  function save(event) {
    event.preventDefault();
    if(entries.some(e=>!e.query.trim())) {setError('Enter a food name for every row.');return;}
    if(!foods.length && entries.some(e=>!e.food)) {setError('Food database is loading. Please try saving again.');return;}
    const resolved=entries.map(e=>e.food?{food:e.food,reason:null}:resolveFood(e.query,foods));
    const unresolvedIndex=resolved.findIndex(item=>!item.food);
    if(unresolvedIndex!==-1) {
      const name=entries[unresolvedIndex].query.trim();
      const choices=foodSuggestions(name,foodById);
      if(choices.length)setActiveFoodId(entries[unresolvedIndex].id);
      setError(choices.length
        ? `Choose a specific food from the list for “${name}”.`
        : resolved[unresolvedIndex].reason==='ambiguous'
          ? `“${name}” matches multiple foods. Add the type and preparation so the nutrition can be calculated accurately.`
          : `No nutrition record found for “${name}”. Try a more specific name and preparation.`);
      return;
    }
    const result=entries.map((e,index)=>{
      const food=resolved[index].food;
      return {...food,label:e.food?food.label:e.query.trim(),sourceLabel:food.sourceLabel||food.label,source:food.source||'USDA SR Legacy 2018',grams:Number(e.grams)};
    });
    if(result.some(f=>!Number.isFinite(f.grams)||f.grams<=0||f.grams>5000||['kcal','protein','carbs','fat'].some(k=>f[k]===''||!Number.isFinite(Number(f[k]))||f[k]<0||f[k]>(k==='kcal'?1000:100)))) {setError('Check weights and all four nutrition values.');return;}
    onSubmit({id:meal.id,name:meal.name,foods:result});setError('');setIsOpen(false);
  }
  return <article className={'meal-record '+(isOpen?'is-open':'')}>
    <button className="meal-row" type="button" onClick={()=>setIsOpen(!isOpen)} aria-expanded={isOpen}>
      <span className="meal-name">{meal.name}</span><span className="meal-summary">{meal.summary}</span><span className="meal-calories">{meal.completed?`${Math.round(meal.calories)} kcal`:'Not logged'}</span><span className="row-action">{isOpen?'Collapse':meal.completed?'Edit':'Log'}</span>
    </button>
    {isOpen && <form className="meal-editor" onSubmit={save}>
      {entries.map(entry=>{
        const choices=activeFoodId===entry.id&&!entry.food?foodSuggestions(entry.query,foodById):[];
        return <section className="meal-entry" key={entry.id}>
          {entries.length>1 && <header className="meal-entry-heading"><button type="button" onClick={()=>setEntries(all=>all.filter(e=>e.id!==entry.id))}>Remove</button></header>}
          <div className="exact-grid"><div className="field food-name-field" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setActiveFoodId(null);}}>
            <label htmlFor={'food-name-'+entry.id}>Food name</label>
            <input id={'food-name-'+entry.id} required maxLength="160" value={entry.query} onFocus={()=>setActiveFoodId(entry.id)} onKeyDown={event=>{if(event.key==='Escape')setActiveFoodId(null);}} onChange={event=>{update(entry.id,{query:event.target.value,food:null});setActiveFoodId(entry.id);}} placeholder="e.g. beef, chicken, pork" aria-expanded={choices.length>0} aria-controls={choices.length?'food-choices-'+entry.id:undefined} />
            {!!choices.length && <div id={'food-choices-'+entry.id} className="food-choice-list" aria-label="Food choices">{choices.map(choice=><button key={choice.id} type="button" title={choice.food.label} onClick={()=>{update(entry.id,{query:choice.label,food:{...choice.food,label:choice.label,sourceLabel:choice.food.label,source:'USDA SR Legacy 2018'}});setActiveFoodId(null);}}>{choice.label}</button>)}</div>}
          </div>
          <label className="field"><span>Weight (g)</span><input required type="number" min="0.1" max="5000" step="0.1" value={entry.grams} onFocus={()=>setActiveFoodId(null)} onChange={e=>update(entry.id,{grams:e.target.value})}/></label></div>
        </section>;
      })}
      <button className="add-food-entry" type="button" disabled={entries.length>=maxEntries} onClick={()=>setEntries(all=>[...all,blank()])}>＋ Add food</button>
      {error && <p role="alert">{error}</p>}
      <footer className="editor-footer"><button className="primary-action" type="submit">Save meal</button></footer>
    </form>}
  </article>;
}
