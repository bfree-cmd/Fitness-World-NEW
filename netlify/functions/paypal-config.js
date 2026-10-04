const {json,siteUrl}=require('./lib/fw');
exports.handler=async(event)=>{
  const clientId=String(process.env.PAYPAL_CLIENT_ID||'').trim();
  const hasSecret=Boolean(String(process.env.PAYPAL_CLIENT_SECRET||'').trim());
  const environment=String(process.env.PAYPAL_ENV||'live').toLowerCase()==='sandbox'?'sandbox':'live';
  return json(200,{
    configured:Boolean(clientId&&hasSecret),
    clientId:clientId||'',
    environment,
    resolvedSiteUrl:siteUrl(event),
    missing:{clientId:!clientId,clientSecret:!hasSecret}
  });
};
