import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

// All API and Meta traffic is intercepted. This never sends email or Pixel events.
const root=process.cwd();
const server=http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost');
    const file=path.join(root,decodeURIComponent(url.pathname)+(url.pathname.endsWith('/')?'index.html':''));
    res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');
    res.end(await fs.readFile(file));
  } catch {res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true});
let checks=0;
async function setup({granted=false,mode='success'}={}){
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  if(granted)await context.addInitScript(()=>localStorage.setItem('fwMarketingConsent','granted'));
  let metaRequests=0,release;
  const pending=new Promise(resolve=>{release=resolve;});
  await context.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url());
    if(url.hostname==='connect.facebook.net'){
      metaRequests++;
      await route.fulfill({contentType:'text/javascript',body:`window.__metaCalls=(window.fbq.queue||[]).map(a=>Array.from(a));window.fbq.callMethod=function(){window.__metaCalls.push(Array.from(arguments));};`});return;
    }
    if(url.pathname==='/.netlify/functions/send-free-guide'){
      if(mode==='pending')await pending;
      await route.fulfill({status:mode==='failure'?503:200,json:mode==='failure'?{sent:false}:{sent:true,id:'mock-delivery-id',...(mode==='skipped'?{skipped:true}:{})}});return;
    }
    if(url.pathname.startsWith('/.netlify/functions/')){await route.fulfill({json:{success:true,comments:[]}});return;}
    if(url.origin!==origin){await route.abort();return;}
    await route.continue();
  });
  const page=await context.newPage();
  return {page,context,release,requests:()=>metaRequests};
}
const events=(page,name)=>page.evaluate(name=>(window.__metaCalls||[]).filter(c=>c[0]==='track'&&c[1]===name),name);
try {
  const privacy=await setup();
  await privacy.page.goto(origin+'/?fw_pixel_test=1');
  assert.equal(privacy.requests(),0);checks++;
  await privacy.page.getByRole('button',{name:'Reject tracking',exact:true}).click();
  assert.equal(privacy.requests(),0);checks++;
  await privacy.page.getByRole('button',{name:'Tracking preferences',exact:true}).click();
  await privacy.page.getByRole('button',{name:'Accept tracking',exact:true}).click();
  await privacy.page.waitForFunction(()=>window.__metaCalls);
  assert.equal(privacy.requests(),1);assert.equal((await events(privacy.page,'PageView')).length,1);checks+=2;
  const calls=await privacy.page.evaluate(()=>window.__metaCalls);
  assert.equal(calls.filter(c=>c[0]==='init').length,1);
  assert.equal(calls.find(c=>c[0]==='init')[1],'1822193155651073');
  assert(calls.some(c=>c[0]==='set'&&c[1]==='autoConfig'&&c[2]===false));checks+=3;
  await privacy.page.evaluate(()=>{
    FWTracking.track('free_guide_lead',{email:'never-forward@example.test'});
    FWTracking.confirmPreviewLead({sent:false},{event_id:'failure'});
    FWTracking.confirmPreviewLead({sent:true,skipped:true},{event_id:'bot'});
  });
  assert.equal((await events(privacy.page,'Lead')).length,0);checks++;
  await privacy.page.evaluate(()=>{
    for(let i=0;i<2;i++)FWTracking.confirmPreviewLead({sent:true},{event_id:'same-confirmation',email:'never-forward@example.test',health:'private'});
  });
  const lead=await events(privacy.page,'Lead');
  assert.equal(lead.length,1);assert.deepEqual(lead[0][2],{content_name:'free_preview',source:'free_guide'});checks+=2;
  await privacy.page.getByRole('button',{name:'Tracking preferences',exact:true}).click();
  await privacy.page.getByRole('button',{name:'Reject tracking',exact:true}).click();
  await privacy.page.evaluate(()=>FWTracking.confirmPreviewLead({sent:true},{event_id:'after-revoke'}));
  assert.equal((await events(privacy.page,'Lead')).length,1);checks++;
  await privacy.context.close();

  for(const url of ['/?token=private&fw_pixel_test=1','/thank-you/?fw_pixel_test=1','/']){
    const t=await setup({granted:true});await t.page.goto(origin+url);
    assert.equal(t.requests(),0,'Private URLs and ordinary previews must not initialize Meta');checks++;await t.context.close();
  }
  // Both free-guide forms, inline article capture, and the timed popup.
  for(const type of ['primary','secondary','article','popup']){
    for(const mode of ['failure','skipped','pending']){
      const t=await setup({granted:true,mode});
      if(type==='popup')await t.page.clock.install();
      await t.page.goto(origin+(type==='primary'||type==='secondary'?'/free-guide/':'/articles/creatine-for-women/')+'?fw_pixel_test=1');
      await t.page.waitForFunction(()=>window.__metaCalls);
      let form;
      if(type==='popup'){
        await t.page.evaluate(()=>window.scrollTo({top:document.documentElement.scrollHeight/3,behavior:'instant'}));
        await t.page.clock.runFor(8500);
        form=t.page.locator('#fw-preview-popup-form');
      }else if(type==='article')form=t.page.locator('.fw-article-email-form').first();
      else {
        if(type==='primary')await t.page.locator('#open-free-guide-form').click();
        form=t.page.locator(type==='primary'?'#free-guide-download-form':'#free-guide-download-form-2');
      }
      await form.locator('input[type=email]').fill('audit@example.test');
      await form.locator('button[type=submit]').click();
      await t.page.waitForTimeout(100);
      assert.equal((await events(t.page,'Lead')).length,0,type+' '+mode+' emitted an unconfirmed Lead');checks++;
      if(mode==='pending'){
        t.release();
        await t.page.waitForFunction(()=>(window.__metaCalls||[]).some(c=>c[0]==='track'&&c[1]==='Lead'));
        assert.equal((await events(t.page,'Lead')).length,1,type+' must emit exactly one confirmed Lead');checks++;
      }
      await t.context.close();
    }
  }
  console.log('Meta tracking: '+checks+' checks passed; consent, one Pixel/PageView, all four form placements, failure/spam/pending/success, deduplication and payload allowlist. No events or emails sent.');
} finally {await browser.close();server.close();}
