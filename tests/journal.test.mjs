import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyJournal, withProfileDefaults, localDate, sumNutrition, drinkOptions, drinksNutrition, makeSession, sessionBurn, dailyEnergy, dailyBalance, planFor, validateJournal, trainingStreak, numberIn} from '../src/data/journal.js';

const chicken={label:'Chicken',grams:100,kcal:165,protein:31,carbs:0,fat:3.6};
test('grams scale actual nutrient values; same foods remain distinct',()=>{
  assert.equal(sumNutrition([{foods:[chicken]}]).calories,165);
  assert.equal(sumNutrition([{foods:[{...chicken,grams:300}]}]).calories,495);
  assert.equal(sumNutrition([{foods:[chicken,chicken]}]).calories,330);
});
test('entered calories replace only the logged portion energy while nutrients still follow weight',()=>{
  const entered={...chicken,grams:50,caloriesOverride:200};
  assert.deepEqual(sumNutrition([{foods:[entered]}]),{
    calories:200,protein:15.5,carbs:0,fat:1.8,fiber:0,sodium:0,
  });
  assert.equal(sumNutrition([{foods:[entered,chicken]}]).calories,365);
  assert.equal(sumNutrition([{foods:[{...entered,caloriesOverride:0}]}]).calories,0);
  assert.equal(sumNutrition([{foods:[{...entered,caloriesOverride:''}]}]).calories,82.5);
});
test('replacement is idempotent; different days are isolated',()=>{
  const j=emptyJournal();j.days['2026-09-30']={meals:[{foods:[chicken]}]};
  const save=()=>{j.days['2026-09-30'].meals=[{foods:[chicken]}];};save();save();
  assert.equal(sumNutrition(j.days['2026-09-30'].meals).calories,165);
  assert.equal(sumNutrition(j.days['2026-10-01']?.meals||[]).calories,0);
});
test('run pace derived from distance/time and every metric retained',()=>{
  const r=makeSession('run',{Duration:'90',Distance:'15',Pace:'1:00'},9.3,70);
  assert.equal(r.fields.Pace,'6:00');assert.equal(r.duration,90);
  assert.ok(Math.abs(sessionBurn(r)-915.075)<1e-6);
  assert.equal(sessionBurn({...r,weight:null}),0);
});
test('invalid/infinite input fails; lengths are integers',()=>{
  for(const x of [-1,Infinity,NaN,'',undefined,'  ',true,[50],{}])assert.throws(()=>numberIn(x,1,600));
  assert.throws(()=>makeSession('run',{Duration:40,Distance:0},7.5,70));
  assert.equal(makeSession('swim',{Duration:35,'Pool length':25,Laps:24},5.8,70).fields.Laps,24);
  assert.throws(()=>makeSession('swim',{Duration:40,'Pool length':25,Laps:1.5},5.8,70));
  assert.throws(()=>makeSession('swim',{Duration:40,'Pool length':25,Laps:20},999,70));
});

test('legacy snack foods merge into lunch without changing daily nutrition or hydration',()=>{
  const meal=(id,foods=[])=>({id,name:id[0].toUpperCase()+id.slice(1),foods});
  const legacy=emptyJournal();
  legacy.days['2026-10-28']={meals:[meal('breakfast'),meal('lunch',[chicken]),meal('snack',[{...chicken,grams:50}]),meal('dinner')],waterEntries:[{id:'water-1',type:'Water',amount:300}]};
  const before=sumNutrition(legacy.days['2026-10-28'].meals);
  const migrated=validateJournal(legacy);
  const day=migrated.days['2026-10-28'];
  assert.deepEqual(day.meals.map(m=>m.id),['breakfast','lunch','dinner']);
  assert.deepEqual(day.meals[1].foods.map(f=>f.grams),[100,50]);
  assert.deepEqual(sumNutrition(day.meals),before);
  assert.equal(day.meals[1].calories,247.5);
  assert.equal(day.waterEntries[0].amount,300);
  assert.equal(validateJournal(migrated).days['2026-10-28'].meals[1].foods.length,2);
});

