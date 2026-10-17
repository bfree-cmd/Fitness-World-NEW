import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);
process.env.FW_DOWNLOAD_SECRET='local-contract-test-secret-only';
process.env.PAYPAL_ENV='sandbox';
process.env.PAYPAL_CLIENT_ID='test-id';process.env.PAYPAL_CLIENT_SECRET='test-secret';
process.env.URL='https://fitnessworld.pro';process.env.RESEND_API_KEY='test-key';process.env.FW_EMAIL_FROM='Fitness World <support@example.test>';
const stores=new Map();let seq=0;
function memoryStore(name){
 if(stores.has(name))return stores.get(name);
 const data=new Map();
 const store={
  async get(key){return data.has(key)?structuredClone(data.get(key).value):null;},
  async getWithMetadata(key){const row=data.get(key);return row?{data:structuredClone(row.value),etag:row.etag}:null;},
  async setJSON(key,value,options={}){
   const prev=data.get(key);
   if((options.onlyIfNew&&prev)||(options.onlyIfMatch&&prev?.etag!==options.onlyIfMatch))return {modified:false};
   const etag=String(++seq);data.set(key,{value:structuredClone(value),etag});return {modified:true,etag};
  },
  list({prefix}){return (async function*(){yield {blobs:[...data.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))};})();}
 };
 stores.set(name,store);return store;
}
require('../netlify/functions/lib/blobs.js').__setBlobsModuleForTests({getStore:options=>memoryStore(options.name)});
process.env.FW_TRACKING_ENDPOINT='https://tracking.example.test/events';process.env.FW_TRACKING_SECRET='test-tracking-secret';
const emails=[],calls=[],tracking=[];
const orderID='TESTORDER12345',captureID='TESTCAPTURE12345';
const paypalOrder={id:orderID,status:'COMPLETED',purchase_units:[{reference_id:'fitness-world-encyclopedia',payments:{captures:[{id:captureID,status:'COMPLETED',amount:{currency_code:'USD',value:'9.99'}}]}}]};
globalThis.fetch=async(url,options={})=>{
 calls.push(String(url));
 if(url==='https://tracking.example.test/events'){tracking.push(JSON.parse(options.body));return Response.json({success:true});}
 if(url==='https://api.resend.com/emails'){emails.push(JSON.parse(options.body));return Response.json({id:'mock-email-'+emails.length});}
 if(String(url).endsWith('/v1/oauth2/token'))return Response.json({access_token:'mock-oauth'});
 if(String(url)==='https://api-m.sandbox.paypal.com/v2/checkout/orders'){
  const body=JSON.parse(options.body);assert.equal(body.purchase_units[0].amount.value,'9.99');assert.equal(body.purchase_units[0].amount.currency_code,'USD');return Response.json({id:orderID});
 }
 if(String(url).startsWith('https://api-m.sandbox.paypal.com/v2/checkout/orders/'+orderID))return Response.json(paypalOrder);
 throw Error('Unexpected external request: '+url);
};
const {signPayload}=require('../netlify/functions/lib/fw.js');
const {releasedFiles,purchaseEmail,fileKeys,secureHeaders,policy,privateHash,newDownloadLink}=require('../netlify/functions/lib/reset-bundle.js');
const {takeRateSlot,paymentStore,purchaseForEmail}=require('../netlify/functions/lib/bundle-access.js');
const handlers=require('../netlify/functions/lib/bundle-handlers.js');
const req=(token,file)=>({httpMethod:'GET',headers:{'x-nf-client-connection-ip':'192.0.2.1'},queryStringParameters:{token,file}});
const assertPrivacy=r=>{for(const [key,value] of Object.entries(secureHeaders))assert.equal(r.headers[key],value);};
// Exercise the actual create/capture adapters against sandbox-only mocked APIs.
const {default:createOrder}=await import('../netlify/functions/paypal-create-order.mjs');
const {default:captureOrder}=await import('../netlify/functions/paypal-capture-order.mjs');
const post=(path,body)=>new Request('https://fitnessworld.pro/.netlify/functions/'+path,{method:'POST',headers:{'Content-Type':'application/json','x-nf-client-connection-ip':'192.0.2.2'},body:JSON.stringify(body)});
const created=await createOrder(post('paypal-create-order',{email:'buyer@example.test',checkoutId:'test-checkout'}));assert.equal(created.status,200);
const result=await captureOrder(post('paypal-capture-order',{orderID,email:'buyer@example.test'}));assert.equal(result.status,200);
const purchase=await result.json();assert.equal(purchase.status,'COMPLETED');assert.equal(purchase.deliveryStatus,'Delivered');
const url=new URL(purchase.downloadUrl),token=url.searchParams.get('token');assert.equal(url.pathname,'/.netlify/functions/reset-downloads');
assert.equal(tracking.length,1);assert.equal(tracking[0].event_type,'paid_purchase');assert.equal(tracking[0].gross_amount,9.99);
assert.equal(emails.length,1);assert.ok(emails[0].text.includes(purchase.downloadUrl));assert.ok(!emails[0].text.includes('The Wellness Reference Library'));
assert.deepEqual(releasedFiles().map(f=>f.id),['reset','tracker','cheatsheet']);
const privateStore=memoryStore('fw-private-assets');
const pdfFixtures=new Map();
for(const id of ['reset','tracker','cheatsheet']){
 let bytes=Buffer.from('%PDF-1.7\nmock '+id);
 if(process.env.FW_BONUS_TEST_DIR&&id!=='reset')bytes=await readFile(process.env.FW_BONUS_TEST_DIR+'/'+fileKeys[id]);
 pdfFixtures.set(id,bytes);await privateStore.setJSON(fileKeys[id],bytes);
}
let page=await handlers.downloads(req(token));assert.equal(page.statusCode,200);assertPrivacy(page);assert.ok(page.body.includes('noindex, nofollow'));assert.ok(page.body.includes('30-Day Printable Tracker'));assert.ok(!page.body.includes('The Wellness Reference Library'));assert.ok(!page.body.includes('googletagmanager'));assert.equal((page.body.match(/Download /g)||[]).length,3);
for(const badToken of ['',token+'x',token+'.extra',signPayload({orderID,email:'buyer@example.test',product:'reset',exp:Date.now()-1000})]){
 const r=await handlers.downloads(req(badToken));assertPrivacy(r);assert.ok(r.body.includes('Resend my download link'));assert.ok(!r.body.includes('class="files"'));
}
for(const id of ['reset','tracker','cheatsheet']){
 const r=await handlers.downloadFile(req(token,id));assert.equal(r.statusCode,200);assertPrivacy(r);assert.equal(r.headers['Content-Type'],'application/pdf');assert.deepEqual(Buffer.from(r.body,'base64'),pdfFixtures.get(id));
}
assert.equal((await handlers.downloadFile(req(token,'library'))).statusCode,404);
assert.equal((await handlers.downloadFile(req('','tracker'))).statusCode,403);
assert.equal((await handlers.downloadFile(req(signPayload({orderID:'NOORDER999',email:'buyer@example.test',product:'reset',exp:Date.now()+10000}),'reset'))).statusCode,403);
const {default:fileRoute}=await import('../netlify/functions/download-reset-file.mjs');
let wire=await fileRoute(new Request('https://fitnessworld.pro/.netlify/functions/download-reset-file?file=tracker&token='+token));assert.deepEqual(Buffer.from(await wire.arrayBuffer()),pdfFixtures.get('tracker'));
wire=await fileRoute(new Request('https://fitnessworld.pro/.netlify/functions/download-reset-file?file=tracker&token='+token,{method:'HEAD'}));assert.equal(wire.status,200);assert.equal(await wire.text(),'');
console.log('PASS: mocked sandbox purchase, email/page shared link, three private PDFs, HEAD bytes, token tampering/expiry, unreleased-file protection and privacy headers.');
// Legacy purchases remain discoverable; an unpaid intent cannot receive a link.
const ledger=await paymentStore();await ledger.setJSON('order/LEGACY123',{orderID:'LEGACY123',email:'legacy@example.test',status:'delivered'});await ledger.setJSON('intent/LEGACY123',{email:'legacy@example.test'});assert.ok(await purchaseForEmail('legacy@example.test'));
await ledger.setJSON('intent/UNPAID123',{email:'unpaid@example.test'});assert.equal(await purchaseForEmail('unpaid@example.test'),null);
const limited=memoryStore('concurrent-limits');assert.equal((await Promise.all(Array.from({length:20},()=>takeRateSlot(limited,'same',3,3600000)))).filter(Boolean).length,3);
const resendReq=(email,ip='192.0.2.10',extra={})=>({httpMethod:'POST',headers:{'content-type':'application/json','x-nf-client-connection-ip':ip},body:JSON.stringify({email,...extra})});
const initialEmails=emails.length;let generic;
for(const [email,extra] of [['buyer@example.test',{}],['unknown@example.test',{}],['unpaid@example.test',{}],['buyer@example.test',{website:'bot'}]]){
 const r=await handlers.resend(resendReq(email,'192.0.2.10',extra));assertPrivacy(r);generic??=r.body;assert.equal(r.body,generic);
}
assert.equal(emails.length,initialEmails+1);
const firstNewLink=emails.at(-1).text.match(/Open your download page: (\S+)/)[1];assert.notEqual(firstNewLink,purchase.downloadUrl);assert.equal((await handlers.downloads(req(new URL(firstNewLink).searchParams.get('token')))).statusCode,200);
for(let i=0;i<3;i++)assert.equal((await handlers.resend(resendReq('buyer@example.test'))).body,generic);
assert.equal(emails.length,initialEmails+3);
// Force a persistent IP bucket to capacity and verify no additional send.
await memoryStore('fw-reset-resend-limits').setJSON('ip/'+privateHash('192.0.2.99'),{count:policy.ipLimit,reset:Date.now()+policy.windowMs});
assert.equal((await handlers.resend(resendReq('buyer@example.test','192.0.2.99'))).body,generic);assert.equal(emails.length,initialEmails+3);
assert.equal((await handlers.resend({...resendReq('buyer@example.test'),httpMethod:'GET'})).statusCode,405);
assert.equal(tracking.length,1);
console.log('PASS: legacy buyer lookup, unpaid/unknown/honeypot generic replies, fresh 24-hour links, email/IP limits and concurrent compare-and-set counters.');
const checkout=await readFile('assets/js/natural-checkout-v15166.js','utf8');assert.ok(checkout.includes('OPEN YOUR DOWNLOAD PAGE'));assert.ok(checkout.includes("const PRICE=9.99"));
assert.ok(!calls.some(u=>u.startsWith('https://api-m.paypal.com')));
console.log('All bundle contract tests passed. Only mocked APIs used; no payment taken and no email sent.');
