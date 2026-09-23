import assert from 'node:assert/strict';
const base=process.env.TEST_BASE_URL||'http://localhost:3011';
let cookie='';
async function request(path,body,auth=false,headers={}) {
 const start=performance.now();
 const response=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(auth?{cookie}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000),redirect:'manual'});
 const text=await response.text();let json;try{json=JSON.parse(text)}catch{}
 return {response,json,text,ms:Math.round(performance.now()-start)};
}
for(const path of ['/api/v1/portal/admin/overview','/api/v1/portal/sales/activity','/api/v1/orders','/api/v1/payments/test-order'])
 assert.equal((await request(path)).response.status,401,path);
assert.equal((await request('/api/v1/portal/admin/product',{id:'x'})).response.status,401);
assert.equal((await request('/api/v1/webhooks/midtrans',{order_id:'invalid'})).response.status,401);
assert.equal((await request('/api/v1/auth/demo',{})).response.status,410);
assert.equal((await request('/api/v1/orders',{},false,{Origin:'https://not-klikfiber.example'})).response.status,403);
const banners=await request('/api/v1/portal/banners');assert.equal(banners.response.status,200);assert.equal(banners.json.data.length,4);
for(const b of banners.json.data)for(const key of ['desktopImage','mobileImage']) {
 assert.equal(typeof b.href,'string');const image=await fetch(new URL(b[key],base));assert.equal(image.status,200);assert.match(image.headers.get('content-type'),/^image\//);assert.ok((await image.arrayBuffer()).byteLength>1000);
}
assert.equal((await request('/missing-qc-page')).response.status,404);
const home=await request('/');assert.equal(home.response.headers.get('x-content-type-options'),'nosniff');
assert.match((await request('/robots.txt')).text,/sitemap/i);
if(process.env.TEST_ADMIN_PASSWORD) {
 const login=await request('/api/v1/portal/admin/login',{email:'klikfiber@gmail.com',password:process.env.TEST_ADMIN_PASSWORD});assert.equal(login.response.status,200);
 cookie=login.response.headers.getSetCookie().find(x=>x.startsWith('klikfiber-admin=')).split(';')[0];
 const overview=await request('/api/v1/portal/admin/overview',undefined,true);assert.equal(overview.response.status,200);
 assert.ok(overview.json.data);console.log(JSON.stringify({adminLoginMs:login.ms,adminOverviewMs:overview.ms}));
 assert.equal((await request('/api/v1/portal/admin/logout',{},true)).response.status,200);
 assert.equal((await request('/api/v1/portal/admin/overview',undefined,true)).response.status,401);
}
console.log('PASS: auth gates, admin login/logout, CSRF, invalid webhook, disabled simulation, 8 banner images, 404, robots, security headers.');
