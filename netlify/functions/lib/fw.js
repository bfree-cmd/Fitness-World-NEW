const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const json = (statusCode, body, headers={}) => ({
  statusCode,
  headers: {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers},
  body: JSON.stringify(body)
});

function parseBody(event){
  if(!event || !event.body) return {};
  try { return JSON.parse(event.body); } catch (_) { return {}; }
}
function validEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||'').trim().toLowerCase()); }
function siteUrl(event){
  // Manual CLI drafts can expose production URLs in function env vars.
  // A request host is accepted only when it belongs to this Netlify site.
  const allowed=new Set(['comforting-marigold-ea2f43.netlify.app']);
  for(const raw of [process.env.URL,process.env.SITE_URL]){
    try{allowed.add(new URL(raw).hostname.toLowerCase());}catch(_){}
  }
  for(const raw of [event?.headers?.host,event?.headers?.Host]){
    const host=String(raw||'').trim().toLowerCase();
    if(!host || /[^a-z0-9.:-]/.test(host)) continue;
    if([...allowed].some(name=>host===name || (name.endsWith('.netlify.app') && /^[0-9a-f]{16,32}$/.test(host.slice(0,-('--'+name).length)) && host.endsWith('--'+name)))){
      return 'https://'+host;
    }
  }
  return String(process.env.DEPLOY_URL||process.env.DEPLOY_PRIME_URL||process.env.URL||process.env.SITE_URL||'').replace(/\/$/,'');
}
function paypalBase(){ return String(process.env.PAYPAL_ENV||'live').toLowerCase()==='sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com'; }
function paypalError(message, status, body, stage){
  const err=new Error(message);
  err.paypalStatus=Number(status)||0;
  err.paypalBody=body && typeof body==='object' ? body : {};
  err.paypalStage=stage||'';
  return err;
}
async function paypalAccessToken(){
  const id=process.env.PAYPAL_CLIENT_ID, secret=process.env.PAYPAL_CLIENT_SECRET;
  if(!id || !secret) throw paypalError('PayPal credentials are not configured',0,{},'oauth');
  const auth=Buffer.from(`${id}:${secret}`).toString('base64');
  const r=await fetch(paypalBase()+'/v1/oauth2/token',{method:'POST',headers:{Authorization:`Basic ${auth}`,'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'});
  const d=await r.json().catch(()=>({}));
  if(!r.ok || !d.access_token) throw paypalError(d.error_description || d.error || 'PayPal authentication failed',r.status,d,'oauth');
  return d.access_token;
}
async function paypalRequest(endpoint, options={}){
  const token=await paypalAccessToken();
  const r=await fetch(paypalBase()+endpoint,{...options,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',...(options.headers||{})}});
  const d=await r.json().catch(()=>({}));
  if(!r.ok) throw paypalError(d.message || d.error_description || d.error || `PayPal HTTP ${r.status}`,r.status,d,'api');
  return d;
}
function downloadSecret(){ return process.env.FW_DOWNLOAD_SECRET || ''; }
function b64url(input){ return Buffer.from(input).toString('base64url'); }
function signPayload(payload){
  const secret=downloadSecret();
  if(!secret) throw new Error('Secure download secret is not configured');
  const raw=JSON.stringify(payload); const data=b64url(raw);
  const sig=crypto.createHmac('sha256',secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}
function verifyToken(token){
  const secret=downloadSecret(); if(!secret || !token || !token.includes('.')) return null;
  const [data,sig]=token.split('.',2);
  const expect=crypto.createHmac('sha256',secret).update(data).digest('base64url');
  try { if(!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expect))) return null; } catch (_) { return null; }
  let payload; try { payload=JSON.parse(Buffer.from(data,'base64url').toString('utf8')); } catch (_) { return null; }
  if(!payload.exp || Date.now()>payload.exp) return null;
  return payload;
}
async function sendEmail({to,subject,html,text,idempotencyKey}){
  const key=process.env.RESEND_API_KEY, from=process.env.FW_EMAIL_FROM;
  if(!key || !from) throw new Error('Email provider is not configured');
  const body={from,to:[to],subject,html,text};
  if(process.env.FW_EMAIL_REPLY_TO) body.reply_to=process.env.FW_EMAIL_REPLY_TO;
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json',...(idempotencyKey?{'Idempotency-Key':idempotencyKey}:{})},body:JSON.stringify(body)});
  const d=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(d.message || `Email provider HTTP ${r.status}`);
  return d;
}
function encyclopediaPath(){ const name='Fitness_World_Natural_Wellness_Encyclopedia.pdf'; const candidates=[path.resolve(process.cwd(),'private',name),path.resolve(__dirname,'../../../private',name),path.resolve(__dirname,'../../private',name)]; return candidates.find(fs.existsSync)||candidates[0]; }
function guideUrl(){ return (siteUrl() || 'https://fitnessworld.pro') + '/fitness-world-free-guide.pdf'; }
function encyclopediaBuffer(){ return fs.readFileSync(encyclopediaPath()); }
module.exports={json,parseBody,validEmail,siteUrl,paypalBase,paypalAccessToken,paypalRequest,signPayload,verifyToken,sendEmail,encyclopediaPath,encyclopediaBuffer,guideUrl};
