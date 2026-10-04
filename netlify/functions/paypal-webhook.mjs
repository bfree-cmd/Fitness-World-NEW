import { modernHandler } from './lib/modern-adapter.mjs';
import fw from './lib/fw.js';
const {json,paypalRequest}=fw;
import ledger from './lib/payment-ledger.js';
const {confirmedOrder,deliver}=ledger;
const header=(headers,name)=>headers?.[name]||headers?.[name.toLowerCase()]||headers?.[name.toUpperCase()];
const handler=async(event)=>{
  if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'},{Allow:'POST'});
  if(!process.env.PAYPAL_WEBHOOK_ID)return json(503,{error:'Webhook not configured'});
  if(!event.body||event.body.length>100000)return json(400,{error:'Invalid webhook body'});
  let payload;try{payload=JSON.parse(event.isBase64Encoded?Buffer.from(event.body,'base64').toString('utf8'):event.body);}catch(_){return json(400,{error:'Invalid webhook body'});}
  const h=event.headers||{};
  if(!['paypal-transmission-id','paypal-transmission-time','paypal-transmission-sig','paypal-cert-url','paypal-auth-algo'].every(name=>header(h,name)))return json(400,{error:'Missing PayPal signature headers'});
  let verification;
  try{verification=await paypalRequest('/v1/notifications/verify-webhook-signature',{method:'POST',body:JSON.stringify({auth_algo:header(h,'paypal-auth-algo'),cert_url:header(h,'paypal-cert-url'),transmission_id:header(h,'paypal-transmission-id'),transmission_sig:header(h,'paypal-transmission-sig'),transmission_time:header(h,'paypal-transmission-time'),webhook_id:process.env.PAYPAL_WEBHOOK_ID,webhook_event:payload})});}
  catch(error){console.error('[Fitness World] PayPal webhook verification unavailable',String(error.message||error));return json(503,{error:'Verification unavailable'});}
  if(verification.verification_status!=='SUCCESS')return json(401,{error:'Invalid PayPal signature'});
  if(payload.event_type!=='PAYMENT.CAPTURE.COMPLETED')return json(200,{received:true});
  const orderID=payload.resource?.supplementary_data?.related_ids?.order_id;
  const captureID=payload.resource?.id;
  if(!/^[A-Za-z0-9-]{5,40}$/.test(String(orderID||''))||!captureID)return json(400,{error:'Invalid capture event'});
  try{
    const capture=await confirmedOrder(orderID,captureID);
    if(!capture)return json(503,{error:'Order not yet confirmed'});
    const result=await deliver(orderID,event);
    if(result.status==='PENDING_CONFIRMATION'&&result.reason==='link_expired')return json(200,{received:true,requiresSupport:true});
    if(result.status!=='COMPLETED'||result.deliveryStatus!=='Delivered')return json(503,{error:'Delivery pending'});
    return json(200,{received:true});
  }catch(error){console.error('[Fitness World] verified webhook reconciliation failed',{orderID,error:String(error.message||error)});return json(503,{error:'Reconciliation unavailable'});}
};

export default modernHandler(handler);
