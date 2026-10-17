const {getBlobsStore}=require('./blobs');
const {paypalRequest,sendEmail}=require('./fw');
const {newDownloadLink,upgradeDownloadUrl,purchaseEmail}=require('./reset-bundle');
const {indexPurchase}=require('./bundle-access');
const {forwardTracking,clean}=require('./tracking');
const CLAIM_MS=2*60*1000;
const TRACK_CLAIM_MS=2*60*1000;
const safeOrder=id=>{if(!/^[A-Za-z0-9-]{5,40}$/.test(String(id||''))) throw new Error('Invalid PayPal order ID');return id;};
const env=()=>String(process.env.PAYPAL_ENV||'live').toLowerCase()==='sandbox'?'sandbox':'live';
const store=()=>getBlobsStore({name:'fw-payments-'+env(),consistency:'strong'});
const orderKey=id=>'order/'+safeOrder(id);
const intentKey=id=>'intent/'+safeOrder(id);
const attributionKey=id=>'attrib/'+safeOrder(id);
const trackedKey=id=>'tracked/'+safeOrder(id);
async function registerIntent(orderID,email){
  const result=await (await store()).setJSON(intentKey(orderID),{email,created_at:Date.now()},{onlyIfNew:true});
  if(!result.modified){
    const previous=await getIntent(orderID);
    if(previous?.email!==email) throw new Error('Order ID already registered to a different email');
  }
}
async function getIntent(orderID){return (await store()).get(intentKey(orderID),{type:'json',consistency:'strong'});}
async function confirmedOrder(orderID,expectedCapture){
  const order=await paypalRequest('/v2/checkout/orders/'+encodeURIComponent(safeOrder(orderID)));
  if(order.id!==orderID||order.status!=='COMPLETED') return null;
  const unit=order.purchase_units?.find(u=>u.reference_id==='fitness-world-encyclopedia');
  const capture=unit?.payments?.captures?.find(c=>c.id&&c.status==='COMPLETED'&&c.amount?.currency_code==='USD'&&c.amount?.value==='9.99'&&(!expectedCapture||c.id===expectedCapture));
  return capture||null;
}
async function loadRecord(orderID){
  return (await (await store()).getWithMetadata(orderKey(orderID),{type:'json',consistency:'strong'}))||{data:null,etag:null};
}
async function saveAttribution(orderID,data={}){
  const s=await store(),key=attributionKey(orderID);
  let sourcePage='/the-30-day-natural-wellness-reset/';
  try{sourcePage=new URL(String(data.eventSourceUrl||'')).pathname||'/the-30-day-natural-wellness-reset/';}catch(_){}
  const payload={
    source_page:clean(sourcePage,500)||'/the-30-day-natural-wellness-reset/',
    referrer_url:clean(data.first_referrer,1000),
    utm_source:clean(data.utm_source,300),
    utm_medium:clean(data.utm_medium,300),
    utm_campaign:clean(data.utm_campaign,300),
    utm_content:clean(data.utm_content,300),
    utm_term:clean(data.utm_term,300),
    saved_at:Date.now()
  };
  const result=await s.setJSON(key,payload,{onlyIfNew:true});
  if(result.modified)return payload;
  return (await s.get(key,{type:'json',consistency:'strong'}))||payload;
}
async function trackPurchaseOnce(orderID,captureID,deliveryStatus='Delivered'){
  const s=await store(),key=trackedKey(orderID),eventId='fw_purchase_'+safeOrder(orderID),now=Date.now();
  let entry=(await s.getWithMetadata(key,{type:'json',consistency:'strong'}))||{data:null,etag:null};
  let state=entry.data,etag=entry.etag,ownsClaim=false;
  if(state?.status==='sent')return {tracked:true,already:true,eventId};
  if(!state){
    const candidate={status:'claimed',claimed_at:now,event_id:eventId,capture_id:String(captureID||'')};
    const claim=await s.setJSON(key,candidate,{onlyIfNew:true});
    if(claim.modified){state=candidate;etag=claim.etag;ownsClaim=true;}
    else{
      entry=(await s.getWithMetadata(key,{type:'json',consistency:'strong'}))||{data:null,etag:null};
      state=entry.data;etag=entry.etag;
    }
  }
  if(!ownsClaim){
    if(state?.status==='sent')return {tracked:true,already:true,eventId};
    if(state?.status==='claimed'&&now-Number(state.claimed_at||0)<TRACK_CLAIM_MS)return {tracked:false,pending:true,eventId};
    const reclaimed={...(state||{}),status:'claimed',claimed_at:now,event_id:eventId,capture_id:String(captureID||state?.capture_id||'')};
    const claim=await s.setJSON(key,reclaimed,{onlyIfMatch:etag});
    if(!claim.modified)return {tracked:false,pending:true,eventId};
    state=reclaimed;etag=claim.etag;
  }
  const intent=await getIntent(orderID);
  if(!intent?.email)throw new Error('Cannot track purchase without saved checkout email');
  const attribution=(await s.get(attributionKey(orderID),{type:'json',consistency:'strong'}))||{};
  try{
    await forwardTracking({
      event_type:'paid_purchase',
      event_id:eventId,
      email:intent.email,
      product_offer:'30-Day Natural Wellness Reset',
      source_page:attribution.source_page||'/the-30-day-natural-wellness-reset/',
      source_form:'PayPal Checkout',
      referrer_url:attribution.referrer_url||'',
      utm_source:attribution.utm_source||'',
      utm_medium:attribution.utm_medium||'',
      utm_campaign:attribution.utm_campaign||'',
      utm_content:attribution.utm_content||'',
      utm_term:attribution.utm_term||'',
      order_id:orderID,
      transaction_id:String(captureID||state.capture_id||''),
      payment_provider:'PayPal',
      gross_amount:9.99,
      currency:'USD',
      payment_status:'Paid',
      marketing_consent:'No',
      capture_source:'PayPal',
      notes:'Purchase Event ID: '+eventId+' | Confirmed PayPal capture; delivery status: '+String(deliveryStatus||'Unknown')
    });
    const sent={...state,status:'sent',sent_at:Date.now()};
    await s.setJSON(key,sent,{onlyIfMatch:etag});
    return {tracked:true,already:false,eventId};
  }catch(error){
    const failed={...state,status:'failed',failed_at:Date.now(),last_error:clean(error?.message||error,300)};
    try{await s.setJSON(key,failed,{onlyIfMatch:etag});}catch(_){}
    throw error;
  }
}
async function deliver(orderID,event){
  const s=await store(),key=orderKey(orderID);
  const intent=await getIntent(orderID);
  // Never deliver to an address supplied by the webhook payload or a capture retry.
  if(!intent?.email) {console.error('[Fitness World] paid order has no saved checkout email',{orderID});return {status:'PENDING_CONFIRMATION',reason:'missing_intent'};}
  let {data:record,etag}=await loadRecord(orderID);
  const now=Date.now();
  let ownsClaim=false;
  if(!record){
    const {exp,downloadUrl}=newDownloadLink(event,orderID,intent.email);
    const candidate={status:'claimed',claimed_at:now,exp,downloadUrl,email:intent.email,orderID};
    const result=await s.setJSON(key,candidate,{onlyIfNew:true});
    if(result.modified){record=candidate;etag=result.etag;ownsClaim=true;}
    else ({data:record,etag}=await loadRecord(orderID));
  }
  if(!record||record.email!==intent.email) return {status:'PENDING_CONFIRMATION',reason:'ledger_conflict'};
  try{await indexPurchase(orderID,intent.email);}catch(_){console.error('[Fitness World] purchase lookup index unavailable');}
  if(record.status==='delivered') return {status:'COMPLETED',deliveryStatus:'Delivered',downloadUrl:upgradeDownloadUrl(record.downloadUrl)};
  if(!record.exp||Date.now()+60000>=record.exp) return {status:'PENDING_CONFIRMATION',reason:'link_expired'};
  if(!ownsClaim){
    if(Date.now()-record.claimed_at<CLAIM_MS) return {status:'PENDING_CONFIRMATION',reason:'claimed'};
    const reclaimed={...record,status:'claimed',claimed_at:Date.now()};
    const changed=await s.setJSON(key,reclaimed,{onlyIfMatch:etag});
    if(!changed.modified) return {status:'PENDING_CONFIRMATION',reason:'another_worker'};
    record=reclaimed;etag=changed.etag;
  }
  let deliveryStatus='Pending';
  try{
    await sendEmail({
      to:record.email,
      ...purchaseEmail(upgradeDownloadUrl(record.downloadUrl)),
      idempotencyKey:'paypal-capture/'+orderID
    });
    deliveryStatus='Delivered';
  }catch(error){console.error('[Fitness World] delivery email failed after verified capture',{orderID,error:String(error.message||error)});}
  const updated={...record,status:deliveryStatus==='Delivered'?'delivered':'failed',updated_at:Date.now()};
  const change=await s.setJSON(key,updated,{onlyIfMatch:etag});
  if(!change.modified) return {status:'PENDING_CONFIRMATION',reason:'ledger_race'};
  return {status:'COMPLETED',deliveryStatus,downloadUrl:upgradeDownloadUrl(record.downloadUrl),firstDelivered:deliveryStatus==='Delivered'};
}
module.exports={registerIntent,getIntent,confirmedOrder,deliver,loadRecord,saveAttribution,trackPurchaseOnce};
