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
    const token=signPayload({orderID,email:intent.email,exp,product:'reset'});
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
    await sendEmail({
      to:record.email,
      subject:'Your 30-Day Natural Wellness Reset is ready',
      html:`
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f1e8;font-family:Arial,Helvetica,sans-serif;color:#172019;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f1e8;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#ffffff;border:1px solid #dfe6dc;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px 10px;text-align:center;">
                <div style="font-size:12px;font-weight:800;letter-spacing:.12em;color:#2f7a3d;">FITNESS WORLD</div>
                <div style="margin-top:4px;font-size:11px;font-weight:700;color:#657067;">WHAT REALLY WORKS.</div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 8px;text-align:center;">
                <div style="font-size:12px;font-weight:800;letter-spacing:.12em;color:#2f7a3d;">YOUR RESET IS READY</div>
                <h1 style="margin:10px 0 10px;font-size:30px;line-height:1.12;color:#172019;">The 30-Day Natural Wellness Reset</h1>
                <p style="margin:0 auto;max-width:520px;font-size:16px;line-height:1.6;color:#55625a;">Payment confirmed. Your full 79-page program is ready to download.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px 10px;text-align:center;">
                <a href="${record.downloadUrl}" style="display:block;text-decoration:none;">
                  <div style="max-width:520px;margin:0 auto;padding:34px 22px;border-radius:12px;background:#155f50;color:#ffffff;font-size:24px;font-weight:800;line-height:1.15;">THE 30-DAY<br>NATURAL WELLNESS RESET<div style="margin-top:12px;font-size:13px;font-weight:600;opacity:.86;">FULL 79-PAGE PROGRAM</div></div>
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 32px 6px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr><td style="padding:0 0 8px;font-size:15px;line-height:1.55;color:#334139;font-weight:700;">Inside your Reset:</td></tr>
                  <tr><td style="padding:3px 0;font-size:14px;line-height:1.5;color:#4d5a52;">• The complete 30-day wellness program</td></tr>
                  <tr><td style="padding:3px 0;font-size:14px;line-height:1.5;color:#4d5a52;">• Weekly trackers and the Day 30 Check-In</td></tr>
                  <tr><td style="padding:3px 0;font-size:14px;line-height:1.5;color:#4d5a52;">• Your Personal Wellness Blueprint</td></tr>
                  <tr><td style="padding:3px 0;font-size:14px;line-height:1.5;color:#4d5a52;">• 10 Done-for-You Tools</td></tr>
                  <tr><td style="padding:3px 0;font-size:14px;line-height:1.5;color:#4d5a52;">• Bonus 19-profile Wellness Reference Library</td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px 10px;text-align:center;">
                <a href="${record.downloadUrl}" style="display:inline-block;background:#23241f;color:#ffffff;text-decoration:none;font-size:14px;font-weight:800;padding:15px 26px;border-radius:999px;">OPEN YOUR SECURE DOWNLOAD</a>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 32px 24px;text-align:center;">
                <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#526158;"><strong>Your secure download link expires in 24 hours.</strong></p>
                <p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:#6a746d;">If your link expires or you have any trouble accessing your purchase, contact <a href="mailto:support@fitnessworld.pro" style="color:#2f6b3d;">support@fitnessworld.pro</a> and include your order ID.</p>
                <p style="margin:0;font-size:12px;line-height:1.5;color:#6a746d;">Educational wellness information only. Not medical advice.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
      text:
        'Your 30-Day Natural Wellness Reset is ready.\\n\\n' +
        'Payment confirmed. Your full 79-page program is ready to download.\\n\\n' +
        'Inside your Reset:\\n' +
        '• The complete 30-day wellness program\\n' +
        '• Weekly trackers and the Day 30 Check-In\\n' +
        '• Your Personal Wellness Blueprint\\n' +
        '• 10 Done-for-You Tools\\n' +
        '• Bonus 19-profile Wellness Reference Library\\n\\n' +
        'OPEN YOUR SECURE DOWNLOAD: ' + record.downloadUrl + '\\n\\n' +
        'Your secure download link expires in 24 hours.\\n' +
        'If your link expires or you have any trouble accessing your purchase, contact support@fitnessworld.pro and include your order ID.\\n\\n' +
        'Educational wellness information only. Not medical advice.',
      idempotencyKey:'paypal-capture/'+orderID
    });
    deliveryStatus='Delivered';
  }catch(error){console.error('[Fitness World] delivery email failed after verified capture',{orderID,error:String(error.message||error)});}
  const updated={...record,status:deliveryStatus==='Delivered'?'delivered':'failed',updated_at:Date.now()};
  const change=await s.setJSON(key,updated,{onlyIfMatch:etag});
  if(!change.modified) return {status:'PENDING_CONFIRMATION',reason:'ledger_race'};
  return {status:'COMPLETED',deliveryStatus,downloadUrl:record.downloadUrl,firstDelivered:deliveryStatus==='Delivered'};
}
module.exports={registerIntent,getIntent,confirmedOrder,deliver,loadRecord};
