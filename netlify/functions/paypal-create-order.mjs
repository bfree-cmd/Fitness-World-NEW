import { modernHandler } from './lib/modern-adapter.mjs';
import rateLimit from './lib/rate-limit.js';
const {allow:rateAllow,response:rateResponse}=rateLimit;
import fw from './lib/fw.js';
const {json,parseBody,validEmail,paypalRequest}=fw;
import ledger from './lib/payment-ledger.js';
const {registerIntent}=ledger;
const safeId=v=>String(v||'').replace(/[^A-Za-z0-9._:-]/g,'').slice(0,100);
const handler=async(event)=>{
  const rate=rateAllow(event,{limit:12,windowMs:60000,key:'paypal-create'}); if(!rate.ok) return rateResponse(rate.retryAfter);
  if(event.httpMethod!=='POST') return json(405,{error:'Method not allowed'},{Allow:'POST'});
  const b=parseBody(event), email=String(b.email||'').trim().toLowerCase(), checkoutId=safeId(b.checkoutId);
  if(!validEmail(email)) return json(400,{error:'Valid email required'});
  try{
    const headers={};
    if(checkoutId) headers['PayPal-Request-Id']='fw-create-'+checkoutId;
    const d=await paypalRequest('/v2/checkout/orders',{
      method:'POST',
      headers,
      body:JSON.stringify({
        intent:'CAPTURE',
        purchase_units:[{
          reference_id:'fitness-world-encyclopedia',
          description:'Fitness World Natural Wellness Encyclopedia',
          amount:{currency_code:'USD',value:'9.99'}
        }],
        payer:{email_address:email}
      })
    });
    await registerIntent(d.id,email);
    return json(200,{orderID:d.id});
  }catch(err){
    const diagnostic={
      function:'paypal-create-order',
      environment:String(process.env.PAYPAL_ENV||'live').toLowerCase(),
      stage:String(err.paypalStage||'unknown'),
      status:Number(err.paypalStatus)||0,
      message:String(err.message||err),
      paypal:err.paypalBody && typeof err.paypalBody==='object' ? err.paypalBody : {}
    };
    console.error('[Fitness World PayPal create-order failed]', JSON.stringify(diagnostic));
    return json(502,{error:'Could not start checkout'});
  }
};

export default modernHandler(handler);
