const {allow:rateAllow,response:rateResponse}=require('./lib/rate-limit');
const {verifyToken,encyclopediaBuffer}=require('./lib/fw');
exports.handler=async(event)=>{
  const rate=rateAllow(event,{limit:30,windowMs:60000,key:'download'}); if(!rate.ok) return rateResponse(rate.retryAfter);
  const token=event.queryStringParameters?.token||'';
  const payload=verifyToken(token);
  if(!payload) return {statusCode:403,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'},body:'This secure download link is invalid or expired.'};
  try{
    const pdf=encyclopediaBuffer();
    return {statusCode:200,isBase64Encoded:true,headers:{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="Fitness_World_Natural_Wellness_Encyclopedia.pdf"','Cache-Control':'private, no-store','X-Robots-Tag':'noindex'},body:pdf.toString('base64')};
  }catch(_){ return {statusCode:500,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'},body:'The download file is temporarily unavailable.'}; }
};
