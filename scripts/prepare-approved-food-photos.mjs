// Package the user-approved ImageGen outputs; never calls an image API.
// Usage: FITLOG_SHARP_PATH=/path/to/sharp/package.json node scripts/prepare-approved-food-photos.mjs /path/to/generated_images/thread
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const require=createRequire(process.env.FITLOG_SHARP_PATH || path.resolve('package.json'));
const sharp=require('sharp');
const sourceDir=process.argv[2];
if(!sourceDir)throw new Error('Pass the directory containing the approved generated PNGs.');
const selections=[
  ['beef','Beef','1603dc2f-cfde-40dd-94b8-1d3eef016c01'],
  ['chicken-breast','Chicken breast','1965679c-d463-49aa-9ed6-734d97577053'],
  ['pork-sausage','Pork sausage','0f6ca0cb-9c93-4c7b-8187-47a39aaa082b'],
  ['salmon','Salmon','3528d907-0dff-4fd0-9d15-df001476d2b0'],
  ['eggs','Eggs','c10a86a3-c876-42f5-b403-777318c69715'],
  ['broccoli','Broccoli','cf7c2911-5997-47e5-8599-c0083694ba8b'],
  ['lettuce','Lettuce','d3b1c3f8-0d7d-4802-adc6-5e9d2b410ad9'],
  ['tomato','Tomato','d4c5f16e-b98d-4c7d-97ba-4fd76b7dae6f'],
  ['potato','Potato','8dadd913-1779-4dd9-9b43-dce90df5a3d4'],
  ['fruit','Fruit','c322146c-3648-4eb4-81b1-8dc6c2b5294c'],
  ['flatbread','Pizza & burrito','722e2b0c-777a-41af-9dc3-858f43cf1377']
];
await fs.mkdir('public/images/foods-ai-v1',{recursive:true});
const records=[];
for(const [id,label,generatedId] of selections){
  const src=`/images/foods-ai-v1/${id}.webp`;
  const info=await sharp(path.join(sourceDir,`exec-${generatedId}.png`)).resize({width:960,withoutEnlargement:true}).webp({quality:85}).toFile(`public${src}`);
  records.push({id,label,src,source:'AI-generated with OpenAI ImageGen',generatedFile:`exec-${generatedId}.png`,approved:true,width:info.width,height:info.height,bytes:info.size,style:'Charcoal slate tabletop, off-white ceramic plate, soft upper-left daylight, elevated camera angle.',use:'Category illustration only; not used to calculate nutrition.'});
}
await fs.writeFile('public/images/foods-ai-v1/manifest.json',JSON.stringify(records,null,2)+'\n');
const escape=s=>s.replaceAll('&','&amp;');
const figures=records.map(r=>`<figure><img src="${r.src}" alt="${escape(r.label)} — AI-generated food illustration" width="${r.width}" height="${r.height}" loading="lazy"><figcaption>${escape(r.label)}</figcaption></figure>`).join('\n');
await fs.writeFile('public/food-library.html',`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Food Photo Library · FitLog</title>
<style>:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#081009;color:#e7efdf;font:16px/1.6 system-ui,sans-serif}main{max-width:1200px;margin:auto;padding:32px 24px}h1{font-size:32px;line-height:1.2}a{color:#c2df9b;text-underline-offset:4px}a:focus-visible{outline:2px solid #c2df9b;outline-offset:4px}.intro{max-width:72ch;color:#bbc7b4;margin:20px 0 32px}.photos{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr));gap:32px 24px}figure{margin:0;min-width:0}img{display:block;width:100%;height:auto;border-radius:12px;background:#17231a}figcaption{padding-top:12px;font-weight:600}</style></head>
<body><main><a href="/">← Back to FitLog</a><h1>Food Photo Library</h1><p class="intro">11 approved AI-generated food illustrations, stored locally with a consistent photographic style. Blueberries, banana, mandarin orange, cantaloupe and grapes share the fruit image. Pizza and burritos share one image showing both. Pictures represent categories, not your exact portion or nutrition.</p><div class="photos">${figures}</div><p class="intro">Generated with OpenAI ImageGen. No external photo search or image service is used when logging meals. <a href="/images/foods-ai-v1/manifest.json">Asset details</a></p></main></body></html>`);
console.log(JSON.stringify({images:records.length,bytes:records.reduce((sum,r)=>sum+r.bytes,0)}));
