const primary=(process.env.FW_AUDIT_BASE_URL||'https://fitnessworld.pro').replace(/\/$/,'');
const fallback=(process.env.FW_AUDIT_FALLBACK_URL||'https://comforting-marigold-ea2f43.netlify.app').replace(/\/$/,'');
const pages=['/','/natural/','/articles/','/evidence-projects/'];
const required={
  'strict-transport-security':v=>/max-age=/i.test(v||''),
  'x-content-type-options':v=>(v||'').toLowerCase()==='nosniff',
  'x-frame-options':v=>['deny','sameorigin'].includes((v||'').toLowerCase()),
  'referrer-policy':v=>Boolean(v),
  'permissions-policy':v=>Boolean(v),
  'cross-origin-opener-policy':v=>Boolean(v)
};

const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function fetchRetry(url,opts={},tries=4){
  let last;
  for(let i=0;i<tries;i++){
    try{return await fetch(url,opts);}
    catch(e){last=e; if(i<tries-1) await wait(3000*(i+1));}
  }
  throw last;
}

async function resolveBase(){
  try{
    const r=await fetchRetry(primary+'/',{redirect:'follow'},3);
    if(r.ok) return {base:primary,primaryReachable:true};
  }catch(e){
    console.warn('Primary domain unreachable from runner after retries: '+String(e.message||e));
  }
  console.warn('Falling back to Netlify production URL for functional checks.');
  return {base:fallback,primaryReachable:false};
}

const resolved=await resolveBase();
const base=resolved.base;
let failed=false;

for(const p of pages){
  let r;
  try{r=await fetchRetry(base+p,{redirect:'follow'},3);}
  catch(e){console.error(p+' -> network failure: '+String(e.message||e));failed=true;continue;}
  const html=await r.text();
  console.log(p+' -> '+r.status+' ('+html.length+' bytes) via '+base);
  if(!r.ok){console.error('  FAIL HTTP '+r.status);failed=true;}
  for(const [h,ok] of Object.entries(required)){
    const v=r.headers.get(h);
    if(!ok(v)){console.error('  FAIL header '+h+': '+(v||'(missing)'));failed=true;}
  }
  if(!html.includes('G-FXRMZYR0YY')){
    const loader=html.match(/<script\b[^>]*\bsrc=["'](\/assets\/js\/ga-deferred\.js(?:\?[^"']*)?)["'][^>]*>/i);
    let valid=false;
    if(loader){
      try{
        const response=await fetchRetry(base+loader[1],{redirect:'follow'},3);
        const source=await response.text();
        valid=response.ok && source.includes('G-FXRMZYR0YY') &&
          source.includes('www.googletagmanager.com/gtag/js') &&
          source.includes('window.dataLayer') && source.includes("window.gtag('config',id)");
      }catch(e){console.error('  GA4 loader fetch failed: '+String(e.message||e));}
    }
    if(!valid){console.error('  FAIL GA4 tag or valid deferred loader not found');failed=true;}
  }
}

for(const item of [
  ['/.netlify/functions/track-event',d=>d&&d.success===true&&d.configured===true],
  ['/.netlify/functions/paypal-config',d=>d&&d.configured===true&&d.environment==='live']
]){
  const endpoint=item[0],check=item[1];
  let r;
  try{r=await fetchRetry(base+endpoint,{redirect:'follow'},3);}
  catch(e){console.error(endpoint+' -> network failure: '+String(e.message||e));failed=true;continue;}
  const d=await r.json().catch(()=>null);
  console.log(endpoint+' -> '+r.status);
  if(!r.ok||!check(d)){console.error('  FAIL service health: '+JSON.stringify(d));failed=true;}
}

if(!resolved.primaryReachable) console.warn('NOTE: custom-domain DNS could not be verified from this runner; functional checks used the Netlify production URL.');
if(failed) process.exit(1);
console.log('Live production checks passed.');
