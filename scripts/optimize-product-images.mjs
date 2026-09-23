import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const catalog = await fs.readFile('lib/catalog.ts','utf8');
const names = [...new Set([...catalog.matchAll(/\/images\/([^'"\s]+\.(?:png|jpg|jpeg))/g)].map(m=>m[1]))];
await fs.mkdir('public/images/optimized',{recursive:true});
let before=0,after=0;
for (const name of names) {
  const source=path.join('public/images',name);
  const target=path.join('public/images/optimized',path.parse(name).name+'.webp');
  const bytes=await fs.readFile(source);
  await sharp(bytes).rotate().resize(800,800,{fit:'contain',background:'#ffffff',withoutEnlargement:true}).webp({quality:82}).toFile(target);
  const stat=await fs.stat(target);before+=bytes.length;after+=stat.size;
}
console.log(JSON.stringify({images:names.length,sourceBytes:before,optimizedBytes:after,reduction:1-after/before}));
