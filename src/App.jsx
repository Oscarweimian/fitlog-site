import { lazy, Suspense, useMemo, useState } from 'react';
import BorderGlow from './components/BorderGlow';
const AeroShards=lazy(()=>import('./components/AeroShards'));
import TextType from './components/TextType';
import FoodAccordion from './components/FoodAccordion';
import MealEditor from './components/MealEditor';
import WaterEditor from './components/WaterEditor';
import CalendarView, { initialPhotos } from './components/CalendarView';
const FirstInterface=lazy(()=>import('./components/FirstInterface'));
import { galleryFor } from './data/foodImages';
import { withProfileDefaults, localDate, sumNutrition, drinksNutrition, dailyEnergy, distinctExerciseCount, strengthMetFor, planFor, trainingStreak, validateJournal } from './data/journal';
import { useJournal } from './data/useJournal';
import { downloadBackup, validateBackupPhotos } from './data/storage';
import ProfileEditor from './components/ProfileEditor';
import SessionEditor from './components/SessionEditor';
import { quotes, nextQuoteIndex } from './data/quotes';

const initialMeals = ['Breakfast','Lunch','Dinner'].map(name=>({id:name.toLowerCase(),name,summary:'Not logged',calories:0,foods:[],completed:false}));

const fitnessBodyParts = [
  { id: 'chest', name: 'Chest', detail: 'Presses and chest flyes' },
  { id: 'shoulders', name: 'Shoulders', detail: 'Presses and stability' },
  { id: 'back', name: 'Back', detail: 'Pulldowns and rows' },
  { id: 'abs', name: 'Abs', detail: 'Core strength and stability' },
  { id: 'legs', name: 'Legs', detail: 'Lower-body strength' },
  { id: 'arms', name: 'Arms', detail: 'Biceps, triceps and forearms' }
];

const partExerciseCatalog = {
  shoulders: ['Seated Shoulder Press', 'Standing Dumbbell Fly', 'Cable Face Pull', 'Dumbbell Lateral Raise'],
  back: ['Pull-up', 'Assisted Pull-up', 'Lat Pulldown', 'Single-arm Lat Pulldown', 'Single-arm Dumbbell Row', 'Seated Chest-supported Row', 'Seated Cable Row', 'Wide-grip Seated Row'],
  chest: ['Barbell Bench Press', 'Seated Chest Press', 'Pec Deck Fly', 'Push-up', 'Parallel-bar Dip'],
  abs: ['Crunch', 'Machine Crunch', 'Lying Leg Raise', 'Hanging Leg Raise', 'Russian Twist', 'Plank'],
  arms: ['Single-arm Dumbbell Curl', 'Barbell Curl', 'Cable Triceps Pushdown', 'Parallel-bar Dip'],
  legs: ['Smith Machine Squat', 'Goblet Squat', 'Hack Squat', 'Bulgarian Split Squat', 'Dumbbell Lunge', 'Kettlebell Swing', 'Depth Jump', 'Alternating Box Jump', 'Dumbbell Jump', 'Single-leg Romanian Deadlift', 'Thruster']
};

function getExerciseMeasurement(exercise) {
  if (['Push-up', 'Pull-up', 'Parallel-bar Dip'].includes(exercise)) return { type: 'count', label: 'Reps', unit: 'reps', defaultValue: '10' };
  if (exercise === 'Plank') return { type: 'duration', label: 'Hold time', unit: 'sec', defaultValue: '60' };
  return { type: 'weighted', label: 'Weight', unit: 'kg', defaultValue: '20' };
}


const cardioActivities = [
  { id: 'swim', name: 'Swimming', fields: [{ label: 'Stroke', value: 'Freestyle' }, { label: 'Duration', unit: 'min', value: '35', mode: 'numeric' }, { label: 'Pool length', unit: 'm', value: '25', mode: 'numeric' }, { label: 'Laps', unit: 'laps', value: '24', mode: 'numeric' }], description: 'Stroke, duration, pool length and laps' },
  { id: 'run', name: 'Running', fields: [{ label: 'Duration', unit: 'min', value: '35', mode: 'numeric' }, { label: 'Pace', unit: 'min/km', value: '5:30' }, { label: 'Distance', unit: 'km', value: '6.3', mode: 'decimal' }], description: 'Duration, pace and distance' },
  { id: 'climb', name: 'Incline', fields: [{ label: 'Duration', unit: 'min', value: '25', mode: 'numeric' }, { label: 'Incline', unit: '%', value: '10', mode: 'decimal' }, { label: 'Speed', unit: 'km/h', value: '5.2', mode: 'decimal' }], description: 'Duration, incline and speed' }
];

const ballSports = [
  { id: 'football', name: 'Football', description: 'Soccer: casual or competitive play', image: '/images/sport-football-training.webp' },
  { id: 'basketball', name: 'Basketball', description: 'Power, agility and endurance', image: '/images/sport-basketball-training.webp' },
  { id: 'badminton', name: 'Badminton', description: 'Agility, coordination and quick footwork', image: '/images/sport-badminton-training.webp' }
];

const trainingProfiles = {
  Sports: { area: 'Full body', dayLabel: 'Sports', detail: 'Full-body coordination, agility and cardio endurance', view: 'front', region: null, image: '/images/sport-full-body-athlete.webp', wholeBody: true },
  Fitness: { area: 'Fitness', detail: 'Strength, movement control and fitness', view: 'front', region: null, image: '/images/anatomy-front-detail.webp' },
  Rest: { area: 'Rest', detail: 'Walking, stretching and active recovery', view: 'front', region: null, image: '/images/rest-day-recovery.webp' },
  Chest: { area: 'Chest', detail: 'Bench presses, flyes and upper-chest work', view: 'front', region: 'chest', image: '/images/anatomy-front-detail.webp' },
  Back: { area: 'Back', detail: 'Rows, pulldowns and lat work', view: 'back', region: 'back', image: '/images/anatomy-back-detail.webp' },
  Shoulders: { area: 'Shoulders', detail: 'Presses, lateral raises and stability', view: 'front', region: 'shoulders', image: '/images/anatomy-front-detail.webp' },
  Abs: { area: 'Abs', detail: 'Crunches, leg raises and core stability', view: 'front', region: 'abs', image: '/images/anatomy-front-detail.webp' },
  Legs: { area: 'Legs', detail: 'Squats, glutes and lower-body stability', view: 'front', region: null, image: '/images/anatomy-front-detail.webp' },
  Swimming: { area: 'Swimming', detail: 'Cardio endurance and full-body coordination', view: 'front', region: null, image: '/images/anatomy-front-detail.webp' },
  Running: { area: 'Running', detail: 'Pace, distance and cardio endurance', view: 'front', region: null, image: '/images/anatomy-front-detail.webp' },
  Incline: { area: 'Incline', detail: 'Incline, speed and lower-body endurance', view: 'front', region: null, image: '/images/anatomy-front-detail.webp' },
  Recovery: { area: 'Recovery', detail: 'Stretching, walking and active recovery', view: 'front', region: null, image: '/images/anatomy-front-detail.webp' }
};

