export const VERSION = 1;
export function withProfileDefaults(profile = {}) {
  return {...profile,sex:profile.sex || 'male',goal:profile.goal || 'recomp',ageRange:profile.ageRange || '15-50',age:profile.age ?? ''};
}
export const emptyJournal = () => ({ version: VERSION, days: {}, fitnessPartsByDate: {}, fitnessExerciseRecords: {}, photos: [], profile: withProfileDefaults() });
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function numberIn(value, min, max, label = 'Value') {
  const n = Number(value);
  if (!['number','string'].includes(typeof value) || String(value).trim() === '' || !Number.isFinite(n) || n < min || n > max) throw new Error(`${label} must be between ${min} and ${max}.`);
  return n;
}
export function sumNutrition(meals) {
  const totals = { calories:0, protein:0, carbs:0, fat:0, fiber:0, sodium:0 };
  meals.flatMap(m => m.foods || []).forEach(food => {
    const portion = numberIn(food.grams, 0.1, 5000, 'Food weight') / 100;
    const hasEnteredCalories = food.caloriesOverride != null && food.caloriesOverride !== '';
    // A portion's entered calories replace its catalog calories; never add both.
    totals.calories += hasEnteredCalories
      ? numberIn(food.caloriesOverride, 0, 50000, 'Food calories')
      : (food.kcal || 0) * portion;
    for (const key of ['protein', 'carbs', 'fat', 'fiber', 'sodium']) totals[key] += (food[key] || 0) * portion;
  });
  return Object.fromEntries(Object.entries(totals).map(([key,value]) => [key,Math.round(value*10)/10]));
}
export const drinkOptions = ['Water','Milk','Coffee','Tea','Juice','Creatine','Protein powder'];
export const plainWater = type => /^(water|plain water|sparkling water|mineral water)$/i.test(type.trim());
export function drinksNutrition(entries) {
  // Only protein powder contributes nutrition. Other drinks record volume only.
  const totals={calories:0,protein:0,carbs:0,fat:0,fiber:0,sodium:0};
  let powderProtein=0;
  let powderCalories=0;
  let incompletePowderProtein=false;
  let incompletePowderCalories=false;
  for(const entry of entries.filter(e=>e.type==='Protein powder' && !e.inMeals)) {
    const started=Number(entry.amount)>0 || entry.scoops!=='' && entry.scoops!=null || entry.proteinPerScoop!=='' && entry.proteinPerScoop!=null || entry.caloriesPerScoop!=='' && entry.caloriesPerScoop!=null;
    if(!started)continue;
    const scoops=Number(entry.scoops);
    if(entry.scoops==='' || entry.scoops==null || !Number.isFinite(scoops) || scoops<=0 || scoops>20) {
      incompletePowderProtein=true;
      incompletePowderCalories=true;
      continue;
    }
    const protein=Number(entry.proteinPerScoop);
    if(entry.proteinPerScoop==='' || entry.proteinPerScoop==null || !Number.isFinite(protein) || protein<=0 || protein>100) incompletePowderProtein=true;
    else powderProtein+=scoops*protein;
    const calories=Number(entry.caloriesPerScoop);
    if(entry.caloriesPerScoop==='' || entry.caloriesPerScoop==null || !Number.isFinite(calories) || calories<=0 || calories>1000) incompletePowderCalories=true;
    else powderCalories+=scoops*calories;
  }
  totals.protein=Math.round((totals.protein+powderProtein)*10)/10;
  totals.calories=Math.round((totals.calories+powderCalories)*10)/10;
  const caloriesIncomplete=incompletePowderCalories;
  return {totals,incomplete:caloriesIncomplete || incompletePowderProtein,caloriesIncomplete};
}
export const effortOptions = {
  strength: [['Multiple exercises, moderate',3.5],['Vigorous lifting',6]],
  football: [['Casual soccer',7],['Competitive soccer',9.5]],
  basketball: [['Non-game practice',6],['Game',8]],
  badminton: [['Social play',5.5],['Competitive play',7]],
  swim: [['Freestyle, recreational',5.8],['Freestyle, vigorous',9.8],['Breaststroke, recreational',5.3],['Backstroke, recreational',4.8]],
  run: [['Jogging, self-selected pace',7.5],['Running, 8–8.4 km/h',8.5],['Running, 9.7–10.1 km/h',9.3],['Running, 10.8 km/h',10.5],['Running, 12.1 km/h',11.8]],
  climb: [['Walking uphill, moderate/brisk, 1–5%',5.3],['Walking uphill, moderate/brisk, 6–10%',7],['Walking uphill, slow, 11–20%',8.8]]
};
export function motionModel(id, fields) {
  if(id==='swim') {
    // Older records have no stroke; keep their saved MET until they are edited.
    if(!fields.Stroke)return null;
    const metersPerMinute=Number(fields['Pool length'])*Number(fields.Laps)/Number(fields.Duration);
    // 2024 Adult Compendium swimming categories; cutoffs approximate the
    // midpoints between its recreational, medium and fast pace references.
    const met=fields.Stroke==='Freestyle'
      ? metersPerMinute<43?5.8:metersPerMinute<57?8:9.8
      : metersPerMinute<43?5.3:10.3;
    return {met,note:`${fields.Stroke}: ${metersPerMinute.toFixed(1)} m/min average; ${met} MET pace category.`};
  }
  if(id==='run') {
    const kmh=Number(fields.Distance)/Number(fields.Duration)*60;
    // Nearest published level-running speed, not a precision interpolation model.
    const bands=[[6.6,6.5],[7.3,7.8],[8.2,8.5],[9.1,9],[9.9,9.3],[10.8,10.5],[11.3,11],[12.1,11.8],[12.9,12],[13.8,12.5],[14.5,13],[15.2,14.8],[16.1,14.8],[17.7,16.8],[19.3,18.5],[20.9,19.8],[22.5,23]];
    if(!Number.isFinite(kmh) || kmh<6.4 || kmh>22.5)return {met:null,note:'No supported level-running estimate at this speed (supported: 6.4–22.5 km/h). The session can still be logged.'};
    const [reference,met]=bands.reduce((best,band)=>Math.abs(band[0]-kmh)<Math.abs(best[0]-kmh)?band:best);
    return {met,note:`Level running: ${kmh.toFixed(1)} km/h; nearest Compendium speed ${reference} km/h (${met} MET).`};
  }
  if(id==='climb') {
    const grade=Number(fields.Incline),speed=Number(fields.Speed);
    let met=null;
    if(grade>=1 && grade<=5 && speed>=4 && speed<=6.3)met=5.3;
    if(grade>5 && grade<=10 && speed>=4 && speed<=6.3)met=7;
    if(grade>10 && grade<=20 && speed>=2 && speed<=5.5)met=8.8;
    if(grade>=5 && grade<=20 && speed>=.5 && speed<2)met=5;
    return {met,note:met?`Uphill walking, no load: ${met} MET. Grade band matched; pace bounds are conservative app assumptions. Do not use for stair machines or supported/handrail walking.`:'No matching uphill-walking estimate for this slope and speed. The session can still be logged.'};
  }
  return null;
}
export function makeSession(id, fields, met, weight) {
  if(!fields || typeof fields!=='object' || Array.isArray(fields))throw new Error('Invalid session fields.');
  const duration = numberIn(fields.Duration, 1, 600, 'Duration');
  if (!['run','climb','swim'].includes(id) && !effortOptions[id]?.some(o => o[1] === Number(met))) throw new Error('Choose an activity intensity.');
  if (id === 'run') {
    const distance = numberIn(fields.Distance, 0.1, 150, 'Distance');
    const seconds = Math.round(duration / distance * 60);
    fields = {...fields, Pace: `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`};
  }
  if (id === 'swim') {
    numberIn(fields['Pool length'], 5, 200, 'Pool length');
    const laps = numberIn(fields.Laps, 1, 2000, 'Laps');
    if (!Number.isInteger(laps)) throw new Error('Laps must be a whole number.');
    if (fields.Stroke == null && !effortOptions.swim.some(o => o[1] === Number(met))) throw new Error('Invalid swimming record.');
    if (fields.Stroke != null && !['Freestyle','Breaststroke'].includes(fields.Stroke)) throw new Error('Choose freestyle or breaststroke.');
  }
  if (id === 'climb') { numberIn(fields.Incline,0,30,'Incline'); numberIn(fields.Speed,0.5,12,'Speed'); }
  const model=motionModel(id,fields);
  return { fields, duration, met:model?model.met:Number(met), weight: weight ? numberIn(weight,30,300,'Body weight') : null };
}
export function sessionBurn(session) {
  if (!session?.weight || !session.met) return 0;
  return (session.met - 1) * 3.5 * session.weight / 200 * session.duration;
}
function energyProfile(profile) {
  try {
    const weight = numberIn(profile.weight,30,300,'Weight');
    const height = numberIn(profile.height,120,230,'Height');
    const age = numberIn(profile.age,15,50,'Age');
    if(!Number.isInteger(age))return null;
    if (!['male','female'].includes(profile.sex) || !profile.eligible || profile.activityBasis!=='nonExercise') return null;
    const activity = numberIn(profile.activity,1.2,1.9,'Activity factor');
    const bmr = 10*weight+6.25*height-5*age+(profile.sex==='male'?5:-161);
    return {weight,bmr:Math.round(bmr),baseline:Math.round(bmr*activity),burnBaseline:Math.round(bmr*1.375)};
  } catch { return null; }
}
export function distinctExerciseCount(exercises=[]) {
  return new Set(exercises.filter(record=>typeof record?.exercise==='string').map(record=>record.exercise.trim().toLowerCase()).filter(Boolean)).size;
}
export function strengthMetFor(parts=[], exercisesByPart={}) {
  const strengthParts=[...new Set(parts.filter(part=>typeof part==='string'))];
  // This is a user-defined logging threshold, not a measurement of intensity.
  const higherVolumeStrength=strengthParts.length>=3 && strengthParts.every(part=>distinctExerciseCount(exercisesByPart[part]||[])>=3);
  return higherVolumeStrength?5:3.5;
}
export function dailyEnergy(profile, training, records={}) {
  const body=energyProfile(profile);
  const strengthMet=strengthMetFor(records.strengthParts,records.strengthExercisesByPart);
  const sessions=training==='Fitness'
    ? {strength:records.strengthSession?[{...records.strengthSession,met:strengthMet}]:[],cardio:Object.values(records.cardioRecords||{}),sports:[]}
    : training==='Sports'
      ? {strength:[],cardio:[],sports:Object.values(records.ballSportRecords||{})}
      : {strength:[],cardio:[],sports:[]};
  const burn=list=>Math.round(list.reduce((sum,session)=>sum+sessionBurn(session),0));
  const strength=burn(sessions.strength),cardio=burn(sessions.cardio),sports=burn(sessions.sports);
  const allSessions=[...sessions.strength,...sessions.cardio,...sessions.sports];
  const missingSession=training==='Fitness' && !sessions.strength.length || training==='Sports' && !sessions.sports.length;
  const incomplete=missingSession || allSessions.some(session=>!session.weight || !session.met);
  return {
    baseline:body?.burnBaseline??null,strength,cardio,sports,
    strengthMet:sessions.strength.length?strengthMet:null,
    exerciseTotal:strength+cardio+sports,
    total:body?body.burnBaseline+strength+cardio+sports:null,
    complete:!!body && !incomplete,
    excludedCardio:training==='Sports' && Object.keys(records.cardioRecords||{}).length>0
  };
}
export function dailyBalance(intakeCalories, energy, { intakeKnown = false, caloriesIncomplete = false } = {}) {
  if (!intakeKnown || caloriesIncomplete || !Number.isFinite(intakeCalories) || !Number.isFinite(energy?.total)) return null;
  return Math.round((intakeCalories - energy.total) * 10) / 10;
}
export function planFor(profile) {
  try {
    const body=energyProfile(profile);
    if(!body)return null;
    const {weight,bmr,baseline}=body;
    const maintenance=baseline;
    const adjustment = { recomp:0, maintain:0, lose:-400, gain:400 }[profile.goal];
    if (adjustment==null) return null;
    const calories = maintenance;
    if(profile.goal==='recomp') {
      // Maintenance is a conservative starting choice, not a promise of fat loss.
      // Protein starting point: Morton et al. 2018, PMID 28698222.
      const protein=Math.round(weight*1.6), fat=Math.round(calories*.3/9);
      const carbs=Math.round((calories-protein*4-fat*9)/4);
      return {calories,protein,fat,carbs,maintenance,bmr,baseline,balanceTarget:adjustment};
    }
    // Other goals retain the existing general starting split.
    return { calories, protein:Math.round(calories*.2/4), fat:Math.round(calories*.3/9), carbs:Math.round(calories*.5/4), maintenance, bmr, baseline, balanceTarget:adjustment };
  } catch { return null; }
}
export function trainingStreak(journal, endDate) {
  let count = 0;
  const date = new Date(`${endDate}T12:00:00`);
  while (count < 36600) {
    const key=localDate(date), day=journal.days[key] || {};
    const logged = day.strengthSession || Object.keys(day.cardioRecords||{}).length || Object.keys(day.ballSportRecords||{}).length || Object.values(journal.fitnessExerciseRecords[key]||{}).some(a=>a.length);
    if (!logged) break;
    count++; date.setDate(date.getDate()-1);
  }
  return count;
}

