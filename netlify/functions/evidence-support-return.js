const {paypalRequest,siteUrl}=require('./lib/fw');
const {forwardTracking}=require('./lib/tracking');
const {getBlobsStore}=require('./lib/blobs');

function redirect(location){return {statusCode:302,headers:{Location:location,'Cache-Control':'no-store'},body:''};}
function root(event){return String(process.env.FW_SITE_URL||siteUrl(event)||'https://fitnessworld.pro').replace(/\/$/,'');}
function validOrder(id){return /^[A-Za-z0-9-]{5,40}$/.test(String(id||''));}
async function trackOnce(orderID,capture,amount,email){
  const store=await getBlobsStore({name:'fw-evidence-support',consistency:'strong'});
  const key='tracked/'+orderID;
  const existing=await store.get(key,{type:'json',consistency:'strong'});
  if(existing?.status==='sent')return;
  await forwardTracking({
    event_type:'evidence_project_support',
    event_id:'fw_evidence_support_'+orderID,
    email:email||'',
    product_offer:'Healthy Aging Evidence Project Support',
    source_page:'/evidence-projects/',
    source_form:'PayPal Support',
    order_id:orderID,
    transaction_id:String(capture.id||''),
    payment_provider:'PayPal',
    gross_amount:Number(amount),
    currency:'USD',
    payment_status:'Paid',
    marketing_consent:'No',
    capture_source:'PayPal',
    notes:'Reader support for the Healthy Aging Evidence Project'
  });
  await store.setJSON(key,{status:'sent',capture_id:String(capture.id||''),amount:Number(amount),tracked_at:Date.now()});
}
exports.handler=async(event)=>{
  const base=root(event);
  if(event.httpMethod!=='GET')return redirect(base+'/evidence-projects/?support=error#support');
  const orderID=String(event.queryStringParameters?.token||'');
  if(!validOrder(orderID))return redirect(base+'/evidence-projects/?support=error#support');
  try{
    let order=await paypalRequest('/v2/checkout/orders/'+encodeURIComponent(orderID));
    const unit=order.purchase_units?.find(u=>u.reference_id==='fitness-world-evidence-project'&&u.custom_id==='healthy-aging');
    const amount=Number(unit?.amount?.value||0);
    if(!unit||unit.amount?.currency_code!=='USD'||!Number.isFinite(amount)||amount<1||amount>500)throw new Error('Support order validation failed');

    let capture=unit.payments?.captures?.find(c=>c.status==='COMPLETED');
    if(!capture){
      if(order.status!=='APPROVED')throw new Error('PayPal support order is not approved');
      order=await paypalRequest('/v2/checkout/orders/'+encodeURIComponent(orderID)+'/capture',{
        method:'POST',
        headers:{'PayPal-Request-Id':'fw-ep-capture-'+orderID},
        body:'{}'
      });
      const capturedUnit=order.purchase_units?.find(u=>u.reference_id==='fitness-world-evidence-project'&&u.custom_id==='healthy-aging');
      capture=capturedUnit?.payments?.captures?.find(c=>c.status==='COMPLETED');
    }
    if(!capture||capture.amount?.currency_code!=='USD'||Number(capture.amount?.value)!==amount)throw new Error('PayPal support capture validation failed');

    try{await trackOnce(orderID,capture,amount,order.payer?.email_address||'');}
    catch(error){console.error('[Fitness World] evidence support tracking failed',{orderID,error:String(error.message||error)});}

    return redirect(base+'/evidence-projects/?support=return&amount='+encodeURIComponent(amount.toFixed(2))+'#support');
  }catch(error){
    console.error('[Fitness World] evidence support capture failed',{orderID,message:String(error.message||error),stage:error.paypalStage||'',status:error.paypalStatus||0});
    return redirect(base+'/evidence-projects/?support=error#support');
  }
};
