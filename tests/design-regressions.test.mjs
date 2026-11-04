import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let server, FirstInterface, SessionEditor, ProfileEditor, FoodAccordion, EnergyBar, MuscleMap, prepareDrinkEntries, arrangeWallItems;
before(async () => {
  server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  ({ EnergyBar, MuscleMap } = await server.ssrLoadModule('/src/App.jsx'));
  prepareDrinkEntries = (await server.ssrLoadModule('/src/components/WaterEditor.jsx')).prepareDrinkEntries;
  FirstInterface = (await server.ssrLoadModule('/src/components/FirstInterface.jsx')).default;
  SessionEditor = (await server.ssrLoadModule('/src/components/SessionEditor.jsx')).default;
  ProfileEditor = (await server.ssrLoadModule('/src/components/ProfileEditor.jsx')).default;
  FoodAccordion = (await server.ssrLoadModule('/src/components/FoodAccordion.jsx')).default;
  arrangeWallItems = (await server.ssrLoadModule('/src/components/DriftWall.jsx')).arrangeWallItems;
});
after(async () => { await server?.close(); });

test('photo wall varies images across columns and down each repeating track', () => {
  for (const count of [2, 3, 4]) {
    const photos = Array.from({ length: count }, (_, index) => ({ id: `photo-${index}` }));
    const columns = arrangeWallItems(photos, 4, () => 0.37);
    assert.equal(columns.length, 4);
    columns.forEach(column => {
      assert.deepEqual(new Set(column), new Set(photos));
      for (let row = 0; row < count; row += 1) {
        assert.notEqual(column[row], column[(row + 1) % count]);
      }
    });
    for (let row = 0; row < count; row += 1) {
      for (let col = 1; col < columns.length; col += 1) {
        assert.notEqual(columns[col][row], columns[col - 1][row]);
      }
    }
  }
  const solo = { id: 'only-photo' };
  assert.deepEqual(arrangeWallItems([solo], 4, () => 0.37), [[solo], [solo], [solo], [solo]]);
});

