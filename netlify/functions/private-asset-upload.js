const crypto=require('crypto');
const {getBlobsStore}=require('./lib/blobs');
const {allow:rateAllow,response:rateResponse}=require('./lib/rate-limit');

const STORE='fw-private-assets';
const ASSETS={
  reset:'Fitness_World_30-Day_Natural_Wellness_Reset.pdf',
  encyclopedia:'Fitness_World_Natural_Wellness_Encyclopedia.pdf'
};

function json(statusCode,body){
  return {statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'},body:JSON.stringify(body)};
}
function safeEqual(a,b){
  const aa=Buffer.from(String(a||'')),bb=Buffer.from(String(b||''));
  if(!aa.length||aa.length!==bb.length)return false;
  return crypto.timingSafeEqual(aa,bb);
}
exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
  const rate=rateAllow(event,{limit:4,windowMs:10*60*1000,key:'private-asset-upload'});
  if(!rate.ok)return rateResponse(rate.retryAfter);

  const configured=String(process.env.FW_PRIVATE_UPLOAD_SECRET||'');
  const supplied=String(event.headers?.['x-fw-upload-secret']||event.headers?.['X-FW-Upload-Secret']||'');
  if(configured.length<24||!safeEqual(configured,supplied))return json(403,{error:'Unauthorized'});

  let body;
  try{body=JSON.parse(event.body||'{}');}catch(_){return json(400,{error:'Invalid JSON'});}
  const asset=String(body.asset||'reset');
  const key=ASSETS[asset];
  if(!key)return json(400,{error:'Unsupported asset'});
  const encoded=String(body.data||'').replace(/^data:application\/pdf;base64,/i,'');
  let bytes;
  try{bytes=Buffer.from(encoded,'base64');}catch(_){return json(400,{error:'Invalid PDF encoding'});}
  if(bytes.length<100000||bytes.length>20*1024*1024)return json(400,{error:'Unexpected PDF size'});
  if(bytes.subarray(0,5).toString('ascii')!=='%PDF-')return json(400,{error:'File is not a PDF'});

  const hash=crypto.createHash('sha256').update(bytes).digest('hex');
  try{
    const store=await getBlobsStore({name:STORE,consistency:'strong'});
    const arrayBuffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
    await store.set(key,arrayBuffer,{metadata:{filename:key,content_type:'application/pdf',size:String(bytes.length),sha256:hash,uploaded_at:new Date().toISOString()}});
    const check=await store.getMetadata(key,{consistency:'strong'});
    if(!check)return json(503,{error:'Upload could not be verified'});
    return json(200,{stored:true,asset,key,size:bytes.length,sha256:hash});
  }catch(error){
    console.error('[Fitness World] private asset upload failed',String(error.message||error));
    return json(503,{error:'Private asset storage unavailable'});
  }
};