const glowThemes = {
  default: { glowColor: '88 82 70', colors: ['#365314', '#84CC16', '#E8FFD0'] },
  protein: { glowColor: '86 84 72', colors: ['#3F6212', '#A3E635', '#ECFCCB'] },
  carbs: { glowColor: '195 92 74', colors: ['#075985', '#38BDF8', '#E0F7FF'] },
  fat: { glowColor: '42 92 74', colors: ['#78350F', '#F59E0B', '#FFF0B8'] },
  energy: { glowColor: '38 94 72', colors: ['#7C3D10', '#F59E0B', '#FFF1C7'] },
  water: { glowColor: '198 94 76', colors: ['#0C4A6E', '#38BDF8', '#DDF7FF'] },
  quote: { glowColor: '164 72 72', colors: ['#115E59', '#2DD4BF', '#E2FFF8'] },
  brown: { glowColor: '26 58 72', colors: ['#4A2C1B', '#A9673A', '#F5D4B4'] },
  training: { glowColor: '86 88 76', colors: ['#365314', '#BEF264', '#F1FFD1'] },
  cardio: { glowColor: '188 90 76', colors: ['#0E7490', '#67E8F9', '#E0FBFF'] }
};

function GlowPanel({ children, className = '', tone = 'default' }) {
  const theme = glowThemes[tone] || glowThemes.default;

  return (
    <BorderGlow
      className={'glow-panel ' + className}
      edgeSensitivity={48}
      glowColor={theme.glowColor}
      backgroundColor="rgba(3, 12, 6, .16)"
      borderRadius={12}
      glowRadius={28}
      glowIntensity={1.18}
      coneSpread={22}
      animated={false}
      colors={theme.colors}
      fillOpacity={0.14}
    >
      {children}
    </BorderGlow>
  );
}

function MetricCard({ label, current, target, unit, tone }) {
  const percent = target ? Math.min(100, Math.round((current / target) * 100)) : 0;
  const remaining = Math.max(0, target - current);

  return (
    <GlowPanel className={'metric-glow metric-glow--' + tone} tone={tone}>
      <article className={'metric-card metric-card--' + tone}>
        <div className="metric-label"><span>{label}</span><b>{percent}%</b></div>
        <strong>{current}{target ? " / "+target : ""} {unit}</strong>
        <div className="progress"><i style={{ width: percent + '%' }} /></div>
        <small>{!target?'Target not set':remaining>0?'Remaining: '+Math.round(remaining)+' '+unit:'Daily goal reached'}</small>
      </article>
    </GlowPanel>
  );
}

export function EnergyBar({ segments, total, target }) {
  const visible=segments.filter(segment=>segment.value>0);
  const fillPercent=Number.isFinite(total) && Number.isFinite(target) && target>0
    ? Math.min(100,Math.max(0,total/target*100))
    : 100;
  return <>
    <div className="energy-segments" aria-hidden="true"><div className="energy-segments-fill" style={{width:fillPercent+'%'}}>{visible.map(segment=><i key={segment.label} className={'energy-segment energy-segment--'+segment.tone} style={{flexGrow:segment.value}} />)}</div></div>
    <div className="energy-legend">{segments.map(segment=><span key={segment.label}><i className={'energy-legend-dot energy-segment--'+segment.tone} aria-hidden="true" />{segment.label} <strong>{segment.value.toLocaleString('en-US')} kcal</strong></span>)}</div>
  </>;
}

