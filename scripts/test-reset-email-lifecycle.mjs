import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
const require=createRequire(import.meta.url);
const {__setBlobsModuleForTests}=require('../netlify/functions/lib/blobs');
const lifecycle=require('../netlify/functions/lib/reset-email-lifecycle');
const records=new Map();let version=0,calls=[],contact=null,eventError=false,patchError=false;
const clone=x=>x==null?x:structuredClone(x);
const store={
 async get(k){return clone(records.get(k)?.data||null);},
 async getWithMetadata(k){return clone(records.get(k)||{data:null,etag:null});},
 async setJSON(k,data,options={}){const old=records.get(k);if(options.onlyIfNew&&old||options.onlyIfMatch&&options.onlyIfMatch!==old?.etag)return {modified:false};const etag=String(++version);records.set(k,{data:clone(data),etag});return {modified:true,etag};},
 async list({prefix}){return {blobs:[...records.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))};}
};
__setBlobsModuleForTests({getStore:()=>store});
globalThis.fetch=async(url,options={})=>{calls.push({url,method:options.method||'GET',body:options.body&&JSON.parse(options.body)});
 if(url.endsWith('/events/send')){if(eventError)throw new Error('Simulated ambiguous timeout');return new Response('{"event":"fw.preview.delivered.v1"}',{status:202});}
 if(options.method==='PATCH'){if(patchError)return new Response('{}',{status:503});contact={...contact,properties:{...contact?.properties,...JSON.parse(options.body).properties}};return new Response('{"id":"mock-contact"}');}
 if(options.method==='POST'){contact={id:'mock-contact',...JSON.parse(options.body)};return new Response(JSON.stringify(contact));}
 return contact?new Response(JSON.stringify(contact)):new Response('{}',{status:404});
};
const input={email:'audit@example.test',consent:true,consentVersion:'reset-welcome-v1',deliveryId:'accepted-delivery-1',source:'free_guide'};
let checks=0;const check=(value)=>{assert.ok(value);checks++;};
const reset=()=>{records.clear();calls=[];contact=null;eventError=false;patchError=false;};
process.env.RESEND_API_KEY='test-key';process.env.FW_RESET_EMAIL_AUTOMATION_ENABLED='true';process.env.FW_RESET_POSTAL_ADDRESS='Example Business, 123 Test Street, Test City';
process.env.CONTEXT='deploy-preview';check(!(await lifecycle.queuePreview(input)).queued);check(calls.length===0);
process.env.CONTEXT='production';delete process.env.FW_RESET_EMAIL_AUTOMATION_ENABLED;check(!(await lifecycle.queuePreview(input)).queued);
process.env.FW_RESET_EMAIL_AUTOMATION_ENABLED='true';delete process.env.FW_RESET_POSTAL_ADDRESS;check(!(await lifecycle.queuePreview(input)).queued);
process.env.FW_RESET_POSTAL_ADDRESS='POSTAL ADDRESS REQUIRED BEFORE ACTIVATION';check(!(await lifecycle.queuePreview(input)).queued);
process.env.FW_RESET_POSTAL_ADDRESS='Example Business, 123 Test Street, Test City';
for(const change of [{consentVersion:'old'},{deliveryId:''},{email:'invalid'}])check(!(await lifecycle.queuePreview({...input,...change})).queued);
check((await lifecycle.queuePreview(input)).queued);check(!(await lifecycle.queuePreview(input)).queued);check(calls.length===0);
await lifecycle.processOutbox();check(calls.filter(c=>c.url.endsWith('/events/send')).length===1);check(calls.find(c=>c.url.endsWith('/events/send')).body.payload.consent===true);
await lifecycle.processOutbox();check(calls.filter(c=>c.url.endsWith('/events/send')).length===1);
reset();check((await lifecycle.queuePreview({...input,consent:false})).queued);await lifecycle.processOutbox();check(calls.some(c=>c.url.endsWith('/events/send')&&c.body.payload.consent===false));check(contact.properties.fw_marketing_consent==='no');
reset();check((await lifecycle.queuePreview({...input,consent:'Yes'})).queued);await lifecycle.processOutbox();check(contact.properties.fw_marketing_consent==='no');
reset();await lifecycle.queuePreview(input);contact={id:'mock',unsubscribed:true};await lifecycle.processOutbox();check(!calls.some(c=>c.url.endsWith('/events/send')));check(!calls.some(c=>c.method==='PATCH'));
reset();await lifecycle.queuePreview(input);contact={id:'mock',unsubscribed:false,properties:{fw_reset_purchased:'yes'}};await lifecycle.processOutbox();check(!calls.some(c=>c.url.endsWith('/events/send')));
reset();await lifecycle.queuePreview(input);contact={id:'mock',unsubscribed:false,properties:{fw_reset_purchased:{value:'yes',type:'string'}}};await lifecycle.processOutbox();check(!calls.some(c=>c.url.endsWith('/events/send')));
reset();await lifecycle.queuePreview(input);await lifecycle.markBuyer(input.email);await lifecycle.processOutbox();check(!calls.some(c=>c.url.endsWith('/events/send')));check(!(await lifecycle.queuePreview(input)).queued);
reset();await lifecycle.queuePreview(input);eventError=true;await lifecycle.processOutbox();eventError=false;await lifecycle.processOutbox();check(calls.filter(c=>c.url.endsWith('/events/send')).length===1);check([...records.values()].some(r=>r.data.status==='uncertain'));
reset();contact={id:'mock',unsubscribed:false};patchError=true;await lifecycle.markBuyer(input.email);check([...records.values()].some(r=>r.data.status==='pending'));patchError=false;await lifecycle.processOutbox();check(contact.properties.fw_reset_purchased==='yes');
const config=JSON.parse(fs.readFileSync('docs/email/reset-welcome-v1.json','utf8'));check(config.status==='disabled');let day=0,sends=[];
for(const step of config.workflow.steps){if(step.type==='delay')day+=parseInt(step.config.duration);if(step.type==='send_email')sends.push(day);if(step.type==='condition'){const rules=step.config.rules;check(rules.some(r=>r.field==='contact.unsubscribed'&&r.value===false));check(rules.some(r=>r.field==='contact.properties.fw_reset_purchased'&&r.value==='yes'));}}
assert.deepEqual(sends,[1,3,6,9]);checks++;
for(const m of config.templates){check(!m.url.includes('/natural/'));check(m.url.includes('utm_content=day_'+m.day));}
console.log(`Reset email lifecycle: ${checks} checks passed; all provider calls mocked; no real emails or contacts created.`);