test('legacy lunch and snack can each have 30 foods without losing entries',()=>{
  const meal=(id,foods=[])=>({id,name:id,foods});
  const legacy=emptyJournal();
  legacy.days['2026-10-28']={meals:[meal('breakfast'),meal('lunch',Array(30).fill(chicken)),meal('snack',Array(30).fill(chicken)),meal('dinner')]};
  const migrated=validateJournal(legacy);
  assert.equal(migrated.days['2026-10-28'].meals[1].foods.length,60);
  assert.equal(sumNutrition(migrated.days['2026-10-28'].meals).calories,9900);
  assert.doesNotThrow(()=>validateJournal(migrated));
});
test('ordinary drinks record volume only; only protein powder contributes nutrition',()=>{
  const drink={id:'milk',type:'Milk',amount:250,nutrients:{kcal:60,protein:3,carbs:5,fat:3}};
  assert.equal(drinksNutrition([drink]).totals.calories,0);
  assert.equal(drinksNutrition([drink]).totals.protein,0);
  assert.equal(drinksNutrition([{...drink,inMeals:true}]).totals.calories,0);
  assert.equal(drinksNutrition([{type:'Latte',amount:250}]).incomplete,false);
  assert.equal(drinksNutrition([{type:'Water',amount:250}]).incomplete,false);
  assert.equal(drinksNutrition([{...drink,nutrients:{kcal:60}}]).incomplete,false);
});
test('fixed drink choices and protein powder count label protein and calories separately',()=>{
  assert.deepEqual(drinkOptions,['Water','Milk','Coffee','Tea','Juice','Creatine','Protein powder']);
  const shake={id:'shake',type:'Protein powder',amount:'300',scoops:'2',proteinPerScoop:'24.5',caloriesPerScoop:'120'};
  const result=drinksNutrition([shake]);
  assert.equal(result.totals.protein,49);
  assert.equal(result.totals.calories,240);
  assert.equal(result.totals.carbs,0);
  assert.equal(result.totals.fat,0);
  assert.equal(result.incomplete,false);
  assert.equal(drinksNutrition([shake,{id:'milk',type:'Milk',amount:'300'}]).totals.calories,240);
  assert.equal(drinksNutrition([shake,{id:'milk',type:'Milk',amount:'300'}]).caloriesIncomplete,false);
  assert.equal(drinksNutrition([{...shake,amount:''}]).totals.protein,49);
  assert.equal(drinksNutrition([{...shake,inMeals:true}]).totals.protein,0);
  assert.equal(drinksNutrition([{...shake,proteinPerScoop:''}]).incomplete,true);
  assert.equal(drinksNutrition([{...shake,proteinPerScoop:''}]).totals.calories,240);
  assert.equal(drinksNutrition([{...shake,caloriesPerScoop:''}]).totals.protein,49);
  assert.equal(drinksNutrition([{...shake,caloriesPerScoop:''}]).totals.calories,0);
  assert.equal(drinksNutrition([{...shake,caloriesPerScoop:''}]).caloriesIncomplete,true);
  assert.equal(drinksNutrition([{id:'creatine',type:'Creatine',amount:'300'}]).incomplete,false);
});
test('malformed imports fail before reaching React',()=>{
  for(const patch of [{profile:{weight:{}}},{days:{'2026-02-30':{}}},{days:{'2026-09-30':{cardioRecords:[]}}},{days:{'2026-09-30':{waterEntries:[{id:'x',type:'milk',amount:10,nutrients:{kcal:-1}}]}}},{fitnessExerciseRecords:{'2026-09-30':null}}])assert.throws(()=>validateJournal({...emptyJournal(),...patch}));
});
test('protein powder scoop inputs are bounded in backups',()=>{
  const day={waterEntries:[{id:'shake',type:'Protein powder',amount:'300',scoops:'2',proteinPerScoop:'24.5',caloriesPerScoop:'120'}]};
  assert.doesNotThrow(()=>validateJournal({...emptyJournal(),days:{'2026-10-24':day}}));
  assert.doesNotThrow(()=>validateJournal({...emptyJournal(),days:{'2026-10-24':{waterEntries:[{...day.waterEntries[0],caloriesPerScoop:undefined}]}}}));
  for(const patch of [{scoops:-1},{scoops:Infinity},{scoops:21},{proteinPerScoop:-1},{proteinPerScoop:101},{caloriesPerScoop:-1},{caloriesPerScoop:1001}]){
    const bad={...day,waterEntries:[{...day.waterEntries[0],...patch}]};
    assert.throws(()=>validateJournal({...emptyJournal(),days:{'2026-10-24':bad}}));
  }
});
test('intake target stays at BMR times activity while balance goal follows training objective',()=>{
  const p={weight:70,height:175,age:30,sex:'male',activity:1.55,activityBasis:'nonExercise',goal:'maintain',eligible:true};
  const plan=planFor(p);assert.equal(plan.bmr,1649);assert.equal(plan.calories,2556);
  assert.equal(dailyEnergy(p,'Rest').baseline,2267);
  assert.equal(dailyEnergy({...p,activity:1.2},'Rest').baseline,2267);
  assert.equal(planFor({...p,activity:1.2}).calories,1979);
  assert.equal(planFor({...p,goal:'lose'}).calories,2556);
  assert.equal(planFor({...p,goal:'lose'}).balanceTarget,-400);
  for(const goal of ['maintain','recomp','lose','gain']) {
    const fixed=planFor({...p,goal});
    assert.deepEqual(planFor({...p,goal},250),fixed);
    assert.deepEqual(planFor({...p,goal},1000),fixed);
  }
  assert.equal(planFor({...p,goal:'gain'}).calories,2556);
  assert.equal(planFor({...p,goal:'gain'}).balanceTarget,400);
  assert.equal(planFor({...p,goal:'recomp'}).calories,2556);
  assert.equal(planFor({...p,goal:'recomp'}).balanceTarget,0);
  assert.equal(planFor(p).balanceTarget,0);
  assert.equal(planFor({...p,sex:'female'}).calories,2298);
  assert.equal(planFor({...p,sex:'female',goal:'gain'}).calories,2298);
  assert.equal(planFor({...p,sex:'female',goal:'lose'}).calories,2298);
  assert.equal(planFor({...p,maintenanceCalories:'2800',goal:'lose'}).calories,2556);
  assert.equal(planFor({...p,maintenanceCalories:'2800',goal:'gain'}).calories,2556);
  const strength=makeSession('strength',{Duration:60},3.5,70);
  assert.ok(dailyEnergy(p,'Fitness',{strengthSession:strength}).total>dailyEnergy(p,'Rest').total);
  const saved={...emptyJournal(),profile:{...p,maintenanceCalories:2800}};
  assert.equal(planFor(validateJournal(JSON.parse(JSON.stringify(saved))).profile).calories,2556);
  for(const patch of [{age:14},{age:51},{eligible:false},{weight:''},{sex:''},{weight:29},{activityBasis:undefined}])assert.equal(planFor({...p,...patch}),null);
  assert.ok(planFor({...p,weight:40}));
});
test('intake minus burn is visible from the available daily burn before a workout is logged',()=>{
  const profile={weight:70,height:175,age:30,sex:'male',activity:1.55,activityBasis:'nonExercise',goal:'lose',eligible:true};
  const energy=dailyEnergy(profile,'Fitness');
  assert.equal(energy.complete,false);
  assert.equal(energy.total,2267);
  assert.equal(dailyBalance(300,energy,{intakeKnown:true}),-1967);
  assert.equal(dailyBalance(300,energy,{intakeKnown:false}),null);
  assert.equal(dailyBalance(300,energy,{intakeKnown:true,caloriesIncomplete:true}),null);
  assert.equal(dailyBalance(300,{total:null},{intakeKnown:true}),null);
  const strength=makeSession('strength',{Duration:60},3.5,70);
  const afterTraining=dailyEnergy(profile,'Fitness',{strengthSession:strength});
  assert.equal(dailyBalance(300,afterTraining,{intakeKnown:true}),300-afterTraining.total);
});
test('daily energy keeps strength and sports mutually exclusive and adds cardio only on fitness days',()=>{
  const profile={weight:70,height:175,age:30,sex:'male',activity:1.2,activityBasis:'nonExercise',goal:'recomp',eligible:true};
  const strength=makeSession('strength',{Duration:60},3.5,70);
  const run=makeSession('run',{Duration:30,Distance:5},9.3,70);
  const football=makeSession('football',{Duration:60},7,70);
  const records={strengthSession:strength,cardioRecords:{run},ballSportRecords:{football}};
  const fitness=dailyEnergy(profile,'Fitness',records);
  assert.equal(fitness.baseline,2267);
  assert.equal(fitness.strength,Math.round(sessionBurn(strength)));
  assert.equal(fitness.cardio,Math.round(sessionBurn(run)));
  assert.equal(fitness.sports,0);
  assert.equal(fitness.total,fitness.baseline+fitness.strength+fitness.cardio);
  assert.equal(fitness.complete,true);
  const sports=dailyEnergy(profile,'Sports',records);
  assert.equal(sports.strength,0);assert.equal(sports.cardio,0);
  assert.equal(sports.sports,Math.round(sessionBurn(football)));
  assert.equal(sports.total,sports.baseline+sports.sports);
  assert.equal(sports.complete,true);
  assert.equal(dailyEnergy(profile,'Fitness',{...records,strengthSession:null}).complete,false);
  assert.equal(dailyEnergy(profile,'Sports',{...records,ballSportRecords:{}}).complete,false);
  assert.equal(dailyEnergy(profile,'Rest',records).total,2267);
  assert.equal(dailyEnergy(profile,'Fitness',{...records,strengthSession:{...strength,weight:null}}).complete,false);
  assert.equal(dailyEnergy({...profile,activityBasis:undefined},'Fitness',records).total,null);
});
test('strength uses 5 MET only when at least three selected body parts each have three distinct exercises',()=>{
  const profile={weight:70,height:175,age:30,sex:'male',activity:1.375,activityBasis:'nonExercise',goal:'recomp',eligible:true};
  const strengthSession=makeSession('strength',{Duration:60},3.5,70);
  const exercisesByPart={
    chest:['Bench Press','Chest Fly','Push-up'].map(exercise=>({exercise})),
    back:['Row','Pull-up','Lat Pulldown'].map(exercise=>({exercise})),
    legs:['Squat','Lunge','Deadlift'].map(exercise=>({exercise})),
    abs:['Plank','Crunch','Leg Raise'].map(exercise=>({exercise}))
  };
  const energy=(parts,groups=exercisesByPart)=>dailyEnergy(profile,'Fitness',{strengthSession,strengthParts:parts,strengthExercisesByPart:groups});
  assert.equal(energy(['chest','back']).strengthMet,3.5);
  assert.equal(energy(['chest','back','legs'],{...exercisesByPart,legs:exercisesByPart.legs.slice(0,2)}).strengthMet,3.5);
  assert.equal(energy(['chest','back','legs'],{...exercisesByPart,legs:[...exercisesByPart.legs.slice(0,2),{exercise:'Squat'}]}).strengthMet,3.5);
  assert.equal(energy(['chest','back','legs','abs'],{...exercisesByPart,abs:exercisesByPart.abs.slice(0,2)}).strengthMet,3.5);
  const higher=energy(['chest','back','legs']);
  assert.equal(higher.strengthMet,5);
  assert.equal(higher.strength,Math.round(sessionBurn({...strengthSession,met:5})));
  assert.ok(higher.strength>energy(['chest','back']).strength);
  assert.equal(energy(['chest','back','legs','abs']).strengthMet,5);
  assert.equal(dailyEnergy(profile,'Rest',{strengthSession,strengthParts:['chest','back','legs'],strengthExercisesByPart:exercisesByPart}).strength,0);
});
test('backup roundtrip and invalid formats',()=>{
  const j=emptyJournal();assert.deepEqual(validateJournal(JSON.parse(JSON.stringify(j))),j);
  for(const bad of [{}, {...j,version:999}, {...j,photos:[{id:'x',title:'x',image:'javascript:alert(1)'}]}, {...j,days:{'bad-date':{}}}])assert.throws(()=>validateJournal(bad));
  assert.throws(()=>validateJournal(JSON.parse('{"version":1,"days":{},"photos":[],"profile":{},"fitnessPartsByDate":{},"fitnessExerciseRecords":{},"__proto__":{}}')));
  assert.doesNotThrow(()=>validateJournal({...emptyJournal(),profile:{activity:1.375}}));
  assert.throws(()=>validateJournal({...emptyJournal(),profile:{activity:1.375,activityBasis:'includesExercise'}}));
});
test('backup keeps optional portion calories and rejects invalid overrides',()=>{
  const food={...chicken,grams:50,caloriesOverride:200};
  const day={meals:['breakfast','lunch','dinner'].map(id=>({id,name:id,foods:id==='breakfast'?[food]:[]}))};
  const saved=validateJournal({...emptyJournal(),days:{'2026-11-04':day}});
  assert.equal(saved.days['2026-11-04'].meals[0].foods[0].caloriesOverride,200);
  assert.equal(saved.days['2026-11-04'].meals[0].calories,200);
  for(const invalid of [-1,50001,'  ',Infinity]){
    const bad={...emptyJournal(),days:{'2026-11-04':{meals:day.meals.map(meal=>({...meal,foods:meal.id==='breakfast'?[{...food,caloriesOverride:invalid}]:[]}))}}};
    assert.throws(()=>validateJournal(bad));
  }
});
test('streak crosses month and year boundaries; no fake initial streak',()=>{
  const j=emptyJournal();assert.equal(trainingStreak(j,'2026-09-30'),0);
  j.days['2026-12-31']={strengthSession:{duration:20}};j.days['2027-01-01']={cardioRecords:{run:{duration:30}}};
  assert.equal(trainingStreak(j,'2027-01-01'),2);assert.equal(trainingStreak(j,'2027-01-02'),0);
  assert.equal(localDate(new Date(2026,8,30,23,59)),'2026-09-30');
});
test('running intensity follows distance and time, not a stale intensity choice',()=>{
  const slow=makeSession('run',{Duration:60,Distance:8.2},9.3,70);
  const fast=makeSession('run',{Duration:60,Distance:12.1},9.3,70);
  assert.equal(slow.met,8.5);assert.equal(fast.met,11.8);assert.ok(sessionBurn(fast)>sessionBurn(slow));
  assert.equal(makeSession('run',{Duration:60,Distance:1},7.5,70).met,null);
});
test('swimming stroke and distance-based pace change the burn without double-counting distance',()=>{
  const base={Duration:35,'Pool length':25,Laps:24};
  const freestyle=makeSession('swim',{...base,Stroke:'Freestyle'},5.8,70);
  const breaststroke=makeSession('swim',{...base,Stroke:'Breaststroke'},5.8,70);
  const farther=makeSession('swim',{...base,Laps:70,Stroke:'Freestyle'},5.8,70);
  const fastest=makeSession('swim',{...base,Laps:100,Stroke:'Freestyle'},5.8,70);
  assert.equal(freestyle.met,5.8);
  assert.equal(breaststroke.met,5.3);
  assert.equal(farther.met,8);
  assert.equal(fastest.met,9.8);
  assert.ok(sessionBurn(farther)>sessionBurn(freestyle));
  assert.equal(makeSession('swim',{...base,Laps:70,Stroke:'Breaststroke'},5.8,70).met,10.3);
  assert.throws(()=>makeSession('swim',{...base,Stroke:'Butterfly'},5.8,70));
  assert.equal(makeSession('swim',base,9.8,70).met,9.8);
});
test('incline uses slope bands; unsupported combinations have no estimate',()=>{
  assert.equal(makeSession('climb',{Duration:30,Incline:10,Speed:5.2},5.3,70).met,7);
  assert.equal(makeSession('climb',{Duration:30,Incline:30,Speed:12},5.3,70).met,null);
});
test('personal defaults are male and recomposition without inventing an exact age',()=>{
  const defaults=withProfileDefaults({});
  assert.equal(defaults.sex,'male');assert.equal(defaults.goal,'recomp');
  assert.equal(defaults.ageRange,'15-50');assert.equal(defaults.age,'');
  assert.equal(planFor({...defaults,weight:70,height:175,activity:1.55,eligible:true}),null);
  const existing={sex:'female',goal:'maintain',age:25};
  assert.equal(withProfileDefaults(existing).sex,'female');assert.equal(withProfileDefaults(existing).goal,'maintain');assert.equal(withProfileDefaults(existing).age,25);
});
test('the same formula calculates ages 15 through 50 and preserves old backups',()=>{
  for(const age of [15,17,18,19,20,50]){
    const profile={...withProfileDefaults({}),age,weight:70,height:175,activity:1.55,activityBasis:'nonExercise',eligible:true};
    const plan=planFor(profile);
    assert.ok(plan);assert.equal(plan.calories,plan.maintenance);assert.equal(plan.protein,112);
    assert.ok(Math.abs(plan.protein*4+plan.carbs*4+plan.fat*9-plan.calories)<=3);
    const journal=emptyJournal();journal.profile=profile;
    assert.equal(validateJournal(JSON.parse(JSON.stringify(journal))).profile.age,age);
  }
  for(const age of [14,51])assert.equal(planFor({...withProfileDefaults({}),age,weight:70,height:175,activity:1.55,eligible:true}),null);
  assert.doesNotThrow(()=>validateJournal({...emptyJournal(),profile:{...emptyJournal().profile,ageRange:'18-20'}}));
  assert.doesNotThrow(()=>validateJournal({...emptyJournal(),profile:{...emptyJournal().profile,age:64,ageRange:'18-20'}}));
});
