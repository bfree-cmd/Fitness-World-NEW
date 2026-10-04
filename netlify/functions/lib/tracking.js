const ENDPOINT_ENV='FW_TRACKING_ENDPOINT';
const SECRET_ENV='FW_TRACKING_SECRET';

const clean=(v,n=1000)=>String(v==null?'':v).replace(/\s+/g,' ').trim().slice(0,n);

async function forwardTracking(payload){
  const endpoint=clean(process.env[ENDPOINT_ENV],2000);
  const secret=clean(process.env[SECRET_ENV],500);
  if(!endpoint || !secret) throw new Error('Fitness World tracking environment is not configured');
  const body={...payload,tracking_secret:secret};
  const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),redirect:'follow'});
  const text=await r.text();
  let data={}; try{data=JSON.parse(text)}catch(_){ }
  if(!r.ok || data.success!==true) throw new Error(data.error || `Tracking endpoint HTTP ${r.status}`);
  return data;
}

module.exports={forwardTracking,clean};