function MuscleMap({ training, selectedParts = [], view = 'front', onViewChange }) {
  const isWholeBody = training.wholeBody;
  const isFitness = training.isFitness;
  const selectedPartNames = selectedParts.map((partId) => fitnessBodyParts.find((part) => part.id === partId)?.name).filter(Boolean);
  const hasFrontSelection = selectedParts.some((partId) => ['chest', 'shoulders', 'abs', 'legs', 'arms'].includes(partId));
  const hasBackSelection = selectedParts.some((partId) => ['back', 'legs', 'arms'].includes(partId));
  const availableViews = isFitness ? [hasFrontSelection && 'front', hasBackSelection && 'back'].filter(Boolean) : [training.view];
  const displayedView = availableViews.includes(view) ? view : (availableViews[0] || 'front');
  const image = isFitness ? (displayedView === 'back' ? '/images/anatomy-full-body-user-back.webp' : '/images/anatomy-full-body-user-front.webp') : training.image;
  const displayArea = isFitness ? (selectedPartNames.join(' · ') || 'Fitness') : training.area;

  return (
    <article className={'card anatomy-card' + (isWholeBody ? ' anatomy-card--whole-body' : '') + (isFitness ? ' anatomy-card--fitness' : '')}>
      <div className="card-heading"><h2>Training Focus</h2><div className="anatomy-heading-actions">{isFitness && availableViews.length > 1 && <span className="anatomy-view-switch"><button className={displayedView === 'front' ? 'active' : ''} type="button" onClick={() => onViewChange('front')}>Front</button><button className={displayedView === 'back' ? 'active' : ''} type="button" onClick={() => onViewChange('back')}>Rear</button></span>}</div></div>
      <div className="anatomy-layout">
        <div className="anatomy-copy">
          <strong>{displayArea}</strong>
          {(!isFitness || selectedPartNames.length > 0) && <p>{isFitness ? `${selectedPartNames.length} muscle ${selectedPartNames.length === 1 ? 'group' : 'groups'} selected. You can add more.` : training.detail}</p>}
          {!isWholeBody && <small>{isFitness ? (selectedPartNames.length ? <><i /> Highlighted areas show your selected muscles</> : 'Select one or more muscle groups') : <><i /> Highlighted areas show today’s training focus</>}</small>}
        </div>
        <div className={'anatomy-visual anatomy-visual--' + displayedView + (isWholeBody ? ' anatomy-visual--whole-body' : '') + (isFitness ? ' anatomy-visual--fitness' : '')}>
          <img src={image} alt={isFitness ? 'Full body' + (displayedView === 'front' ? 'Front' : 'Rear') + ' muscle anatomy' : isWholeBody ? 'Full-body athlete illustration' : training.area === 'Rest' ? 'Active recovery on a rest day' : training.area + ' training: ' + (displayedView === 'front' ? 'Front' : 'Rear') + ' muscle anatomy'} />
          <svg className="muscle-overlay" viewBox="0 0 1024 1536" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
            {isFitness && displayedView === 'front' && <g className="muscle-hotspot">
              {selectedParts.includes('shoulders') && <><path d="M301 284 C333 261 377 270 403 301 C419 334 403 381 378 403 C343 394 308 372 289 339 C282 315 287 295 301 284 Z" /><path d="M723 284 C691 261 647 270 621 301 C605 334 621 381 646 403 C681 394 716 372 735 339 C742 315 737 295 723 284 Z" /></>}
              {selectedParts.includes('chest') && <><path d="M501 307 C460 286 406 286 355 307 C319 322 304 352 317 375 C348 410 416 431 492 405 L501 367 Z" /><path d="M523 307 C564 286 618 286 669 307 C705 322 720 352 707 375 C676 410 608 431 532 405 L523 367 Z" /></>}
              {selectedParts.includes('abs') && <rect x="424" y="416" width="176" height="230" />}
              {selectedParts.includes('legs') && <><path d="M353 735 C389 709 460 719 494 766 L476 988 C434 1022 374 1008 347 941 Z" /><path d="M357 1057 C391 1038 442 1051 467 1097 L454 1260 C422 1294 375 1274 356 1215 Z" /><path d="M671 735 C635 709 564 719 530 766 L548 988 C590 1022 650 1008 677 941 Z" /><path d="M667 1057 C633 1038 582 1051 557 1097 L570 1260 C602 1294 649 1274 668 1215 Z" /></>}
              {selectedParts.includes('arms') && <><path d="M279 398 C303 381 343 400 359 431 L323 575 C301 602 266 593 244 561 Z" /><path d="M246 567 C273 548 312 562 326 595 L279 742 C252 758 211 730 203 691 Z" /><path d="M745 398 C721 381 681 400 665 431 L701 575 C723 602 758 593 780 561 Z" /><path d="M778 567 C751 548 712 562 698 595 L745 742 C772 758 813 730 821 691 Z" /></>}
            </g>}
            {isFitness && displayedView === 'back' && <g className="muscle-hotspot">
              {selectedParts.includes('back') && <><path d="M509 190 C456 167 394 192 361 226 C355 252 378 281 406 315 L494 391 C506 365 508 311 509 260 Z" /><path d="M515 190 C568 167 630 192 663 226 C669 252 646 281 618 315 L530 391 C518 365 516 311 515 260 Z" /><path d="M398 330 C350 329 318 356 305 400 C318 459 352 526 414 587 C446 605 475 578 492 540 L491 399 Z" /><path d="M626 330 C674 329 706 356 719 400 C706 459 672 526 610 587 C578 605 549 578 532 540 L533 399 Z" /></>}
              {selectedParts.includes('legs') && <><path d="M355 700 C393 676 458 692 490 739 L476 960 C434 995 374 981 349 913 Z" /><path d="M358 1027 C392 1007 441 1020 465 1062 L453 1235 C421 1267 375 1246 357 1182 Z" /><path d="M669 700 C631 676 566 692 534 739 L548 960 C590 995 650 981 675 913 Z" /><path d="M666 1027 C632 1007 583 1020 559 1062 L571 1235 C603 1267 649 1246 667 1182 Z" /></>}
              {selectedParts.includes('arms') && <><path d="M286 319 C314 296 352 317 369 353 L335 510 C311 543 277 530 255 490 Z" /><path d="M250 497 C278 481 315 498 328 532 L284 719 C255 735 218 708 209 668 Z" /><path d="M738 319 C710 296 672 317 655 353 L689 510 C713 543 747 530 769 490 Z" /><path d="M774 497 C746 481 709 498 696 532 L740 719 C769 735 806 708 815 668 Z" /></>}
            </g>}
            {!isFitness && training.region === 'shoulders' && <g className="muscle-hotspot"><path d="M5 18 C12 10, 27 14, 31 29 L27 47 C17 45, 9 36, 5 18 Z" /><path d="M95 18 C88 10, 73 14, 69 29 L73 47 C83 45, 91 36, 95 18 Z" /></g>}
            {!isFitness && training.region === 'back' && <g className="muscle-hotspot"><path d="M27 15 C40 24, 60 24, 73 15 L82 76 L63 87 L50 71 L37 87 L18 76 Z" /></g>}
            {!isFitness && training.region === 'chest' && <g className="muscle-hotspot" transform="translate(0 -2)"><path d="M23 19 C31 13, 43 14, 49.5 22 L49.5 45 C41 48, 27 45, 20 36 C18 29, 19 23, 23 19 Z" /><path d="M77 19 C69 13, 57 14, 50.5 22 L50.5 45 C59 48, 73 45, 80 36 C82 29, 81 23, 77 19 Z" /></g>}
            {!isFitness && training.region === 'abs' && <g className="muscle-hotspot"><rect x="35" y="43" width="30" height="54" rx="1.5" /></g>}
          </svg>
        </div>
      </div>
    </article>
  );
}

