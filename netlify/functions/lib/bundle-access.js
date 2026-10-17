const {getBlobsStore}=require('./blobs');
const {normalizeEmail,privateHash}=require('./reset-bundle');
const paymentStore=()=>getBlobsStore({name:'fw-payments-'+(String(process.env.PAYPAL_ENV||'live').toLowerCase()==='sandbox'?'sandbox':'live'),consistency:'strong'});
const emailKey=email=>'buyer/'+privateHash(normalizeEmail(email));
async function indexPurchase(orderID,email){
  await (await paymentStore()).setJSON(emailKey(email),{orderID,email:normalizeEmail(email)});
}
async function paidRecord(orderID,email){
  if(!/^[A-Za-z0-9-]{5,40}$/.test(String(orderID||'')))return null;
  const s=await paymentStore();
  const record=await s.get('order/'+orderID,{type:'json',consistency:'strong'});
  const intent=await s.get('intent/'+orderID,{type:'json',consistency:'strong'});
  // Order records are created only after a verified $9.99 PayPal capture.
  return record&&intent&&normalizeEmail(record.email)===normalizeEmail(email)&&normalizeEmail(intent.email)===normalizeEmail(email)?record:null;
}
async function purchaseForEmail(email){
  const s=await paymentStore(),entry=await s.get(emailKey(email),{type:'json',consistency:'strong'});
  if(entry){const record=await paidRecord(entry.orderID,email);if(record)return record;}
  // Compatibility for purchases made before the email index existed.
  // Pagination deliberately covers the full ledger; checkout intents alone never grant access.
  for await(const page of s.list({prefix:'order/',paginate:true})){
    for(const blob of page.blobs){
      const record=await s.get(blob.key,{type:'json',consistency:'strong'});
      if(record&&normalizeEmail(record.email)===email){
        const verified=await paidRecord(record.orderID,email);
        if(verified){await indexPurchase(record.orderID,email);return verified;}
      }
    }
  }
  return null;
}
// Persistent compare-and-set counters work across function instances.
async function takeRateSlot(store,key,limit,windowMs){
  for(let attempt=0;attempt<8;attempt++){
    const now=Date.now(),old=await store.getWithMetadata(key,{type:'json',consistency:'strong'});
    const active=old?.data&&now<old.data.reset;
    if(active&&old.data.count>=limit)return false;
    const data={count:active?old.data.count+1:1,reset:active?old.data.reset:now+windowMs};
    const saved=await store.setJSON(key,data,old?.etag?{onlyIfMatch:old.etag}:{onlyIfNew:true});
    if(saved.modified)return true;
  }
  return false;
}
module.exports={paymentStore,indexPurchase,paidRecord,purchaseForEmail,takeRateSlot};
