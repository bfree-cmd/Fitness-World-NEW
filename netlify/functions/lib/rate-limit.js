// Best-effort per-instance rate limiting for Netlify Functions.
// Limits abuse bursts without introducing an external datastore dependency.
const buckets = new Map();
function clientKey(event){
  const h=event.headers||{};
  return String(h['x-nf-client-connection-ip']||h['x-forwarded-for']||h['client-ip']||'unknown').split(',')[0].trim().slice(0,80);
}
function allow(event,{limit=20,windowMs=60_000,key='default'}={}){
  const now=Date.now(), id=key+':'+clientKey(event), cur=buckets.get(id);
  if(!cur || now>=cur.reset){ buckets.set(id,{count:1,reset:now+windowMs}); return {ok:true}; }
  cur.count+=1;
  if(cur.count<=limit) return {ok:true};
  return {ok:false,retryAfter:Math.max(1,Math.ceil((cur.reset-now)/1000))};
}
function response(retryAfter){
  return {statusCode:429,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Retry-After':String(retryAfter)},body:JSON.stringify({error:'Too many requests. Please try again shortly.'})};
}
module.exports={allow,response};
