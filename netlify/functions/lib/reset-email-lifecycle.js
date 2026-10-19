// No marketing sends are enabled by default. Activation requires a postal address,
// published templates, a tested Resend workflow, and production-only configuration.
const crypto=require('node:crypto');
const {getBlobsStore}=require('./blobs');
const VERSION='reset-welcome-v1';
// Contact properties may be returned as typed {value,type} records.
const propertyValue=value=>value&&typeof value==='object'?value.value:value;
const normalize=email=>String(email||'').trim().toLowerCase();
const keyFor=email=>crypto.createHash('sha256').update(normalize(email)).digest('hex');
const store=()=>getBlobsStore({name:'fw-email-lifecycle',consistency:'strong'});
const enabled=()=>process.env.CONTEXT==='production'&&process.env.FW_RESET_EMAIL_AUTOMATION_ENABLED==='true';
function postalAddress(){
 const value=String(process.env.FW_RESET_POSTAL_ADDRESS||'').trim();
 return value.length>=10&&!/required|placeholder|\[|\{|your address/i.test(value)?value:'';
}
async function api(path,options={}){
 const key=String(process.env.RESEND_API_KEY||'').trim();if(!key)throw new Error('Email automation credentials unavailable');
 const response=await fetch('https://api.resend.com'+path,{...options,headers:{Authorization:'Bearer '+key,'Content-Type':'application/json',...(options.headers||{})},signal:AbortSignal.timeout(5000)});
 if(response.status===404&&!options.method)return null;
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error('Email automation API HTTP '+response.status);
 return data;
}
async function queuePreview({email,consent,consentVersion,deliveryId,source}){
 if(!enabled()||consent!==true||consentVersion!==VERSION||!deliveryId||!postalAddress())return {queued:false};
 email=normalize(email);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return {queued:false};
 const s=await store(),hash=keyFor(email);
 if(await s.get('buyers/'+hash,{type:'json'}))return {queued:false,buyer:true};
 const result=await s.setJSON('enroll/'+hash,{email,consent:true,consent_version:VERSION,consent_at:new Date().toISOString(),delivery_id:String(deliveryId).slice(0,150),source:['free_guide','article_inline','popup'].includes(source)?source:'free_guide',status:'pending'},{onlyIfNew:true});
 return {queued:result.modified===true};
}
async function markBuyer(email){
 if(!enabled()||String(process.env.PAYPAL_ENV||'live').toLowerCase()==='sandbox')return;
 email=normalize(email);const s=await store(),hash=keyFor(email);
 await s.setJSON('buyers/'+hash,{email,purchased_at:new Date().toISOString(),status:'pending'});
 // Payment remains confirmed even if the provider is temporarily unavailable.
 // The durable marker also blocks any pending enrollment until the retry job runs.
 try{await syncBuyer(s,'buyers/'+hash,{email});}catch(_){console.error('[Fitness World] buyer email exclusion queued for retry');}
}
async function syncBuyer(s,key,record){
 const contact=await api('/contacts/'+encodeURIComponent(record.email));
 if(contact){await api('/contacts/'+encodeURIComponent(contact.id||record.email),{method:'PATCH',body:JSON.stringify({properties:{fw_reset_purchased:'yes'}})});}
 await s.setJSON(key,{...record,status:'synced',synced_at:new Date().toISOString()});
}
async function processOutbox(){
 if(!enabled()||!postalAddress())return {processed:0,disabled:true};
 const s=await store();let processed=0,failed=0;
 // Purchaser exclusions are synchronized before any new sequence is started.
 for(const prefix of ['buyers/','enroll/']){
  const listing=await s.list({prefix});
  let handled=0;
  for(const entry of (listing.blobs||[])){
   if(handled>=25)break;
   const key=entry.key,loaded=await s.getWithMetadata(key,{type:'json',consistency:'strong'}),record=loaded?.data;
   if(!record||['synced','sent','excluded','uncertain'].includes(record.status))continue;
   if(record.status==='processing'&&Date.now()-Number(record.claimed_at)<120000)continue;
   handled++;
   const claim=await s.setJSON(key,{...record,status:'processing',claimed_at:Date.now()},{onlyIfMatch:loaded.etag});if(!claim.modified)continue;
   let eventAttempted=false;
   try{
    if(prefix==='buyers/'){await syncBuyer(s,key,record);processed++;continue;}
    const hash=keyFor(record.email);
    if(await s.get('buyers/'+hash,{type:'json'})){await s.setJSON(key,{...record,status:'excluded',reason:'purchased'});continue;}
    let contact=await api('/contacts/'+encodeURIComponent(record.email));
    if(contact?.unsubscribed===true||propertyValue(contact?.properties?.fw_reset_purchased)==='yes'){await s.setJSON(key,{...record,status:'excluded',reason:'unsubscribed_or_purchased'});continue;}
    if(!contact)contact=await api('/contacts',{method:'POST',body:JSON.stringify({email:record.email,unsubscribed:false,properties:{fw_marketing_consent:'yes'}})});
    else await api('/contacts/'+encodeURIComponent(contact.id||record.email),{method:'PATCH',body:JSON.stringify({properties:{fw_marketing_consent:'yes'}})});
    // Recheck the durable buyer marker after contact writes, before dispatch.
    if(await s.get('buyers/'+hash,{type:'json'})){await s.setJSON(key,{...record,status:'excluded',reason:'purchased'});continue;}
    // Events API has no documented idempotency contract. Never auto-replay an
    // ambiguous dispatch; keep it for manual reconciliation instead of duplicates.
    await s.setJSON(key,{...record,status:'uncertain',attempted_at:new Date().toISOString()});eventAttempted=true;
    await api('/events/send',{method:'POST',body:JSON.stringify({event:'fw.preview.delivered.v1',email:record.email,payload:{consent:true,postal_address:postalAddress(),source:record.source,delivery_id:record.delivery_id}})});
    await s.setJSON(key,{...record,status:'sent',sent_at:new Date().toISOString()});processed++;
   }catch(_){failed++;if(!eventAttempted)await s.setJSON(key,{...record,status:'pending'});console.error('[Fitness World] email lifecycle job needs retry or reconciliation');}
  }
 }
 return {processed,failed};
}
module.exports={VERSION,enabled,postalAddress,queuePreview,markBuyer,processOutbox};
