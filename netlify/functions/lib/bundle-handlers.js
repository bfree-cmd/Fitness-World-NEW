const {verifyToken,validEmail,parseBody,sendEmail}=require('./fw');
const {getBlobsStore}=require('./blobs');
const {allow:rateAllow}=require('./rate-limit');
const {releasedFiles,releasedFile,fileKeys,escapeHtml:e,normalizeEmail,privateHash,newDownloadLink,genericMessage,secureHeaders,policy,purchaseEmail}=require('./reset-bundle');
const {paidRecord,purchaseForEmail,takeRateSlot}=require('./bundle-access');
const json=(code,data)=>({statusCode:code,headers:{...secureHeaders,'Content-Type':'application/json; charset=utf-8'},body:JSON.stringify(data)});
function resendForm(){return `<section class="resend"><h2>Resend my download link</h2><p>Use the email address you entered at checkout. A new link works for 24 hours.</p><form method="post" action="/.netlify/functions/resend-download-link"><label for="email">Purchase email</label><input type="email" id="email" name="email" autocomplete="email" required maxlength="254"><div class="honey" aria-hidden="true"><label for="website">Leave this field empty</label><input id="website" name="website" tabindex="-1" autocomplete="off"></div><button type="submit">Send a new link</button></form></section>`;}
function shell(title,body){return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>${e(title)} | Fitness World</title><style>*{box-sizing:border-box}body{margin:0;background:#f7f7f2;color:#292923;font:16px/1.6 Arial,Helvetica,sans-serif}.wrap{width:min(760px,calc(100% - 32px));margin:40px auto}header{border-bottom:1px solid #dce5d8;padding-bottom:18px;margin-bottom:28px}header a{font-weight:800;letter-spacing:1px;text-decoration:none;color:#155f50}h1{font-size:clamp(28px,5vw,38px);line-height:1.15;margin:0 0 16px}h2{font-size:23px;line-height:1.3}p{color:#526158}ul.files{padding:0;list-style:none;display:grid;gap:14px}.file,.resend{padding:24px;border:1px solid #dce5d8;border-radius:14px;background:#fff}.file h2{font-size:20px;margin:0 0 8px}.file p{margin:0 0 16px}.button,button{display:inline-flex;align-items:center;justify-content:center;min-height:48px;background:#155f50;color:#fff;border:0;border-radius:9px;padding:12px 18px;font-size:16px;font-weight:700;text-decoration:none;cursor:pointer}input{display:block;width:100%;min-height:48px;padding:12px;border:1px solid #9bab9e;border-radius:8px;font-size:16px;margin:6px 0 16px}label{font-weight:700}.honey{position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden}.resend{margin-top:28px}footer{font-size:13px;margin-top:28px;color:#526158}a{color:#155f50}a:focus-visible,button:focus-visible,input:focus-visible{outline:3px solid #a77006;outline-offset:3px}@media(max-width:480px){.wrap{margin-top:24px}.file,.resend{padding:20px}.button,button{width:100%}}</style></head><body><main class="wrap"><header><a href="https://fitnessworld.pro/">FITNESS WORLD</a></header>${body}<footer>Need help? <a href="mailto:support@fitnessworld.pro">support@fitnessworld.pro</a><br>Educational wellness information only. Not medical advice.</footer></main></body></html>`;}
const html=(statusCode,title,body)=>({statusCode,headers:{...secureHeaders,'Content-Type':'text/html; charset=utf-8'},body:shell(title,body)});
async function authenticated(event){
  const token=String(event.queryStringParameters?.token||'');
  if(token.length>4096)return null;
  const p=verifyToken(token);
  if(!p||p.product!=='reset'||!validEmail(p.email))return null;
  const record=await paidRecord(p.orderID,p.email);
  return record?{payload:p,token}:null;
}
async function downloads(event){
  if(!['GET','HEAD'].includes(event.httpMethod))return {...html(405,'Method not allowed','<h1>Method not allowed</h1>'),headers:{...secureHeaders,'Content-Type':'text/html; charset=utf-8',Allow:'GET, HEAD'}};
  let auth;
  try{auth=await authenticated(event);}catch(_){return html(503,'Downloads temporarily unavailable','<h1>Please try again shortly</h1><p>Your purchase is safe. We could not check your download link right now.</p>');}
  let response;
  if(!auth){
    response=html(200,'Request a new download link',`<h1>Let’s get you back to your downloads</h1><p>This link is missing, invalid or expired. Request a fresh link below using your purchase email.</p>${resendForm()}`);
  }else{
    const files=releasedFiles();
    response=html(200,'Your Reset downloads',`<h1>Your Reset downloads</h1><p>Your purchase includes ${files.length} ${files.length===1?'file':'files'}. Save them to your device so you can use them anytime.</p><p>This secure link works for 24 hours after it was issued.</p><ul class="files">${files.map(f=>`<li class="file"><h2>${e(f.name)}</h2><p>${e(f.description)}</p><a class="button" href="/.netlify/functions/download-reset-file?file=${encodeURIComponent(f.id)}&amp;token=${encodeURIComponent(auth.token)}">Download ${e(f.id==='reset'?'your Reset':f.name)}</a></li>`).join('')}</ul>${resendForm()}`);
  }
  if(event.httpMethod==='HEAD')response.body='';
  return response;
}
async function downloadFile(event){
  if(!['GET','HEAD'].includes(event.httpMethod))return {...json(405,{error:'Method not allowed'}),headers:{...secureHeaders,'Content-Type':'application/json; charset=utf-8',Allow:'GET, HEAD'}};
  const file=releasedFile(String(event.queryStringParameters?.file||''));
  if(!file)return json(404,{error:'File not found'});
  const rate=rateAllow(event,{limit:60,windowMs:60000,key:'reset-file'});
  if(!rate.ok)return json(429,{error:'Please try again shortly'});
  try{
    const auth=await authenticated(event);
    if(!auth)return json(403,{error:'A valid purchase link is required. Request a new link on your download page.'});
    const store=await getBlobsStore({name:'fw-private-assets',consistency:'strong'});
    const data=await store.get(fileKeys[file.id],{type:'arrayBuffer',consistency:'strong'});
    if(!data)return json(503,{error:'This file is temporarily unavailable. Please contact support@fitnessworld.pro.'});
    const pdf=Buffer.from(data);
    if(pdf.subarray(0,5).toString()!=='%PDF-')return json(503,{error:'This file is temporarily unavailable.'});
    return {statusCode:200,isBase64Encoded:true,headers:{...secureHeaders,'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${fileKeys[file.id]}"`},body:event.httpMethod==='HEAD'?'':pdf.toString('base64')};
  }catch(_){return json(503,{error:'Downloads are temporarily unavailable. Please try again shortly.'});}
}
async function resend(event){
  if(event.httpMethod!=='POST')return {...json(405,{error:'Method not allowed'}),headers:{...secureHeaders,'Content-Type':'application/json; charset=utf-8',Allow:'POST'}};
  const started=Date.now(),h=event.headers||{},contentType=h['content-type']||h['Content-Type']||'';
  const response=()=>contentType.includes('application/json')?json(200,{message:genericMessage}):html(200,'Check your inbox',`<h1>Check your inbox</h1><p role="status">${e(genericMessage)}</p><p>Check your spam or promotions folder too. Please wait before requesting another link.</p>${resendForm()}`);
  try{
    if(String(event.body||'').length>4096)return response();
    const b=contentType.includes('application/json')?parseBody(event):Object.fromEntries(new URLSearchParams(event.body||''));
    const email=normalizeEmail(b.email);
    const ip=String(h['x-nf-client-connection-ip']||'unknown').slice(0,80);
    const store=await getBlobsStore({name:'fw-reset-resend-limits',consistency:'strong'});
    const ipAllowed=await takeRateSlot(store,'ip/'+privateHash(ip),policy.ipLimit,policy.windowMs);
    if(!ipAllowed||b.website||!validEmail(email)||email.length>254)return response();
    const emailAllowed=await takeRateSlot(store,'email/'+privateHash(email),policy.emailLimit,policy.windowMs);
    if(!emailAllowed)return response();
    const record=await purchaseForEmail(email);
    if(record){
      const link=newDownloadLink(event,record.orderID,email);
      await sendEmail({to:email,...purchaseEmail(link.downloadUrl,{resend:true}),idempotencyKey:'reset-resend/'+privateHash(email)+'/'+Math.floor(started/60000)});
    }
  }catch(_){console.error('[Fitness World] download-link resend could not complete');}
  finally{
    const remaining=policy.responseFloorMs-Date.now()+started;
    if(remaining>0)await new Promise(resolve=>setTimeout(resolve,remaining));
  }
  return response();
}
module.exports={downloads,downloadFile,resend,shell};
