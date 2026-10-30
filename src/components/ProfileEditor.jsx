import { useState } from 'react';
import { withProfileDefaults } from '../data/journal';
const editableProfile = (profile) => {
  const { maintenanceCalories, ...current } = withProfileDefaults(profile);
  return {...current,activity:profile.activityBasis==='nonExercise' ? profile.activity || '' : ''};
};
export default function ProfileEditor({profile,onSave}) {
  const [open,setOpen]=useState(false);
  const [draft,setDraft]=useState(()=>editableProfile(profile));
  const set=(key,value)=>setDraft(p=>({...p,[key]:value}));
  const bmi=profile.weight && profile.height ? (profile.weight/(profile.height/100)**2).toFixed(1):'—';
  return <>
    <div className="card-heading"><h2>Body Metrics</h2><button className="ghost-button" type="button" onClick={()=>{setDraft(editableProfile(profile));setOpen(!open);}}>{open?'Cancel':'Edit'}</button></div>
    <div className="profile-grid"><div><span>Height</span><b>{profile.height?profile.height+' cm':'—'}</b></div><div><span>Weight on this day</span><b>{profile.weight?profile.weight+' kg':'—'}</b></div><div><span>BMI</span><b>{bmi}</b></div></div>
    {open && <form className="profile-editor" onSubmit={e=>{e.preventDefault();onSave({...draft,activityBasis:'nonExercise',eligible:true});setOpen(false);}}>
      <div className="nutrition-label-inputs">{[['height','Height (cm)',120,230],['weight','Weight (kg)',30,300],['age','Age',18,64]].map(([key,label,min,max])=><label className="field" key={key}><span>{label}</span><input required type="number" min={min} max={max} step={key==='age'?1:.1} value={draft[key]||''} placeholder={key==='age'?'18–20':undefined} onChange={e=>set(key,e.target.value)}/></label>)}</div>
      <label className="field"><span>Sex used by the energy equation</span><select required value={draft.sex||''} onChange={e=>set('sex',e.target.value)}><option value="">Choose</option><option value="female">Female</option><option value="male">Male</option></select></label>
      <label className="field"><span>Usual activity outside workouts</span><select required value={draft.activity||''} onChange={e=>set('activity',e.target.value)}><option value="">Choose</option><option value="1.2">Mostly sedentary · 1.2</option><option value="1.375">Lightly active · 1.375</option><option value="1.55">Moderately active · 1.55</option><option value="1.725">Very active · 1.725</option></select></label>
      {profile.activity && profile.activityBasis!=='nonExercise' && <small>Choose again: your previous activity setting included workouts.</small>}
      <label className="field"><span>Goal</span><select required value={draft.goal||''} onChange={e=>set('goal',e.target.value)}><option value="">Choose</option><option value="recomp">Body recomposition (balance goal 0 kcal)</option><option value="maintain">Maintain weight (balance goal 0 kcal)</option><option value="lose">Fat loss (balance goal −400 kcal)</option><option value="gain">Muscle gain (balance goal +400 kcal)</option></select></label>
      <button type="submit" className="primary-action">Save profile & plan</button>
    </form>}
  </>;
}
