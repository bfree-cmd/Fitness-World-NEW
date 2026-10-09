const reply = (statusCode, body) => ({statusCode, headers: {'content-type':'application/json','cache-control':'no-store'}, body:JSON.stringify(body)});
exports.handler = async event => {
  if (!['GET','POST'].includes(event.httpMethod)) return reply(405,{error:'Method not allowed'});
  const endpoint=process.env.FW_COMMENTS_SHEET_ENDPOINT, secret=process.env.FW_COMMENTS_SHEET_SECRET;
  if (!endpoint || !secret) return reply(503,{error:'Comments are temporarily unavailable.'});
  try {
    const b=event.httpMethod==='GET'?{action:'list',article:event.queryStringParameters?.article}:JSON.parse(event.body||'{}');
    if (!['list','submit','report'].includes(b.action)) return reply(400,{error:'Invalid action'});
    if (typeof b.article!=='string' || !/^\/[a-z0-9-]+\/[a-z0-9-]+\/$/.test(b.article)) return reply(400,{error:'Invalid article'});
    const payload={action:b.action,article_path:b.article,comments_secret:secret};
    if(b.action==='submit') Object.assign(payload,{display_name:b.name,email:b.email,body:b.comment,notify_replies:b.notify===true,website:b.website});
    if(b.action==='report') Object.assign(payload,{comment_id:b.comment_id,reason:b.reason});
    const r=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(10000)});
    if(!r.ok) return reply(502,{error:'Comments are temporarily unavailable.'});
    const d=await r.json();
    if(d.success!==true) return reply(400,{error:d.error||'Unable to complete request.'});
    if(b.action==='list') {
      const all=(Array.isArray(d.comments)?d.comments:[]).map(c=>({id:String(c.id||''),parent_id:String(c.parent_id||''),display_name:String(c.display_name||''),body:String(c.body||''),is_editorial:c.is_editorial===true,created_at:String(c.created_at||'')}));
      return reply(200,{comments:all.filter(c=>!c.parent_id).map(c=>({...c,replies:all.filter(r=>r.parent_id===c.id)}))});
    }
    return reply(200,{status:d.status,published:d.published===true});
  } catch {return reply(502,{error:'Comments are temporarily unavailable.'});}
};
