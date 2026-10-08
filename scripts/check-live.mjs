const base=(process.env.FW_AUDIT_BASE_URL||'https://fitnessworld.pro').replace(/\/$/,'');
const pages=['/','/natural/','/articles/','/evidence-projects/'];
const required={
  'strict-transport-security':v=>/max-age=/i.test(v||''),
  'x-content-type-options':v=>(v||'').toLowerCase()==='nosniff',
  'x-frame-options':v=>['deny','sameorigin'].includes((v||'').toLowerCase()),
  'referrer-policy':v=>Boolean(v),
  'permissions-policy':v=>Boolean(v),
  'cross-origin-opener-policy':v=>Boolean(v)
};
let failed=false;
for(const p of pages){
  const r=await fetch(base+p,{redirect:'follow'});
  const html=await r.text();
  console.log(p+' -> '+r.status+' ('+html.length+' bytes)');
  if(!r.ok){console.error('  FAIL HTTP '+r.status);failed=true;}
  for(const [h,ok] of Object.entries(required)){
    const v=r.headers.get(h);
    if(!ok(v)){console.error('  FAIL header '+h+': '+(v||'(missing)'));failed=true;}
  }
  if(!html.includes('G-FXRMZYR0YY')){console.error('  FAIL GA4 tag not found');failed=true;}
}
for(const item of [
  ['/.netlify/functions/track-event',d=>d&&d.success===true&&d.configured===true],
  ['/.netlify/functions/paypal-config',d=>d&&d.configured===true&&d.environment==='live']
]){
  const endpoint=item[0],check=item[1];
  const r=await fetch(base+endpoint,{redirect:'follow'});
  const d=await r.json().catch(()=>null);
  console.log(endpoint+' -> '+r.status);
  if(!r.ok||!check(d)){console.error('  FAIL service health: '+JSON.stringify(d));failed=true;}
}
if(failed) process.exit(1);
console.log('Live production checks passed.');
