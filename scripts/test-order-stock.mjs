import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import postgres from 'postgres';
const cache=new Map();
function load(file) {
 file=path.resolve(file);if(cache.has(file))return cache.get(file);
 if(file.endsWith('.json')) return JSON.parse(fs.readFileSync(file,'utf8'));
 const module={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 new Function('require','module','exports',code)(name=>load(name.startsWith('@/') ? name.slice(2) : path.resolve(path.dirname(file),name+'.ts')),module,module.exports);
 cache.set(file,module.exports);return module.exports;
}
const {reserveOrderStock,restoreOrderStock}=load('lib/order-stock.ts');
const db=postgres(process.env.DATABASE_URL,{ssl:'require',max:1,prepare:false,connect_timeout:8});
const rollback=Error('ROLLBACK_TEST');
try {
 await db.begin(async tx=>{
  // Session-local table shadows production. Nothing is committed, including DDL.
  await tx`CREATE TEMP TABLE portal_products(id TEXT PRIMARY KEY,data JSONB NOT NULL) ON COMMIT DROP`;
  await tx`INSERT INTO portal_products VALUES('ucl-swift-k33','{"stock":2,"price":28500000,"name":"Preserved product metadata"}')`;
  const item={id:'ucl-swift-k33',qty:1,price:28500000};
  const stock=async()=>Number((await tx`SELECT data->>'stock' AS stock FROM portal_products WHERE id='ucl-swift-k33'`)[0].stock);
  await reserveOrderStock(tx,[item]);assert.equal(await stock(),1);
  await assert.rejects(tx.savepoint(async sub=>reserveOrderStock(sub,[{...item,qty:2}])));
  assert.equal(await stock(),1);
  await assert.rejects(tx.savepoint(async sub=>reserveOrderStock(sub,[{...item,price:1}])));
  assert.equal(await stock(),1);
  await reserveOrderStock(tx,[item]);assert.equal(await stock(),0);
  await assert.rejects(tx.savepoint(async sub=>reserveOrderStock(sub,[item])));
  await restoreOrderStock(tx,[{...item,qty:2}]);assert.equal(await stock(),2);
  assert.equal((await tx`SELECT data->>'name' AS name FROM portal_products WHERE id='ucl-swift-k33'`)[0].name,'Preserved product metadata');
  throw rollback;
 });
} catch(e) {if(e!==rollback)throw e;} finally {await db.end();}
console.log('PASS: actual PostgreSQL reservation/restock, depleted stock, price tampering, metadata preservation; all fixtures rolled back.');
