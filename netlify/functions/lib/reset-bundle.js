const manifest=require('../../../assets/data/reset-bundle.json');
const {signPayload,siteUrl}=require('./fw');
const crypto=require('crypto');
const TOKEN_MS=24*60*60*1000;
const policy=Object.freeze({ipLimit:10,emailLimit:3,windowMs:60*60*1000,responseFloorMs:1500});
const fileKeys=Object.freeze({reset:'Fitness_World_30-Day_Natural_Wellness_Reset.pdf',tracker:'FW_Bonus_30-Day_Printable_Tracker.pdf',cheatsheet:'FW_Bonus_4-Part_Meal_Method_Cheat_Sheet.pdf',library:'FW_Bonus_Wellness_Reference_Library.pdf'});
const releasedFiles=()=>manifest.files.filter(f=>f.released===true&&Object.hasOwn(fileKeys,f.id));
const releasedFile=id=>releasedFiles().find(f=>f.id===id);
const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalizeEmail=v=>String(v||'').trim().toLowerCase();
function privateHash(value){
  if(!process.env.FW_DOWNLOAD_SECRET)throw Error('Download secret not configured');
  return crypto.createHmac('sha256',process.env.FW_DOWNLOAD_SECRET).update(value).digest('hex');
}
function downloadPageUrl(event,token){
  return (siteUrl(event)||'https://fitnessworld.pro')+'/.netlify/functions/reset-downloads?token='+encodeURIComponent(token);
}
function newDownloadLink(event,orderID,email){
  const exp=Date.now()+TOKEN_MS;
  const token=signPayload({orderID,email:normalizeEmail(email),product:'reset',exp,nonce:crypto.randomBytes(12).toString('hex')});
  return {exp,downloadUrl:downloadPageUrl(event,token)};
}
function upgradeDownloadUrl(url){
  try{const u=new URL(url);if(u.pathname==='/.netlify/functions/download-encyclopedia')u.pathname='/.netlify/functions/reset-downloads';return u.href;}catch(_){return url;}
}
const genericMessage="If that email matches a purchase, we've sent a new download link.";
const secureHeaders=Object.freeze({
  'Cache-Control':'private, no-store',
  'X-Robots-Tag':'noindex, nofollow',
  'Referrer-Policy':'no-referrer',
  'X-Content-Type-Options':'nosniff',
  'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"
});
function purchaseEmail(downloadUrl,{resend=false}={}){
  const files=releasedFiles(),url=escapeHtml(downloadUrl);
  return {
    subject:'Your 30-Day Natural Wellness Reset is ready',
    html:`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Your Reset is ready</title></head><body style="margin:0;background:#f7f7f2;font-family:Arial,sans-serif;color:#292923"><table role="presentation" width="100%"><tr><td align="center" style="padding:28px 16px"><table role="presentation" style="width:100%;max-width:600px;background:#fff;border:1px solid #dce5d8;border-radius:16px"><tr><td style="padding:32px"><p style="font-weight:bold;color:#155f50;letter-spacing:2px">FITNESS WORLD</p><h1 style="font-size:28px;line-height:1.2">Your Reset is ready</h1><p style="font-size:16px;line-height:1.6">${resend?'Here is your new secure link.':'Payment confirmed.'} Your download page includes:</p><ul style="font-size:16px;line-height:1.8">${files.map(f=>'<li>'+escapeHtml(f.name)+'</li>').join('')}</ul><a href="${url}" style="display:inline-block;background:#155f50;color:#fff;padding:16px 22px;border-radius:10px;font-size:16px;font-weight:bold;text-decoration:none">Open your download page</a><p style="font-size:16px;line-height:1.6">This link works for 24 hours. If it expires, request a new link on the same page.</p>${resend?'<p style="font-size:14px;line-height:1.6">If you did not request this email, you can ignore it. Your purchase is unchanged.</p>':''}<p style="font-size:14px;line-height:1.6">Need help? <a href="mailto:support@fitnessworld.pro">support@fitnessworld.pro</a></p><p style="font-size:12px;color:#526158">Educational wellness information only. Not medical advice.</p></td></tr></table></td></tr></table></body></html>`,
    text:`Your 30-Day Natural Wellness Reset is ready.\n\n${resend?'Here is your new secure link.':'Payment confirmed.'}\n\nYour download page includes:\n${files.map(f=>'• '+f.name).join('\n')}\n\nOpen your download page: ${downloadUrl}\n\nThis link works for 24 hours. If it expires, request a new one on the same page.\n${resend?'If you did not request this email, you can ignore it.\n':''}Support: support@fitnessworld.pro\n\nEducational wellness information only. Not medical advice.`
  };
}
module.exports={TOKEN_MS,policy,fileKeys,releasedFiles,releasedFile,escapeHtml,normalizeEmail,privateHash,newDownloadLink,downloadPageUrl,upgradeDownloadUrl,genericMessage,secureHeaders,purchaseEmail};
