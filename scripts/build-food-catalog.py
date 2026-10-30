"""Reproducible compact USDA SR Legacy catalog. Input: official CSV zip."""
import csv, io, json, sys, zipfile
from pathlib import Path
archive = zipfile.ZipFile(sys.argv[1])
def rows(name):
    path = next(p for p in archive.namelist() if p.endswith('/' + name) or p == name)
    return csv.DictReader(io.TextIOWrapper(archive.open(path), encoding='utf-8-sig'))
foods = {r['fdc_id']: r for r in rows('food.csv')}
values = {}
keys = {'1008':'kcal', '1003':'protein', '1004':'fat', '1005':'carbs', '1079':'fiber', '1093':'sodium'}
for row in rows('food_nutrient.csv'):
    if row['nutrient_id'] in keys:
        values.setdefault(row['fdc_id'], {})[keys[row['nutrient_id']]] = float(row['amount'])
result = []
for id, food in foods.items():
    nutrients = values.get(id, {})
    if not all(key in nutrients for key in ['kcal','protein','fat','carbs']): continue
    result.append({'id':id, 'label':food['description'], **nutrients})
Path('public/data').mkdir(exist_ok=True)
Path('public/data/usda-sr-2018-v1.json').write_text(json.dumps(result, separators=(',',':')))
print(f'Generated {len(result)} foods from USDA SR Legacy April 2018')
