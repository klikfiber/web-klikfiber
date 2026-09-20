import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cache = new Map();
function load(relative) {
  const filename = path.join(root, relative);
  if (cache.has(filename)) return cache.get(filename);
  if (filename.endsWith('.json')) return JSON.parse(fs.readFileSync(filename, 'utf8'));
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const require = specifier => load(specifier.startsWith('@/') ? specifier.slice(2) : path.relative(root, path.resolve(path.dirname(filename), specifier + '.ts')));
  new Function('require', 'module', 'exports', code)(require, module, module.exports);
  cache.set(filename, module.exports);
  return module.exports;
}
const { regionChildren, selectedRegion } = load('lib/regions.ts');
const { validAddress, priceCart } = load('lib/commerce.ts');
const { products } = load('lib/catalog.ts');
const rows = load('data/indonesia-regions.json');
assert.equal(regionChildren().length, 38);
for (const [code] of rows.filter(([code]) => code.length === 13)) {
  const region = selectedRegion(code);
  assert.ok(region, 'Missing postal code or hierarchy: ' + code);
  assert.ok(regionChildren(region.districtId).some(r => r.id === code));
}
const region = rows.map(([code]) => selectedRegion(code)).find(r => r?.village === 'Margahayu' && r.city === 'Kota Bekasi');
assert.ok(region);
const input = { ...region, name: 'Penerima QC', phone: '081234567890', street: 'Jalan Melati No. 12 RT 001 RW 002', landmark: 'Pagar biru' };
const clean = validAddress(input);
assert.equal(clean.phone, '+6281234567890');
assert.equal(clean.postal, region.postal);
assert.equal(clean.landmark, input.landmark);
assert.throws(() => validAddress({ ...input, villageId: '' }));
assert.throws(() => validAddress({ ...input, cityId: '31.01' }));
assert.throws(() => validAddress({ ...input, postal: '99999' }));
assert.throws(() => validAddress({ ...input, phone: 'abcd' }));
assert.equal(validAddress({ ...input, city: 'WRONG CITY' }).city, 'Kota Bekasi');
const featured = products.filter(p => p.category === 'Fusion Splicer');
assert.equal(featured.length, 4);
assert.ok(featured.every(p => p.price > 0 && !p.quote));
assert.equal(products.find(p => p.id === 'ucl-swift-k33a').price, 20000000);
assert.equal(products.find(p => p.id === 'ucl-swift-kf4a').price, 20000000);
const k33 = products.find(p => p.id === 'ucl-swift-k33');
assert.throws(() => priceCart([{ id: k33.id, qty: k33.stock + 1 }], 'regular'));
assert.equal(priceCart([{ id: k33.id, qty: 1 }], 'regular').subtotal, k33.price);
console.log('PASS: 38 provinces, all village hierarchy/postal mappings, address tampering, phone validation, 4 splicer prices, stock limits.');
