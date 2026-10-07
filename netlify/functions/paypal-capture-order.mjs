import { modernHandler } from './lib/modern-adapter.mjs';
import rateLimit from './lib/rate-limit.js';
const {allow:rateAllow,response:rateResponse}=rateLimit;
import fw from './lib/fw.js';
const {json,parseBody,validEmail}=fw;
import ledger from './lib/payment-ledger.js';
const {getIntent,confirmedOrder,deliver,saveAttribution,trackPurchaseOnce}=ledger;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

const handler=async(event)=>{
  if(event.httpMethod!=='POST') return json(405,{error:'Method not allowed'},{Allow:'POST'});
  const rate=rateAllow(event,{limit:12,windowMs:60000,key:'paypal-capture'});if(!rate.ok)return rateResponse(rate.retryAfter);
  const b=parseBody(event),orderID=String(b.orderID||'').trim(),email=String(b.email||'').trim().toLowerCase();
  if(!/^[A-Za-z0-9-]{5,40}$/.test(orderID))return json(400,{error:'Valid order ID required'});
  if(!validEmail(email))return json(400,{error:'Valid email required'});

  try{
    const intent=await getIntent(orderID);
    if(!intent||intent.email!==email)return json(403,{error:'Checkout email does not match the order'});
    // Persist attribution before capture. A verified PayPal webhook cannot race ahead of this write.
    await saveAttribution(orderID,b);
  }catch(error){
    console.error('[Fitness World] checkout lookup/attribution unavailable',{orderID,error:String(error.message||error)});
    return json(503,{error:'Checkout verification unavailable'});
  }

  let capture=null;
  try{
    const {paypalRequest}=fw;
    const result=await paypalRequest('/v2/checkout/orders/'+encodeURIComponent(orderID)+'/capture',{method:'POST',headers:{'PayPal-Request-Id':'fw-capture-'+orderID},body:'{}'});
    const unit=result.purchase_units?.find(u=>u.reference_id==='fitness-world-encyclopedia');
    capture=result.id===orderID&&result.status==='COMPLETED' ? unit?.payments?.captures?.find(c=>c.id&&c.status==='COMPLETED'&&c.amount?.currency_code==='USD'&&c.amount?.value==='9.99') : null;
  }catch(error){console.error('[Fitness World] capture response inconclusive',{orderID,error:String(error.message||error)});}

  // A timeout or ORDER_ALREADY_CAPTURED response is not proof that money did not move.
  try{capture=await confirmedOrder(orderID,capture?.id);}catch(error){console.error('[Fitness World] order lookup inconclusive',{orderID,error:String(error.message||error)});}
  if(!capture)return json(202,{status:'PENDING_CONFIRMATION',orderID,message:'We could not confirm your payment yet. Please do not pay again.'});

  let result;
  try{
    for(let attempt=0;attempt<4;attempt+=1){
      result=await deliver(orderID,event);
      if(result.status==='COMPLETED')break;
      if(!['claimed','another_worker','ledger_race'].includes(result.reason))break;
      await sleep(1250);
    }
  }catch(error){
    console.error('[Fitness World] paid order delivery reconciliation failed',{orderID,error:String(error.message||error)});
    return json(202,{status:'PENDING_CONFIRMATION',orderID});
  }
  if(result.status!=='COMPLETED')return json(202,{status:'PENDING_CONFIRMATION',orderID,reason:result.reason||'delivery_pending'});

  try{
    await trackPurchaseOnce(orderID,capture.id,result.deliveryStatus);
  }catch(error){
    console.error('[Fitness World] paid purchase tracking reconciliation failed',{orderID,error:String(error.message||error)});
  }

  const {firstDelivered,...publicResult}=result;
  return json(200,{...publicResult,eventId:'fw_purchase_'+orderID});
};

export default modernHandler(handler);
