import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
// Pass the installed sharp package directory (or use a local installation).
const require=createRequire(process.env.FITLOG_SHARP_PATH || path.resolve('package.json'));
const sharp=require('sharp');
const root='public/images';
let before=0,after=0;
for(const name of await fs.readdir(root)) {
  if(!name.endsWith('.png'))continue;
  const input=path.join(root,name),output=input.replace(/\.png$/,'.webp');
  before+=(await fs.stat(input)).size;
  await sharp(input).resize({width:1920,withoutEnlargement:true}).webp({quality:82}).toFile(output);
  after+=(await fs.stat(output)).size;
}
async function replacePaths(dir){for(const item of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory())await replacePaths(file);else if(/\.(jsx|css|js)$/.test(file)){const text=await fs.readFile(file,'utf8');const result=text.replace(/(\/images\/[\w-]+)\.png/g,'$1.webp');if(result!==text)await fs.writeFile(file,result);}}}
await replacePaths('src');
console.log(JSON.stringify({before,after,savedPercent:Math.round((1-after/before)*100)}));
