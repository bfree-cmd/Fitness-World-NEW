const {allow:rateAllow,response:rateResponse}=require('./lib/rate-limit');
const fs=require('fs');
const {getBlobsStore}=require('./lib/blobs');
const {verifyToken,encyclopediaBuffer,resetPath}=require('./lib/fw');

const PRIVATE_STORE='fw-private-assets';
const RESET_KEY='Fitness_World_30-Day_Natural_Wellness_Reset.pdf';
const ENCYCLOPEDIA_KEY='Fitness_World_Natural_Wellness_Encyclopedia.pdf';

async function blobPdf(key){
  const store=await getBlobsStore({name:PRIVATE_STORE,consistency:'strong'});
  const data=await store.get(key,{type:'arrayBuffer',consistency:'strong'});
  return data?Buffer.from(data):null;
}

exports.handler=async(event)=>{
  const rate=rateAllow(event,{limit:30,windowMs:60000,key:'download'}); if(!rate.ok) return rateResponse(rate.retryAfter);
  const token=event.queryStringParameters?.token||'';
  const payload=verifyToken(token);
  if(!payload)return {statusCode:403,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'},body:'This secure download link is invalid or expired.'};

  try{
    const reset=payload.product==='reset';
    let pdf=null;
    try{
      pdf=await blobPdf(reset?RESET_KEY:ENCYCLOPEDIA_KEY);
    }catch(error){
      console.error('[Fitness World] private PDF blob read failed',{product:reset?'reset':'encyclopedia',error:String(error.message||error)});
    }

    // Rollback compatibility: a local/CLI deploy that still bundles the private files continues to work.
    if(!pdf)pdf=reset?fs.readFileSync(resetPath()):encyclopediaBuffer();

    const filename=reset?RESET_KEY:ENCYCLOPEDIA_KEY;
    return {
      statusCode:200,
      isBase64Encoded:true,
      headers:{
        'Content-Type':'application/pdf',
        'Content-Disposition':'attachment; filename="'+filename+'"',
        'Cache-Control':'private, no-store',
        'X-Robots-Tag':'noindex'
      },
      body:pdf.toString('base64')
    };
  }catch(error){
    console.error('[Fitness World] secure PDF unavailable',String(error.message||error));
    return {statusCode:500,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'},body:'The download file is temporarily unavailable.'};
  }
};
