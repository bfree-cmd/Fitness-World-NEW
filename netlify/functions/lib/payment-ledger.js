const {getBlobsStore}=require('./blobs');
const {paypalRequest,signPayload,siteUrl,sendEmail}=require('./fw');
const CLAIM_MS=2*60*1000;
const safeOrder=id=>{if(!/^[A-Za-z0-9-]{5,40}$/.test(String(id||''))) throw new Error('Invalid PayPal order ID');return id;};
const env=()=>String(process.env.PAYPAL_ENV||'live').toLowerCase()==='sandbox'?'sandbox':'live';
const store=()=>getBlobsStore({name:'fw-payments-'+env(),consistency:'strong'});
const orderKey=id=>'order/'+safeOrder(id);
const intentKey=id=>'intent/'+safeOrder(id);
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
async function deliver(orderID,event){
  const s=await store(),key=orderKey(orderID);
  const intent=await getIntent(orderID);
  // Never deliver to an address supplied by the webhook payload or a capture retry.
  if(!intent?.email) {console.error('[Fitness World] paid order has no saved checkout email',{orderID});return {status:'PENDING_CONFIRMATION',reason:'missing_intent'};}
  let {data:record,etag}=await loadRecord(orderID);
  const now=Date.now();
  let ownsClaim=false;
  if(!record){
    const exp=now+24*60*60*1000;
    const token=signPayload({orderID,email:intent.email,exp});
    const downloadUrl=(siteUrl(event)||'https://comforting-marigold-ea2f43.netlify.app')+'/.netlify/functions/download-encyclopedia?token='+encodeURIComponent(token);
    const candidate={status:'claimed',claimed_at:now,exp,downloadUrl,email:intent.email,orderID};
    const result=await s.setJSON(key,candidate,{onlyIfNew:true});
    if(result.modified){record=candidate;etag=result.etag;ownsClaim=true;}
    else ({data:record,etag}=await loadRecord(orderID));
  }
  if(!record||record.email!==intent.email) return {status:'PENDING_CONFIRMATION',reason:'ledger_conflict'};
  if(record.status==='delivered') return {status:'COMPLETED',deliveryStatus:'Delivered',downloadUrl:record.downloadUrl};
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
    await sendEmail({to:record.email,subject:'Your Fitness World Natural Wellness Encyclopedia',html:`<p>Payment confirmed. Your digital Encyclopedia is ready.</p><p><a href="${record.downloadUrl}">Secure download</a></p><p>This secure link expires in 24 hours.</p>`,text:`Payment confirmed. Secure download (expires in 24 hours): ${record.downloadUrl}`,idempotencyKey:'paypal-capture/'+orderID});
    deliveryStatus='Delivered';
  }catch(error){console.error('[Fitness World] delivery email failed after verified capture',{orderID,error:String(error.message||error)});}
  const updated={...record,status:deliveryStatus==='Delivered'?'delivered':'failed',updated_at:Date.now()};
  const change=await s.setJSON(key,updated,{onlyIfMatch:etag});
  if(!change.modified) return {status:'PENDING_CONFIRMATION',reason:'ledger_race'};
  return {status:'COMPLETED',deliveryStatus,downloadUrl:record.downloadUrl,firstDelivered:deliveryStatus==='Delivered'};
}
module.exports={registerIntent,getIntent,confirmedOrder,deliver,loadRecord};
