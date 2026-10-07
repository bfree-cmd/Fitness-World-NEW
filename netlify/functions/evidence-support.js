const crypto=require('crypto');
const {paypalRequest,siteUrl}=require('./lib/fw');

const MIN=1,MAX=500;
function redirect(location){return {statusCode:302,headers:{Location:location,'Cache-Control':'no-store'},body:''};}
function fail(statusCode,message){return {statusCode,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'},body:message};}
function root(event){
  return String(process.env.FW_SITE_URL||siteUrl(event)||'https://fitnessworld.pro').replace(/\/$/,'');
}

exports.handler=async(event)=>{
  if(event.httpMethod!=='GET')return fail(405,'Method not allowed');
  const amount=Number(event.queryStringParameters?.amount||0);
  if(!Number.isFinite(amount)||amount<MIN||amount>MAX||Math.round(amount*100)!==amount*100)return fail(400,'Choose a valid support amount between $1 and $500.');
  const value=amount.toFixed(2);
  const base=root(event);
  try{
    const order=await paypalRequest('/v2/checkout/orders',{
      method:'POST',
      headers:{'PayPal-Request-Id':'fw-ep-'+crypto.randomUUID()},
      body:JSON.stringify({
        intent:'CAPTURE',
        purchase_units:[{
          reference_id:'fitness-world-evidence-project',
          custom_id:'healthy-aging',
          description:'Fitness World Healthy Aging Evidence Project support',
          amount:{currency_code:'USD',value}
        }],
        payment_source:{paypal:{experience_context:{
          brand_name:'Fitness World',
          user_action:'PAY_NOW',
          return_url:base+'/.netlify/functions/evidence-support-return',
          cancel_url:base+'/evidence-projects/?support=cancelled#support'
        }}}
      })
    });
    const approve=order.links?.find(x=>x.rel==='payer-action'||x.rel==='approve')?.href;
    if(!approve)throw new Error('PayPal approval URL missing');
    return redirect(approve);
  }catch(error){
    console.error('[Fitness World] evidence support create failed',{message:String(error.message||error),stage:error.paypalStage||'',status:error.paypalStatus||0});
    return redirect(base+'/evidence-projects/?support=error#support');
  }
};
