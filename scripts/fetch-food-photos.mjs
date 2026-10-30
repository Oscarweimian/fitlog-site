// One-time asset preparation only. The website never calls Wikimedia at runtime.
// Run from the project root: node scripts/fetch-food-photos.mjs
import fs from 'node:fs/promises';

const selections = [
  ['beef', 'Beef', 'File:Beef steak (30715255916).jpg'],
  ['chicken-breast', 'Chicken breast', 'File:Grilled chicken breast, Santo Domingo, La Palma.jpg'],
  ['pork-sausage', 'Pork sausage', 'File:Pork sausages from Jasper Hill, Vermont - Massachusetts.jpg'],
  ['salmon', 'Salmon', 'File:Grilled plated salmon fillet.jpg'],
  ['eggs', 'Eggs', 'File:6-Pack-Chicken-Eggs.jpg'],
  ['broccoli', 'Broccoli', 'File:Broccoli close up (49200262862).jpg'],
  ['lettuce', 'Lettuce', 'File:ARS romaine lettuce.jpg'],
  ['tomato', 'Tomato', 'File:Tomatoes.jpg'],
  ['potato', 'Potato', 'File:Potatoes-5785 - Hans Braxmeier.jpg'],
  ['fruit', 'Fruit · shared photo', 'File:Winter Fruit Platter (Unsplash).jpg'],
  ['flatbread', 'Pizza & burrito · shared photo', 'File:Pizza-3007395.jpg']
];
const headers = { 'User-Agent': 'FitLogPersonalFoodLibrary/1.0 (local asset preparation; Wikimedia Commons)' };
async function request(url) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${response.status} from ${url}; stop and retry later (do not hammer the service).`);
  return response;
}
const plain = value => (value || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').trim();
const escape = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const api = new URL('https://commons.wikimedia.org/w/api.php');
api.search = new URLSearchParams({ action:'query', titles:selections.map(s=>s[2]).join('|'), prop:'imageinfo', iiprop:'url|extmetadata|size|sha1', iiurlwidth:'960', format:'json' });
const data = await (await request(api)).json();
if (data.error) throw new Error(JSON.stringify(data.error));
const pages = Object.values(data.query?.pages || {});
const records = [];
await fs.mkdir('public/images/foods', { recursive:true });
for (const [id, label, title] of selections) {
  const page = pages.find(p=>p.title === title);
  const info = page?.imageinfo?.[0];
  if (!info) throw new Error(`No image metadata for ${title}`);
  const meta = info.extmetadata;
  const license = plain(meta.LicenseShortName?.value);
  if (!/^(CC0|Public domain|CC BY(?:-SA)? [234]\.0)$/.test(license)) throw new Error(`Review license before using ${title}: ${license}`);
  const imageUrl = new URL(info.thumburl || info.url);
  imageUrl.search = '';
  await new Promise(resolve=>setTimeout(resolve,1200));
  const response = await request(imageUrl);
  if (!response.headers.get('content-type')?.startsWith('image/jpeg')) throw new Error(`Expected JPEG: ${title}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const src = `/images/foods/${id}-v1.jpg`;
  await fs.writeFile(`public${src}`, bytes);
  const record = {
    id, label, src, title, author:plain(meta.Artist?.value),
    description:plain(meta.ImageDescription?.value),
    source:info.descriptionurl, original:info.url.split('?')[0], downloadedFrom:imageUrl.href,
    license, licenseUrl:meta.LicenseUrl?.value || (license==='CC0'?'https://creativecommons.org/publicdomain/zero/1.0/':'https://creativecommons.org/publicdomain/mark/1.0/'),
    retrievedAt:new Date().toISOString().slice(0,10), originalSha1:info.sha1,
    changes:'Wikimedia-provided thumbnail; displayed with CSS crop. No generative edits.', bytes:bytes.length
  };
  records.push(record);
  console.log(`${id}: ${license}, ${bytes.length} bytes`);
}
await fs.writeFile('public/images/foods/credits.json', JSON.stringify(records,null,2)+'\n');
const figures = records.map(r=>`<figure><img src="${r.src}" alt="${escape(r.label)}" width="320" height="210" loading="lazy"><figcaption><h2>${escape(r.label)}</h2><p>${escape(r.author)}</p><p><a href="${escape(r.source)}">Original photo</a> · <a href="${escape(r.licenseUrl)}">${escape(r.license)}</a></p><small>${escape(r.changes)}</small></figcaption></figure>`).join('\n');
await fs.writeFile('public/food-library.html', `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Food Photo Library · FitLog</title>
<style>:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#081009;color:#e7efdf;font:16px/1.6 system-ui,sans-serif}main{max-width:1200px;margin:auto;padding:32px 24px}h1{font-size:32px;line-height:1.2}h2{font-size:18px;margin:0 0 8px}p{margin:8px 0}a{color:#c2df9b;text-underline-offset:4px}a:focus-visible{outline:2px solid #c2df9b;outline-offset:4px}.intro{max-width:72ch;color:#bbc7b4;margin:20px 0 32px}.photos{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:32px 24px}figure{margin:0;min-width:0}img{display:block;width:100%;height:210px;object-fit:cover;border-radius:12px;background:#17231a}figcaption{padding-top:16px;overflow-wrap:anywhere}small{font-size:14px;color:#bbc7b4}</style></head>
<body><main><a href="/">← Back to FitLog</a><h1>Food Photo Library</h1><p class="intro">11 locally stored reference photos. Fruit names share one fruit photo; pizza, burritos and tortillas share one pizza photo. Photos represent food categories, not the exact preparation or portion. Nutrition comes from your selected food record, never from a photo. Photo files load from this website, without an external image service.</p><div class="photos">${figures}</div><p class="intro">Sources and licenses are also included in <a href="/images/foods/credits.json">the downloadable photo manifest</a>. Share-alike licenses apply to the relevant photos, not the application code.</p></main></body></html>`);
console.log(`Saved ${records.length} photos (${records.reduce((sum,r)=>sum+r.bytes,0)} bytes) and local credits.`);