// Strict envelope + bounded, finite JSON. A backup cannot contain executable URLs.
export function validateJournal(data) {
  if (!data || data.version !== VERSION || !data.days || !data.profile || !Array.isArray(data.photos) || !data.fitnessPartsByDate || !data.fitnessExerciseRecords) throw new Error('Unsupported or incomplete FitLog backup.');
  const walk = (node, depth=0) => {
    if (depth>14) throw new Error('Backup is too deeply nested.');
    if (typeof node==='number' && !Number.isFinite(node)) throw new Error('Invalid numeric value.');
    if (typeof node==='string' && node.length>1800000) throw new Error('Backup field is too large.');
    if (node && typeof node==='object') for (const [key,value] of Object.entries(node)) {
      if (['__proto__','constructor','prototype'].includes(key)) throw new Error('Invalid backup key.');
      walk(value,depth+1);
    }
  };
  walk(data);
  const object=value=>value && typeof value==='object' && !Array.isArray(value);
  const text=value=>typeof value==='string' && value.length<=1000;
  if(![data.days,data.profile,data.fitnessPartsByDate,data.fitnessExerciseRecords].every(object))throw new Error('Invalid backup structure.');
  const checkProfile=profile=>{
    if(!object(profile))throw new Error('Invalid profile.');
    // Accept ages from older backups; the editor and current calculation use 15–50.
    for(const [key,min,max] of [['height',120,230],['weight',30,300],['age',15,64],['activity',1.2,1.9]])if(profile[key]!=null && profile[key]!=='')numberIn(profile[key],min,max,key);
    if(profile.age!=='' && profile.age!=null && !Number.isInteger(Number(profile.age)))throw new Error('Age must be a whole number.');
    if(profile.ageRange!=null && !['18-20','15-50'].includes(profile.ageRange))throw new Error('Invalid default age range.');
    if(profile.sex && !['female','male'].includes(profile.sex) || profile.goal && !['recomp','maintain','lose','gain'].includes(profile.goal) || profile.eligible!=null && typeof profile.eligible!=='boolean' || profile.activityBasis!=null && profile.activityBasis!=='nonExercise')throw new Error('Invalid profile choices.');
  };
  checkProfile(data.profile);
  if (data.photos.length>30) throw new Error('Maximum 30 uploaded photos.');
  for(const photo of data.photos) if(typeof photo.id!=='string' || typeof photo.title!=='string' || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(photo.image)) throw new Error('Invalid photo in backup.');
  for(const [date,day] of Object.entries(data.days)) {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(new Date(date+'T12:00:00').getTime()) || localDate(new Date(date+'T12:00:00'))!==date || !object(day)) throw new Error('Invalid date record.');
    if(day.profile)checkProfile(day.profile);
    if(day.training && !['Fitness','Sports','Rest'].includes(day.training))throw new Error('Invalid day type.');
    if(day.meals) {
      if(!Array.isArray(day.meals) || ![3,4].includes(day.meals.length)) throw new Error('Invalid meals.');
      const legacy=day.meals.length===4;
      const expected=legacy?['breakfast','lunch','snack','dinner']:['breakfast','lunch','dinner'];
      if(new Set(day.meals.map(meal=>meal?.id)).size!==expected.length || expected.some(id=>!day.meals.some(meal=>meal?.id===id)))throw new Error('Invalid meal identifiers.');
      for(const meal of day.meals) {
        if(!object(meal) || !text(meal.name) || !Array.isArray(meal.foods) || meal.foods.length>(!legacy && meal.id==='lunch'?60:30)) throw new Error('Invalid meal.');
        for(const food of meal.foods) {
          if(!text(food.label)) throw new Error('Invalid food.');
          numberIn(food.grams,.1,5000,'Food weight');
          for(const key of ['kcal','protein','carbs','fat']) numberIn(food[key],0,key==='kcal'?1000:100,key);
          if(food.caloriesOverride!=null && food.caloriesOverride!=='') numberIn(food.caloriesOverride,0,50000,'Food calories');
          for(const key of ['fiber','sodium'])if(food[key]!=null)numberIn(food[key],0,key==='fiber'?100:100000,key);
        }
      }
      if(legacy) {
        const byId=Object.fromEntries(day.meals.map(meal=>[meal.id,meal]));
        day.meals=[byId.breakfast,{...byId.lunch,foods:[...byId.lunch.foods,...byId.snack.foods]},byId.dinner];
      }
      for(const meal of day.meals) {
        meal.summary=meal.foods.length?meal.foods.map(f=>f.label+' '+f.grams+' g').join(', '):'Not logged';
        meal.calories=sumNutrition([meal]).calories;meal.completed=meal.foods.length>0;
      }
    }
    if(day.waterEntries && (!Array.isArray(day.waterEntries) || day.waterEntries.some(e=>typeof e.type!=='string' || e.amount!=='' && (!Number.isFinite(Number(e.amount)) || Number(e.amount)<0 || Number(e.amount)>5000)))) throw new Error('Invalid hydration entries.');
    for(const entry of day.waterEntries||[]) {
      if(!text(entry.id)||!text(entry.type))throw new Error('Invalid drink.');
      if(entry.nutrients && !object(entry.nutrients))throw new Error('Invalid drink nutrition.');
      for(const key of ['kcal','protein','carbs','fat'])if(entry.nutrients?.[key]!=null && entry.nutrients[key]!=='')numberIn(entry.nutrients[key],0,key==='kcal'?1000:100,key);
      if(entry.scoops!=null && entry.scoops!=='')numberIn(entry.scoops,0,20,'Scoops');
      if(entry.proteinPerScoop!=null && entry.proteinPerScoop!=='')numberIn(entry.proteinPerScoop,0,100,'Protein per scoop');
      if(entry.caloriesPerScoop!=null && entry.caloriesPerScoop!=='')numberIn(entry.caloriesPerScoop,0,1000,'Calories per scoop');
    }
    for(const field of ['selectedCardioActivities','selectedBallSports']) if(day[field] && (!Array.isArray(day[field]) || day[field].some(v=>typeof v!=='string'))) throw new Error('Invalid selections.');
    for(const key of ['cardioRecords','ballSportRecords'])if(day[key]){
      if(!object(day[key]))throw new Error('Invalid activity records.');
      for(const [id,session] of Object.entries(day[key])) {
        if(!(key==='cardioRecords'?['run','swim','climb']:['football','basketball','badminton']).includes(id))throw new Error('Invalid activity identifier.');
        day[key][id]=makeSession(id,session.fields,session.met,session.weight);
      }
    }
    if(day.strengthSession)day.strengthSession=makeSession('strength',day.strengthSession.fields,day.strengthSession.met,day.strengthSession.weight);
  }
  for(const parts of Object.values(data.fitnessPartsByDate)) if(!Array.isArray(parts) || parts.some(p=>typeof p!=='string')) throw new Error('Invalid muscle groups.');
  for(const groups of Object.values(data.fitnessExerciseRecords)) {if(!object(groups))throw new Error('Invalid exercise groups.');for(const records of Object.values(groups)) {
    if(!Array.isArray(records) || records.some(r=>typeof r.exercise!=='string' || !['weighted','count','duration'].includes(r.type))) throw new Error('Invalid exercises.');
    for(const r of records){if(!text(r.id)||!text(r.exercise))throw new Error('Invalid exercise.');if(r.type==='weighted'){numberIn(r.weight,0,500);numberIn(r.sets,1,100);}else{numberIn(r.value,1,3600);if(!['reps','sec'].includes(r.unit))throw new Error('Invalid exercise unit.');}}
  }}
  return data;
}
