import { useState } from 'react';
import { effortOptions, makeSession } from '../data/journal';
export default function SessionEditor({id,name,fields=[],record,weight,onSave}) {
  const defaultFields=fields.length?fields:[{label:'Duration',value:id==='strength'?'':'60',unit:'min'}];
  const [values,setValues]=useState({...Object.fromEntries(defaultFields.map(f=>[f.label,f.value])),...record?.fields});
  const [met]=useState(record?.met || effortOptions[id][0][1]);
  const [error,setError]=useState('');
  const visibleFields=defaultFields;
  const pace=Number(values.Distance)>0 && Number(values.Duration)>0 ? Number(values.Duration)/Number(values.Distance):0;
  const swimDistance=Number(values['Pool length'])*Number(values.Laps);
  // Preserve saved effort values without adding intensity controls to the
  // approved forms. New entries use the existing default population estimate;
  // running and incline estimates are still derived by makeSession.
  return <form className={'training-record-form' + (id==='strength'?' training-record-form--strength':id==='swim'?' training-record-form--swim':'')} aria-label={name+' log'} onSubmit={e=>{e.preventDefault();try{const result=makeSession(id,values,met,weight);onSave(result);setError('');}catch(err){setError(err.message);}}}>
    <div className={`training-record-fields${['swim','run','climb'].includes(id) ? ' training-record-fields--cardio' : ''}`}>{visibleFields.filter(f=>f.label!=='Pace').map(f=><label key={f.label}>{f.label}{f.label==='Stroke' ? <select required value={values.Stroke??''} onChange={e=>setValues(v=>({...v,Stroke:e.target.value}))}><option value="Freestyle">Freestyle</option><option value="Breaststroke">Breaststroke</option></select> : <input required type="number" step={f.label==='Laps'?1:'any'} min={f.label==='Laps'?1:f.label==='Incline'?0:.1} max={f.label==='Duration'?600:5000} value={values[f.label]??''} onChange={e=>setValues(v=>({...v,[f.label]:e.target.value}))}/>} {f.unit}</label>)}</div>
    {id==='swim' && <small>Distance: {swimDistance>0?`${swimDistance.toLocaleString('en-US')} m`:'—'} · One lap is one pool length. Enter swimming time without breaks.</small>}
    {id==='run' && <small>Pace (calculated): {pace?`${Math.floor(Math.round(pace*60)/60)}:${String(Math.round(pace*60)%60).padStart(2,'0')} min/km`:'—'}</small>}
    {error && <p role="alert">{error}</p>}<footer><button className="primary-action" type="submit">Save {name}</button></footer>
  </form>;
}