function ExerciseRecordEditor({ part, onSave }) {
  const exercises = partExerciseCatalog[part.id] || [];
  const [exercise, setExercise] = useState(exercises[0] || '');
  const measurement = getExerciseMeasurement(exercise);

  return (
    <form className="training-record-form training-record-form--strength exercise-record-form" aria-label={part.name + ' exercise log'} onSubmit={(event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const record = measurement.type === 'weighted'
        ? { exercise, type: measurement.type, weight: form.elements.weight.value, sets: form.elements.sets.value }
        : { exercise, type: measurement.type, value: form.elements.value.value, unit: measurement.unit };
      onSave(record);
    }}>
      <label className="exercise-select-label">Exercise
        <select value={exercise} onChange={(event) => setExercise(event.target.value)} aria-label={part.name + ' exercise'}>
          {exercises.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <div className={'exercise-record-fields exercise-record-fields--' + measurement.type}>
        {measurement.type === 'weighted' ? <>
          <label>Weight <input required type="number" min="0" max="500" step="0.1" name="weight" defaultValue={measurement.defaultValue} inputMode="decimal" /> kg</label>
          <label>Sets <input required type="number" min="1" max="100" step="1" name="sets" defaultValue="3" inputMode="numeric" /> sets</label>
        </> : <label>{measurement.label} <input required type="number" min="1" max="3600" step="1" name="value" defaultValue={measurement.defaultValue} inputMode="numeric" /> {measurement.unit}</label>}
      </div>
      <footer><button className="primary-action" type="submit">Save exercise</button></footer>
    </form>
  );
}

function App() {
  const [activeView, setActiveView] = useState('calendar');
  const [selectedCalendarDay, setSelectedCalendarDay] = useState({date:localDate(),label:new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'}),training:'Fitness'});
  const {journal,setJournal,ready,status}=useJournal();
  const date=selectedCalendarDay.date;
  const day=journal.days[date] || {};
  const field=(key,fallback)=>[day[key] ?? fallback, value=>setJournal(j=>({...j,days:{...j.days,[date]:{...j.days[date],[key]:typeof value==='function'?value(j.days[date]?.[key]??fallback):value}}}))];
  const rootField=(key)=>[journal[key], value=>setJournal(j=>({...j,[key]:typeof value==='function'?value(j[key]):value}))];
  const profile=withProfileDefaults(day.profile || {...journal.profile,weight:''});
  const [cardioRecords,setCardioRecords]=field('cardioRecords',{});
  const [strengthSession,setStrengthSession]=field('strengthSession',null);
  const restoreBackup=async(event)=>{
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    try {
      if(file.size>100*1024*1024)throw new Error('Backup exceeds 100 MB.');
      const restored=validateJournal(JSON.parse(await file.text()));
      await validateBackupPhotos(restored.photos);
      if(!window.confirm('Replace this browser’s records with this backup? Export your current records first if needed.'))return;
      setJournal(restored);setNotice('Backup restored.');
    }catch(error){setNotice('Import failed: '+error.message);}
  };
  const photoItems=[...journal.photos,...initialPhotos];
  const setPhotoItems=(items)=>setJournal(j=>({...j,photos:(typeof items==='function'?items([...j.photos,...initialPhotos]):items).filter(p=>!p.id.startsWith('moment-'))}));
  const [quoteIndex, setQuoteIndex] = useState(0);

  const [meals,setMeals]=field('meals',initialMeals);
  const mealNutrition=sumNutrition(meals);
  const galleryItems=galleryFor(meals.flatMap(m=>m.foods||[]));

  const [notice, setNotice] = useState('');
  const [waterEntries,setWaterEntries]=field('waterEntries',[]);
  const drinks=drinksNutrition(waterEntries);
  const nutrition=Object.fromEntries(Object.entries(mealNutrition).map(([key,value])=>[key,Math.round((value+drinks.totals[key])*10)/10]));
  const [fitnessPartsByDate,setFitnessPartsByDate]=rootField('fitnessPartsByDate');
  const [openFitnessPart, setOpenFitnessPart] = useState(null);
  const [openStrengthDetailsDate, setOpenStrengthDetailsDate] = useState(null);
  const [isFitnessActionFormOpen, setIsFitnessActionFormOpen] = useState(true);
  const [fitnessFormRevisions, setFitnessFormRevisions] = useState({});
  const [fitnessExerciseRecords,setFitnessExerciseRecords]=rootField('fitnessExerciseRecords');
  const [anatomyView, setAnatomyView] = useState('front');
  const [openCardioActivity, setOpenCardioActivity] = useState(null);
  const [selectedCardioActivity, setSelectedCardioActivity] = useState('run');
  const [selectedCardioActivities,setSelectedCardioActivities]=field('selectedCardioActivities',[]);
  const completedCardioActivities=Object.keys(cardioRecords);
  const [openBallSport, setOpenBallSport] = useState(null);
  const [selectedBallSport, setSelectedBallSport] = useState('football');
  const [selectedBallSports,setSelectedBallSports]=field('selectedBallSports',[]);
  const [ballSportRecords,setBallSportRecords]=field('ballSportRecords',{});
  const training=day.training || selectedCalendarDay.training;
  const isStrengthDetailsOpen=openStrengthDetailsDate===date;
  const selectedFitnessPartIds=fitnessPartsByDate[selectedCalendarDay.date] || [];
  const dayFitnessExerciseRecords=fitnessExerciseRecords[selectedCalendarDay.date] || {};
  const strengthIntensity=strengthMetFor(selectedFitnessPartIds,dayFitnessExerciseRecords)===5?'High intensity':'Moderate intensity';
  const energy=dailyEnergy(profile,training,{strengthSession,cardioRecords,ballSportRecords,strengthParts:selectedFitnessPartIds,strengthExercisesByPart:dayFitnessExerciseRecords});
  const plan=planFor(profile);

  const activeCardioActivity = cardioActivities.find((activity) => activity.id === selectedCardioActivity) || cardioActivities[0];
  const cardio = activeCardioActivity.name;

  const quote = quotes[quoteIndex];
  const cardioImage = cardio === 'Swimming' ? '100% 0%' : cardio === 'Running' ? '0% 100%' : '50% 100%';
  const isBallSportDay = training === 'Sports';
  const isFitnessDay = training === 'Fitness';
  const isRestDay = training === 'Rest';
  const selectedFitnessPartNames = selectedFitnessPartIds.map((partId) => fitnessBodyParts.find((part) => part.id === partId)?.name).filter(Boolean);
  const activeTraining = isFitnessDay ? {
    area: selectedFitnessPartNames.join(' · ') || 'Fitness',
    detail: selectedFitnessPartNames.length ? selectedFitnessPartNames.join('、') + ' combined workout' : 'Choose muscle groups for today',
    view: 'front',
    isFitness: true
  } : trainingProfiles[day.training || selectedCalendarDay.training] || trainingProfiles.Chest;
  const activeBallSport = ballSports.find((sport) => sport.id === selectedBallSport) || ballSports[0];
  const completedBallSports = Object.keys(ballSportRecords);


  const todayCalories = useMemo(() => nutrition.calories.toLocaleString('en-US'), [nutrition.calories]);
  const waterMilliliters = useMemo(() => waterEntries.reduce((total, entry) => total + (Number(entry.amount) || 0), 0), [waterEntries]);
  const waterLiters = waterMilliliters / 1000;
  const fitnessLabelsByDate = useMemo(() => Object.fromEntries(Object.entries(fitnessPartsByDate).map(([date, parts]) => [date, parts.map((partId) => fitnessBodyParts.find((part) => part.id === partId)?.name).filter(Boolean)])), [fitnessPartsByDate]);
  const intakeKnown=meals.some(meal=>(meal.foods||[]).length>0) || waterEntries.some(entry=>Number(entry.amount)>0 || Number(entry.scoops)>0);
  const energyBalance=energy.total==null?null:Math.round((nutrition.calories-energy.total)*10)/10;
  const macroSegments=[
    {label:'Protein',value:Math.round(nutrition.protein*4),tone:'protein'},
    {label:'Carbs',value:Math.round(nutrition.carbs*4),tone:'carbs'},
    {label:'Fat',value:Math.round(nutrition.fat*9),tone:'fat'}
  ];
  const unassignedCalories=Math.max(0,Math.round(nutrition.calories)-macroSegments.reduce((sum,segment)=>sum+segment.value,0));
  if(unassignedCalories)macroSegments.push({label:'Other / label difference',value:unassignedCalories,tone:'other'});
  const burnSegments=[
    {label:'Daily activity',value:energy.baseline??0,tone:'base'},
    ...(isFitnessDay?[{label:energy.strengthMet===5?'Strength · Higher volume':'Strength',value:energy.strength,tone:'strength'},{label:'Cardio',value:energy.cardio,tone:'cardio'}]:[]),
    ...(isBallSportDay?[{label:'Ball sports',value:energy.sports,tone:'sports'}]:[])
  ];
  const balanceReady=energy.complete && !drinks.caloriesIncomplete && intakeKnown;
  const burnNotice=energy.total==null?'Confirm Body Metrics and non-workout activity.':!energy.complete?isFitnessDay?'Log strength training to complete this estimate.':'Log ball sports to complete this estimate.':null;
  const balanceGoalLabel={recomp:'Body recomposition',maintain:'Maintain weight',lose:'Fat loss',gain:'Muscle gain'}[profile.goal];
  const balanceDisplay=balanceReady
    ? `${energyBalance>0?'+':''}${energyBalance.toLocaleString('en-US')}${plan?` / ${plan.balanceTarget>0?'+':''}${plan.balanceTarget.toLocaleString('en-US')}`:''} kcal`
    : '—';
  const actualBalanceDescription=<>Today's estimated <strong>{energyBalance<0?'calorie deficit':energyBalance>0?'calorie surplus':'energy balance'}</strong>.</>;
  const balanceAnnotation=<>You are currently <strong>{energyBalance<0?'losing fat':energyBalance>0?'gaining weight':'in energy balance'}</strong>.</>;

  const openFitnessPartEditor = (partId) => {
    const isAlreadySelected = (fitnessPartsByDate[selectedCalendarDay.date] || []).includes(partId);
    if (isAlreadySelected) {
      const willOpen = openFitnessPart !== partId;
      setOpenFitnessPart(willOpen ? partId : null);
      if (willOpen) setIsFitnessActionFormOpen(false);
      return;
    }
    setFitnessPartsByDate((current) => {
      const selected = current[selectedCalendarDay.date] || [];
      return selected.includes(partId) ? current : { ...current, [selectedCalendarDay.date]: selected.concat(partId) };
    });
    setIsFitnessActionFormOpen(true);
    setOpenFitnessPart(partId);
  };

  const addFitnessExercise = (partId) => {
    setOpenFitnessPart(partId);
    setIsFitnessActionFormOpen(true);
    setFitnessFormRevisions((current) => ({ ...current, [partId]: (current[partId] || 0) + 1 }));
  };

  const toggleFitnessPartSelection = (partId) => {
    const isAlreadySelected = (fitnessPartsByDate[selectedCalendarDay.date] || []).includes(partId);
    setFitnessPartsByDate((current) => {
      const selected = current[selectedCalendarDay.date] || [];
      return {
        ...current,
        [selectedCalendarDay.date]: isAlreadySelected
          ? selected.filter((selectedPartId) => selectedPartId !== partId)
          : selected.concat(partId)
      };
    });
    setOpenFitnessPart((current) => isAlreadySelected ? (current === partId ? null : current) : partId);
    if (!isAlreadySelected) setIsFitnessActionFormOpen(true);
  };

  const saveFitnessExercise = (partId, record) => {
    setFitnessExerciseRecords((current) => {
      const dailyRecords = current[selectedCalendarDay.date] || {};
      return {
        ...current,
        [selectedCalendarDay.date]: {
          ...dailyRecords,
          [partId]: [...(dailyRecords[partId] || []), { ...record, id: `${partId}-${Date.now()}` }]
        }
      };
    });
    const partName = fitnessBodyParts.find((part) => part.id === partId)?.name || 'Training';
    setIsFitnessActionFormOpen(false);
    setFitnessFormRevisions((current) => ({ ...current, [partId]: (current[partId] || 0) + 1 }));
    setNotice(`${partName} · ${record.exercise} saved.`);
  };

  const toggleCardioActivity = (activityId) => {
    const isSelected = selectedCardioActivities.includes(activityId);
    const isComplete = completedCardioActivities.includes(activityId);

    if (isSelected || isComplete) {
      setSelectedCardioActivities((current) => current.filter((id) => id !== activityId));
      setCardioRecords(current=>Object.fromEntries(Object.entries(current).filter(([id])=>id!==activityId)));
      setOpenCardioActivity((current) => current === activityId ? null : current);
      return;
    }

    setSelectedCardioActivities((current) => current.concat(activityId));
    setSelectedCardioActivity(activityId);
    setOpenCardioActivity(activityId);
  };

  const toggleBallSportSelection = (sportId) => {
    const isSelected = selectedBallSports.includes(sportId);
    if(isSelected)setBallSportRecords(current=>Object.fromEntries(Object.entries(current).filter(([id])=>id!==sportId)));
    setSelectedBallSports((current) => isSelected ? current.filter((id) => id !== sportId) : current.concat(sportId));
    setOpenBallSport((current) => isSelected ? (current === sportId ? null : current) : sportId);
    if (!isSelected) setSelectedBallSport(sportId);
  };

  const removeFitnessExercise = (partId, recordId) => {
    setFitnessExerciseRecords((current) => {
      const dailyRecords = current[selectedCalendarDay.date] || {};
      return {
        ...current,
        [selectedCalendarDay.date]: {
          ...dailyRecords,
          [partId]: (dailyRecords[partId] || []).filter((record) => record.id !== recordId)
        }
      };
    });
    setNotice('Exercise removed.');
  };

  const submitMeal=({id,name,foods})=>{
    const totals=sumNutrition([{foods}]);
    setMeals(current=>current.map(meal=>meal.id===id?{...meal,foods,summary:foods.length?foods.map(f=>f.label+' '+f.grams+' g').join(', '):'Not logged',calories:totals.calories,completed:foods.length>0}:meal));
    setNotice(name+' saved.');
  };
  if(!ready)return <main className="storage-loading"><h1>FitLog</h1><p role="status">{status}</p><button onClick={()=>window.location.reload()}>Reload</button>{status.includes('another tab') && <button onClick={()=>downloadBackup(journal)}>Export this tab’s draft</button>}</main>;

  return (
    <Suspense fallback={<main className="storage-loading">Loading FitLog…</main>}><div className="app-shell">
      {activeView!=='daily' && notice && <p role="status" className="record-notice">{notice}</p>}
      {activeView === 'home' ? <FirstInterface onStart={() => setActiveView('calendar')} /> : <>
      {activeView === 'daily' && <>
        <div className="aero-shards-stage" aria-hidden="true">
          <AeroShards
            backgroundColor="#020703"
            shardColor="#1E6A39"
            accentColor="#BD8754"
            placement="full"
            flow="stream"
            material="satin"
            detail="balanced"
            effect="none"
            scale={1}
            spread={1}
            depth={1}
            speed={0.68}
            spin={0.72}
            interaction="repel"
            density={1.1}
            shardSize={1}
            stretch={1.05}
            turbulence={0.85}
            glow={0.8}
            edgeSoftness={2}
            bloom={0.35}
            grain={0.025}
            chromaticAberration={0.004}
            transitionDuration={1}
            interactionRadius={1.25}
            interactionStrength={0.42}
            rippleIntensity={0.7}
            holdToGather={true}
          />
        </div>
        <div className="background-fallback" />
      </>}

      <div className={'site-frame site-frame--' + activeView}>
        {activeView === 'calendar' ? <>
          <div className="calendar-return">
            <button className="calendar-home-link" type="button" onClick={() => setActiveView('home')}>
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9.5 3.5 5 8l4.5 4.5" /></svg>
              <span>Back to Home</span>
            </button>
          </div>
          <CalendarView selectedDate={selectedCalendarDay.date} fitnessLabelsByDate={fitnessLabelsByDate} trainingByDate={Object.fromEntries(Object.entries(journal.days).map(([key,value])=>[key,value.training]))} onOpenDay={(day) => { setSelectedCalendarDay(day); setNotice(''); setOpenCardioActivity(null); setOpenBallSport(null); setOpenFitnessPart(null); setIsFitnessActionFormOpen(true); setActiveView('daily'); }} photoItems={photoItems} setPhotoItems={setPhotoItems} />
        </> : <main id="daily" className="page-content">
          <header className="day-header">
            <div>
              <button className="back-link" type="button" onClick={() => setActiveView('calendar')}>← Back to Calendar</button>
              <h1><TextType key={date} text={selectedCalendarDay.label} as="span" typingSpeed={72} initialDelay={100} pauseDuration={5000} loop={true} showCursor={true} cursorCharacter="|" cursorClassName="day-header-cursor" /></h1>
              <p>{activeTraining.dayLabel || activeTraining.area} day</p>
            </div>
          </header>

          <section className="top-grid">
            <GlowPanel><article className={'card profile-card' + (isBallSportDay || isFitnessDay ? ' profile-card--ball-day' : '')}>
              <ProfileEditor key={date} profile={profile} onSave={value=>setJournal(j=>({...j,profile:value,days:{...j.days,[date]:{...j.days[date],profile:value}}}))}/>
            </article></GlowPanel>

            <GlowPanel className="anatomy-glow" tone="training"><MuscleMap training={activeTraining} selectedParts={selectedFitnessPartIds} view={anatomyView} onViewChange={setAnatomyView} /></GlowPanel>
          </section>

          <section className="top-grid support-grid">
            <GlowPanel className="streak-glow" tone="training"><article className="card streak-card">
              <span>Training Streak</span>
              <strong><b>{trainingStreak(journal,date)}</b> days</strong>
            </article></GlowPanel>

            <GlowPanel className="quote-glow" tone="brown"><article className="card quote-card">
              <span className="quote-mark">“</span>
              <p aria-live="polite" aria-atomic="true">{quote.text}</p>
              <footer>
                <a href={quote.sourceUrl} target="_blank" rel="noopener noreferrer" title="Open quote source">— {quote.author}, {quote.work}</a>
                <button type="button" onClick={() => setQuoteIndex(nextQuoteIndex)}>Next quote ↻</button>
              </footer>
            </article></GlowPanel>
          </section>

          <section className="section">
            <div className="section-heading"><h2>Daily Nutrition</h2><span>Protein, carbs and fat</span></div>
            <div className="metric-grid">
              <MetricCard label="Protein" current={nutrition.protein} target={plan?.protein} unit="g" tone="protein" />
              <MetricCard label="Carbs" current={nutrition.carbs} target={plan?.carbs} unit="g" tone="carbs" />
              <MetricCard label="Fat" current={nutrition.fat} target={plan?.fat} unit="g" tone="fat" />
            </div>
          </section>

          <section className="section intake-grid">
            <GlowPanel className="intake-glow intake-glow--calories" tone="energy"><article className="card intake-card intake-card--calories"><span>Calorie Intake</span><b>{todayCalories}{plan?' / '+plan.calories:''} kcal</b><small>{drinks.caloriesIncomplete?'Protein powder calories are missing; total is incomplete.':!plan?'Confirm your profile and daily activity for a target.':nutrition.calories>plan.calories?'Above target: '+Math.round(nutrition.calories-plan.calories)+' kcal':'Remaining: '+Math.round(plan.calories-nutrition.calories)+' kcal'}</small><EnergyBar segments={macroSegments} total={nutrition.calories} target={plan?.calories} /></article></GlowPanel>
            <GlowPanel className="intake-glow intake-glow--water" tone="water"><article className="card intake-card intake-card--water"><span>Hydration</span><b>{waterLiters.toFixed(2)} L</b><small>Logged drinks · Fluid needs vary.</small></article></GlowPanel>
          </section>

          <section className="section energy-summary-grid" aria-label="Daily energy summary">
            <GlowPanel className="burn-glow" tone="energy"><article className="card burn-card"><span>Estimated Daily Burn</span><b>{energy.total==null?'—':energy.total.toLocaleString('en-US')+' kcal'}</b>{energy.total!=null && <EnergyBar segments={burnSegments} />}{burnNotice && <small>{burnNotice}</small>}{energy.excludedCardio && <small>Cardio records on a sports day are not included.</small>}</article></GlowPanel>
            <GlowPanel className="balance-glow" tone="training"><article className="card balance-card"><span className="balance-card-heading"><span>Intake − Burn</span>{plan && <span className="balance-goal">{balanceGoalLabel} goal</span>}</span><b>{balanceDisplay}</b><small>{!intakeKnown?'Log your food to see a balance.':drinks.caloriesIncomplete?'Enter protein powder calories per scoop to complete the balance.':!energy.complete?'Complete your training and profile to see a balance.':actualBalanceDescription}</small>{balanceReady && <small>{balanceAnnotation}</small>}</article></GlowPanel>
          </section>

          <section className="section">
            <div className="section-heading"><h2>Food Log</h2></div>
            <div className="food-layout">
              <GlowPanel><section className="card meals-card">
                <div className="card-heading"><h2>Meals</h2></div>
                {meals.map((meal) => <MealEditor key={date+meal.id} meal={meal} onSubmit={submitMeal} />)}
                <WaterEditor key={date} entries={waterEntries} onChange={setWaterEntries} />
              </section></GlowPanel>
              <GlowPanel className="food-glow" tone="brown"><FoodAccordion items={galleryItems} /></GlowPanel>
            </div>
            {notice && <p className="record-notice" aria-live="polite">{notice}</p>}
          </section>

          {!isRestDay && <section className="section">
            <div className="section-heading"><h2>Training Log</h2></div>
            {isBallSportDay ? <div className="training-layout ball-sport-layout">
              <GlowPanel className="training-glow training-glow--ball" tone="training"><article className="card training-card training-card--ball">
                <div className="card-heading"><h2>Sports</h2><span>{completedBallSports.length} / {ballSports.length} logged · Multiple activities allowed</span></div>
                {ballSports.map((sport) => {
                  const isOpen = openBallSport === sport.id;
                  const isComplete = completedBallSports.includes(sport.id);
                  const isSelected = selectedBallSports.includes(sport.id);
                  return <div className="ball-sport-record" key={sport.id}>
                    <div className={'ball-sport-row ' + (isSelected ? 'is-selected ' : '') + (isComplete ? 'complete' : '')}>
                      <button className="ball-sport-selection-toggle" type="button" aria-label={(isSelected ? 'Deselect ' : 'Select ') + sport.name} aria-pressed={isSelected} onClick={() => toggleBallSportSelection(sport.id)}><i aria-hidden="true" /></button>
                      <button className="ball-sport-editor-trigger" type="button" aria-expanded={isOpen} onClick={() => { if (!isOpen) { setSelectedBallSport(sport.id); setSelectedBallSports((current) => current.includes(sport.id) ? current : current.concat(sport.id)); } setOpenBallSport(isOpen ? null : sport.id); }}>
                        <span><b>{sport.name}</b></span><em>{isOpen ? 'Collapse log' : isComplete ? 'View log' : isSelected ? 'Continue log' : 'Select & log'}</em>
                      </button>
                    </div>
                    {isOpen && <SessionEditor key={date+sport.id} id={sport.id} name={sport.name} record={ballSportRecords[sport.id]} weight={profile.weight} onSave={record=>{setBallSportRecords(current=>({...current,[sport.id]:record}));setSelectedBallSports(current=>current.includes(sport.id)?current:[...current,sport.id]);setOpenBallSport(null);}} />}
                  </div>;
                })}
              </article></GlowPanel>
              <GlowPanel className="training-glow training-glow--ball" tone="training"><div className="training-image ball-sport-image" style={{ backgroundImage: `linear-gradient(180deg, rgba(3, 18, 8, .05), rgba(3, 15, 7, .91)), url('${activeBallSport.image}')` }}>
                <span>{activeBallSport.name}</span>
              </div></GlowPanel>
            </div> : <>
            {isFitnessDay && <div className="training-layout">
              <GlowPanel className="training-glow training-glow--strength" tone="brown"><article className="card training-card training-card--strength training-card--parts">
                <div className="card-heading"><h2>Strength Training</h2></div>
                <div className="body-part-picker" role="group" aria-label="Choose muscle groups for today">
                  {fitnessBodyParts.map((part) => {
                    const isSelected = selectedFitnessPartIds.includes(part.id);
                    const isOpen = isSelected && openFitnessPart === part.id;
                    const records = dayFitnessExerciseRecords[part.id] || [];
                    return <div className={'body-part-slot ' + (isOpen ? 'is-open' : '')} key={part.id}>
                      <div className={'body-part-option ' + (isSelected ? 'is-selected' : '')}>
                        <button className="body-part-selection-toggle" type="button" aria-label={(isSelected ? 'Deselect ' : 'Select ') + part.name} aria-pressed={isSelected} onClick={() => toggleFitnessPartSelection(part.id)}><i aria-hidden="true" /></button>
                        <button className="body-part-editor-trigger" type="button" aria-expanded={isOpen} onClick={() => openFitnessPartEditor(part.id)}><span><b>{part.name}</b></span><em>{isOpen ? 'Collapse log' : isSelected ? 'Continue log' : 'Select & log'}</em></button>
                      </div>
                      {isOpen && <div className="body-part-action-drawer">
                        <div className="body-part-drawer-heading"><span>{part.name} Training Log</span><div className="body-part-drawer-controls">{isFitnessActionFormOpen ? <button className="drawer-collapse-button" type="button" aria-expanded="true" onClick={() => setIsFitnessActionFormOpen(false)}>Hide menu</button> : <button className="drawer-add-button" type="button" onClick={() => addFitnessExercise(part.id)}>Add exercise</button>}</div></div>
                        {isFitnessActionFormOpen && <ExerciseRecordEditor key={part.id + '-' + (fitnessFormRevisions[part.id] || 0)} part={part} onSave={(record) => saveFitnessExercise(part.id, record)} />}
                        {!!records.length && <section className="part-exercise-history" aria-label={part.name + ' saved exercises'}>
                          <header><span>Saved exercises</span><small>{records.length} {records.length === 1 ? 'entry' : 'entries'}</small></header>
                          {records.map((record) => <div className="part-exercise-history-item" key={record.id}><i aria-hidden="true" /><strong>{record.exercise}</strong><span>{record.type === 'weighted' ? `${record.weight} kg · ${record.sets} sets` : `${record.value} ${record.unit}`}</span><button type="button" onClick={() => removeFitnessExercise(part.id, record.id)}>Remove</button></div>)}
                        </section>}
                      </div>}
                    </div>;
                  })}
                </div>
                <div className="strength-details-toggle-wrap">
                  <button
                    className="strength-details-toggle"
                    type="button"
                    aria-expanded={isStrengthDetailsOpen}
                    aria-controls={'strength-details-'+date}
                    aria-label={isStrengthDetailsOpen ? 'Hide strength training details' : 'Show strength training details'}
                    onClick={() => setOpenStrengthDetailsDate(isStrengthDetailsOpen ? null : date)}
                  />
                </div>
                <div className="strength-details" id={'strength-details-'+date} hidden={!isStrengthDetailsOpen}>
                  <SessionEditor key={date+'-strength'} id="strength" name="Strength Training" record={strengthSession} weight={profile.weight} onSave={setStrengthSession} />
                  <section className="strength-summary" aria-label="Strength training summary">
                    {selectedFitnessPartIds.length>0 ? <ul className="strength-summary-list">
                      {fitnessBodyParts.filter(part=>selectedFitnessPartIds.includes(part.id)).map(part=>{
                        const count=distinctExerciseCount(dayFitnessExerciseRecords[part.id]||[]);
                        return <li key={part.id}><span>{part.name}</span><small>{count} {count===1?'exercise':'exercises'}</small></li>;
                      })}
                    </ul> : <p>No body parts selected yet.</p>}
                    {selectedFitnessPartIds.length>0 && <strong className={'strength-intensity'+(strengthIntensity==='High intensity'?' is-high':'')}>{strengthIntensity}</strong>}
                  </section>
                </div>
              </article></GlowPanel>
              <GlowPanel className="training-glow training-glow--strength" tone="brown"><div className="training-image gym-image"><span>{selectedFitnessPartNames.join(' · ') || 'Strength Training'}</span></div></GlowPanel>
            </div>}

            <div className="training-layout cardio-layout">
              <GlowPanel className="training-glow training-glow--cardio" tone="cardio"><article className="card training-card training-card--cardio">
                <div className="card-heading"><h2>Cardio</h2></div>
                {cardioActivities.map((activity) => {
                  const isOpen = openCardioActivity === activity.id;
                  const isComplete = completedCardioActivities.includes(activity.id);
                  const isSelected = selectedCardioActivities.includes(activity.id) || isComplete;
                  return <div className="cardio-record" key={activity.id}>
                    <div className={'cardio-row ' + (isSelected ? 'is-selected ' : '') + (isComplete ? 'complete' : '')}>
                      <button className="cardio-selection-toggle" type="button" aria-label={(isSelected ? 'Deselect ' : 'Select ') + activity.name} aria-pressed={isSelected} onClick={() => toggleCardioActivity(activity.id)}><i aria-hidden="true" /></button>
                      <button className="cardio-editor-trigger" type="button" aria-expanded={isOpen} onClick={() => { if (!isOpen) { setSelectedCardioActivity(activity.id); setSelectedCardioActivities((current) => current.includes(activity.id) ? current : current.concat(activity.id)); } setOpenCardioActivity(isOpen ? null : activity.id); }}>
                        <span><b>{activity.name}</b></span><em>{isOpen ? 'Collapse log' : isComplete ? 'View log' : isSelected ? 'Continue log' : 'Select & log'}</em>
                      </button>
                    </div>
                    {isOpen && <SessionEditor key={date+activity.id} id={activity.id} name={activity.name} fields={activity.fields} record={cardioRecords[activity.id]} weight={profile.weight} onSave={record=>{setCardioRecords(current=>({...current,[activity.id]:record}));setSelectedCardioActivities(current=>current.includes(activity.id)?current:[...current,activity.id]);setOpenCardioActivity(null);}} />}
                  </div>;
                })}
              </article></GlowPanel>
              <GlowPanel className="training-glow training-glow--cardio" tone="cardio"><div className="training-image cardio-image" style={{ backgroundPosition: 'center, ' + cardioImage }}>
                <span>{cardio}</span>
              </div></GlowPanel>
            </div>
            </>}
          </section>}
        </main>}
      </div>
      </>}
    </div></Suspense>
  );
}

export default App;
