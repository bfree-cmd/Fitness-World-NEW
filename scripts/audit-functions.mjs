import fs from 'node:fs';
import path from 'node:path';

const dir=path.join(process.cwd(),'netlify','functions');
const files=fs.readdirSync(dir).filter(f=>/\.(?:js|mjs)$/.test(f)).sort();
const findings=[];
for(const file of files){
  const p=path.join(dir,file);
  const s=fs.readFileSync(p,'utf8');
  const name=file.replace(/\.(?:js|mjs)$/,'');
  const mutating=/paypal|send-|track-|evidence-support|download|webhook/i.test(name);
  const hasRate=/rateLimit|rate-limit|PAYPAL-Request-Id|verifyWebhook|verify.*signature|FW_DOWNLOAD_SECRET|timingSafeEqual/i.test(s);
  if(mutating && !hasRate) findings.push(name);
}
console.log('Public Netlify functions reviewed: '+files.length);
if(findings.length){
  console.warn('Functions needing manual hardening review:');
  for(const f of findings) console.warn('  - '+f);
}else{
  console.log('No obvious unprotected high-risk function patterns found.');
}