test('calorie intake bar fills by intake versus target without changing macro proportions or burn bar', () => {
  const segments = [
    { label: 'Protein', value: 758, tone: 'protein' },
    { label: 'Carbs', value: 323, tone: 'carbs' },
    { label: 'Fat', value: 551, tone: 'fat' },
  ];
  const intake = renderToStaticMarkup(createElement(EnergyBar, { segments, total: 1407.5, target: 2647 }));
  assert.match(intake, /class="energy-segments-fill" style="width:53\.17\d*%"/);
  assert.match(intake, /energy-segment--protein" style="flex-grow:758"/);
  assert.match(intake, /energy-segment--carbs" style="flex-grow:323"/);
  assert.match(intake, /energy-segment--fat" style="flex-grow:551"/);
  const overTarget = renderToStaticMarkup(createElement(EnergyBar, { segments, total: 2800, target: 2647 }));
  assert.match(overTarget, /class="energy-segments-fill" style="width:100%"/);
  const burn = renderToStaticMarkup(createElement(EnergyBar, { segments }));
  assert.match(burn, /class="energy-segments-fill" style="width:100%"/);
});

test('hydration Save ignores fully blank rows but rejects incomplete drinks', async () => {
  const source = await readFile(new URL('../src/components/WaterEditor.jsx', import.meta.url), 'utf8');
  assert.match(source, /<form className="water-editor" onSubmit=\{save\}>/);
  assert.match(source, /<button className="primary-action" type="submit">Save drinks<\/button>/);
  const powder = { id: 'powder', type: 'Protein powder', scoops: '2', proteinPerScoop: '30', caloriesPerScoop: '100', amount: '300' };
  const milk = { id: 'milk', type: 'Milk', amount: '300' };
  const blank = { id: 'blank', type: '', amount: '' };
  assert.deepEqual(prepareDrinkEntries([powder, milk, blank]), [powder, milk]);
  assert.throws(() => prepareDrinkEntries([{ ...milk, amount: '' }]), /milliliters.*row 1/i);
  assert.throws(() => prepareDrinkEntries([{ ...powder, caloriesPerScoop: '' }]), /calories per scoop.*row 1/i);
  assert.throws(() => prepareDrinkEntries([{ ...blank, amount: '200' }]), /drink.*row 1/i);
  assert.doesNotMatch(source, /Nutrition per 100 mL/);
});

test('home keeps the approved personal text and Start without an added motto label', () => {
  const html = renderToStaticMarkup(createElement(FirstInterface, { onStart() {} }));
  assert.doesNotMatch(html, /Personal motto/);
  assert.doesNotMatch(html, /quote-source/);
  assert.match(html, /Patience is key in life/);
  assert.match(html, /Build a better version of myself, starting from here/);
  assert.match(html, />Start<\/button>/);
});

test('swimming offers two strokes alongside the three measurements and Save', () => {
  const fields = [
    { label: 'Stroke', value: 'Freestyle' },
    { label: 'Duration', value: '35', unit: 'min' },
    { label: 'Pool length', value: '25', unit: 'm' },
    { label: 'Laps', value: '24', unit: 'laps' },
  ];
  for (const record of [undefined, { fields: { Duration: 40, 'Pool length': 50, Laps: 20 }, met: 9.8, weight: 70 }]) {
    const html = renderToStaticMarkup(createElement(SessionEditor, { id: 'swim', name: 'Swimming', fields, record, weight: 70, onSave() {} }));
    assert.equal((html.match(/<input /g) || []).length, 3);
    assert.match(html, /<select[^>]*><option value="Freestyle"[^>]*>Freestyle<\/option><option value="Breaststroke"[^>]*>Breaststroke<\/option><\/select>/);
    assert.doesNotMatch(html, /Activity \/ intensity|MET|Saving uses|Saved estimate/);
    assert.match(html, />Save Swimming<\/button>/);
    assert.match(html, record ? /value="40"/ : /value="35"/);
    assert.match(html, /Laps<input[^>]*step="1"[^>]*min="1"/);
  }
});

test('food log keeps hydration and only the three requested meals', async () => {
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
  assert.match(app, /\['Breakfast','Lunch','Dinner'\]/);
  assert.doesNotMatch(app, /\['Breakfast','Lunch','Snack','Dinner'\]/);
  assert.match(app, /<WaterEditor key=\{date\}/);
});

test('sports and strength keep duration and saving without extra intensity controls', () => {
  for (const id of ['strength', 'football', 'basketball', 'badminton']) {
    const html = renderToStaticMarkup(createElement(SessionEditor, { id, name: id, weight: 70, onSave() {} }));
    assert.match(html, /Duration/);
    assert.match(html, /type="submit"/);
    assert.doesNotMatch(html, /<select|Activity \/ intensity|MET|Saving uses/);
    if(id==='strength') {
      assert.doesNotMatch(html, /Enter the full workout time|Calories are an estimate/);
      assert.match(html, /value=""/);
    }
  }
});

test('strength details expand beneath the muscle groups and intensity closes their summary', async () => {
  const [app, styles] = await Promise.all([
    readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/styles.css', import.meta.url), 'utf8'),
  ]);
  const picker=app.indexOf('<div className="body-part-picker"');
  const toggle=app.indexOf('className="strength-details-toggle"');
  const duration=app.indexOf('<SessionEditor key={date+\'-strength\'}');
  const summary=app.indexOf('<section className="strength-summary"');
  const intensity=app.indexOf('className={\'strength-intensity\'');
  assert.ok(picker>=0 && picker<toggle && toggle<duration && duration<summary && summary<intensity);
  assert.match(app, /<div className="card-heading"><h2>Strength Training<\/h2>/);
  assert.doesNotMatch(app, /\{selectedFitnessPartIds\.length\} \/ \{fitnessBodyParts\.length\} selected/);
  assert.match(app, /aria-expanded=\{isStrengthDetailsOpen\}/);
  assert.match(app, /className="strength-details" id=\{'strength-details-'\+date\} hidden=\{!isStrengthDetailsOpen\}/);
  assert.doesNotMatch(app, /<h3>Recorded body parts<\/h3>/);
  assert.doesNotMatch(app, /<h2>Strength Training ·/);
  assert.match(styles, /\.training-card--parts \.strength-details > \.training-record-form--strength\s*\{[^}]*border:\s*0/);
  assert.match(styles, /\.training-card--parts > \.card-heading,[\s\S]*?\.training-card--cardio > \.card-heading\s*\{[^}]*margin-bottom:/);
});

test('daily energy separates the approved training types without an added intensity selector', async () => {
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
  assert.match(app, /<SessionEditor key=\{date\+'-strength'\} id="strength"/);
  assert.match(app, /Estimated Daily Burn/);
  assert.match(app, /Daily activity/);
  assert.match(app, /Strength/);
  assert.match(app, /Cardio/);
  assert.match(app, /Ball sports/);
  assert.match(app, /Intake − Burn/);
  assert.doesNotMatch(app, /Estimated Net Exercise Calories/);
});

test('chest exercise menu includes seated chest press without replacing existing choices', async () => {
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
  const chestOptions = app.match(/chest:\s*\[([^\]]+)\]/)?.[1] || '';
  for (const exercise of ['Barbell Bench Press', 'Pec Deck Fly', 'Push-up', 'Parallel-bar Dip', 'Seated Chest Press']) {
    assert.match(chestOptions, new RegExp(exercise));
  }
});

test('cardio uses the strength-style text action and one full-width editor button', async () => {
  const [app, styles] = await Promise.all([
    readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/styles.css', import.meta.url), 'utf8'),
  ]);
  const row = app.match(/<div className=\{'cardio-row '[\s\S]*?<\/div>/)?.[0] || '';
  assert.match(row, /<button className="cardio-selection-toggle"/);
  assert.match(row, /<button className="cardio-editor-trigger"[^>]*aria-expanded=\{isOpen\}/);
  assert.match(row, /<span><b>\{activity\.name\}<\/b><\/span>[\s\S]*?<em>\{isOpen \? 'Collapse log' : isComplete \? 'View log' : isSelected \? 'Continue log' : 'Select & log'\}<\/em>/);
  assert.doesNotMatch(row, /cardio-row-action|Not logged|Selected'<\/em>/);
  assert.match(styles, /\.cardio-row:hover\s*\{[^}]*transform:\s*scale\(1\.01\)/);
  assert.match(styles, /button:is\([^}]*\.cardio-editor-trigger, \.cardio-selection-toggle[^}]*\):not\(:disabled\):hover\s*\{\s*transform:\s*none/);
});

test('strength, cardio and sports hover scale only their whole row', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  for (const row of ['body-part-option', 'cardio-row', 'ball-sport-row']) {
    assert.match(styles, new RegExp(`\\.${row}:hover\\s*\\{[^}]*transform:\\s*scale\\(1\\.01\\)`));
    assert.match(styles, new RegExp(`\\.${row}\\s*\\{[^}]*transform \\.18s cubic-bezier\\(\\.16, 1, \\.3, 1\\)`));
  }
  for (const button of ['body-part-editor-trigger', 'body-part-selection-toggle', 'cardio-editor-trigger', 'cardio-selection-toggle', 'ball-sport-editor-trigger', 'ball-sport-selection-toggle']) {
    assert.match(styles, new RegExp(`button:is\\([^}]*\\.${button}[^}]*\\):not\\(:disabled\\):hover\\s*\\{\\s*transform:\\s*none`));
  }
  assert.doesNotMatch(styles, /\.body-part-option:hover\s*\{[^}]*translateY/);
});

test('calendar day hover visibly lifts the whole card only for pointer users who allow motion', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  assert.match(styles, /\.calendar-day\s*\{[^}]*transition:[^}]*transform \.22s cubic-bezier\(\.16, 1, \.3, 1\)/);
  assert.match(styles, /@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*and\s*\(prefers-reduced-motion:\s*no-preference\)\s*\{\s*\.calendar-day:hover\s*\{\s*transform:\s*translateY\(-2px\) scale\(1\.025\)/);
  assert.doesNotMatch(styles, /\.calendar-day\s+(?:b|em|small|\.calendar-date):hover\s*\{[^}]*transform:\s*scale/);
});

test('training focus offers the three day types and only strength shows muscle guidance', () => {
  const rest = renderToStaticMarkup(createElement(MuscleMap, { training: { area: 'Rest', detail: 'Active recovery', view: 'front', image: '/images/rest-day-recovery.webp' }, trainingType: 'Rest' }));
  assert.match(rest, /aria-label="Change training day"/);
  for (const label of ['Rest', 'Sports', 'Strength Training']) assert.match(rest, new RegExp(`>${label}</button>`));
  assert.doesNotMatch(rest, /Highlighted areas/);
  const strength = renderToStaticMarkup(createElement(MuscleMap, { training: { area: 'Fitness', isFitness: true }, trainingType: 'Fitness', selectedParts: ['chest'] }));
  assert.match(strength, /Highlighted areas show your selected muscles/);
});

test('calendar month is plain and photo actions are consolidated in one corner menu', async () => {
  const [calendar, styles] = await Promise.all([
    readFile(new URL('../src/components/CalendarView.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/styles.css', import.meta.url), 'utf8'),
  ]);
  assert.doesNotMatch(calendar, /import StarBorder|<StarBorder/);
  assert.match(calendar, /<button[^>]*className="month-navigation__current"/);
  assert.match(calendar, /<details className="photo-menu">/);
  assert.match(calendar, /<summary[^>]*aria-label="Manage photos"/);
  assert.match(calendar, /Add photos/);
  assert.match(calendar, /uploadedPhotos\.map\(/);
  assert.match(calendar, /window\.confirm\('Remove this uploaded photo\?'\)/);
  assert.doesNotMatch(calendar, /photo-upload-button|photo-management|Manage uploaded photos/);
  assert.match(styles, /\.photo-menu__panel\s*\{[^}]*position:\s*absolute/);
  assert.match(styles, /\.photo-menu\s*>\s*summary\s*\{[^}]*color:\s*#fff\s*;/);
  assert.match(styles, /\.photo-menu\s*>\s*summary:hover\s*\{[^}]*color:\s*#fff\s*;/);
  assert.match(styles, /\.photo-menu__add\s*\{[^}]*color:\s*#fff\s*;/);
});

test('closed metrics and gallery do not add technical explanation blocks', () => {
  const profile = renderToStaticMarkup(createElement(ProfileEditor, { profile: {}, onSave() {} }));
  assert.match(profile, /Body Metrics/);
  assert.doesNotMatch(profile, /How targets are estimated|Body recomposition/);
  const gallery = renderToStaticMarkup(createElement(FoodAccordion, { items: [] }));
  assert.match(gallery, /Today&#x27;s Food Gallery/);
  assert.doesNotMatch(gallery, /Illustrative food photos|No foods logged|Food photo library/);
});

test('food gallery starts another row after five foods', () => {
  const items = Array.from({ length: 7 }, (_, index) => ({ label: `Food ${index + 1}`, pendingImage: true }));
  const html = renderToStaticMarkup(createElement(FoodAccordion, { items }));
  const starts = [...html.matchAll(/<div class="food-accordion">/g)].map(match => match.index);
  assert.equal(starts.length, 2);
  assert.equal((html.slice(starts[0], starts[1]).match(/class="food-panel/g) || []).length, 5);
  assert.equal((html.slice(starts[1]).match(/class="food-panel/g) || []).length, 2);
});

test('restored interface excludes unapproved calculation and provenance UI', async () => {
  const [app, meals, water, profile] = await Promise.all([
    readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/MealEditor.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/WaterEditor.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/ProfileEditor.jsx', import.meta.url), 'utf8'),
  ]);
  for (const text of [app, meals, water, profile]) {
    assert.doesNotMatch(text, /USDA \+ your labels|Use package \/ recipe nutrition|Strength session duration|Nutrition already included in Meals|Personal motto/);
  }
  assert.match(app, /Training Streak/);
  assert.match(app, /\{quote\.author\}, \{quote\.work\}/);
  assert.doesNotMatch(app, /Day type <select|· Source/);
  assert.doesNotMatch(meals, /Choose the preparation|Food \{index\+1\}|Saving replaces this meal/);
  assert.doesNotMatch(meals, /food-search-results|Matching USDA foods/);
  assert.doesNotMatch(water, /Drink labels contribute|Enter the drink's label/);
  assert.doesNotMatch(profile, /Default range: 18–20|No automatic calorie deficit|Starting estimate:/);
});
