import { modernHandler } from './lib/modern-adapter.mjs';
import rateLimit from './lib/rate-limit.js';
const {allow:rateAllow,response:rateResponse}=rateLimit;
import fw from './lib/fw.js';
const {json,parseBody,validEmail}=fw;
import tracking from './lib/tracking.js';
const {forwardTracking,clean}=tracking;
import ledger from './lib/payment-ledger.js';
const {getIntent,confirmedOrder,deliver}=ledger;
const handler=async(event)=>{
  if(event.httpMethod!=='POST') return json(405,{error:'Method not allowed'},{Allow:'POST'});
  const rate=rateAllow(event,{limit:12,windowMs:60000,key:'paypal-capture'});if(!rate.ok)return rateResponse(rate.retryAfter);
  const b=parseBody(event),orderID=String(b.orderID||'').trim(),email=String(b.email||'').trim().toLowerCase();
  if(!/^[A-Za-z0-9-]{5,40}$/.test(orderID))return json(400,{error:'Valid order ID required'});
  if(!validEmail(email))return json(400,{error:'Valid email required'});
  try{
    const intent=await getIntent(orderID);
    if(!intent||intent.email!==email)return json(403,{error:'Checkout email does not match the order'});
  }catch(error){console.error('[Fitness World] checkout lookup unavailable',{orderID,error:String(error.message||error)});return json(503,{error:'Checkout verification unavailable'});}
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
  try{result=await deliver(orderID,event);}catch(error){console.error('[Fitness World] paid order delivery reconciliation failed',{orderID,error:String(error.message||error)});return json(202,{status:'PENDING_CONFIRMATION',orderID});}
  if(result.status!=='COMPLETED')return json(202,{status:'PENDING_CONFIRMATION',orderID});
  if(result.firstDelivered)try{
    let sourcePage='';try{sourcePage=new URL(String(b.eventSourceUrl||'')).pathname;}catch(_){}
    await forwardTracking({event_type:'paid_purchase',email,product_offer:'Natural Wellness Encyclopedia',source_page:sourcePage||'/natural/',source_form:'PayPal Checkout',referrer_url:clean(b.first_referrer,1000),utm_source:clean(b.utm_source,300),utm_medium:clean(b.utm_medium,300),utm_campaign:clean(b.utm_campaign,300),utm_content:clean(b.utm_content,300),utm_term:clean(b.utm_term,300),order_id:orderID,transaction_id:capture.id,payment_provider:'PayPal',gross_amount:9.99,currency:'USD',payment_status:'Paid',marketing_consent:'No',capture_source:'PayPal',notes:'Purchase Event ID: fw_purchase_'+orderID+' | Confirmed PayPal capture; delivery status: '+result.deliveryStatus});
  }catch(_){}
  const {firstDelivered,...publicResult}=result;
  return json(200,{...publicResult,eventId:'fw_purchase_'+orderID});
};

export default modernHandler(handler);
