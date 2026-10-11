import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';
const root=process.cwd(), out=path.join(root,'responsive-audit');
await fs.mkdir(out,{recursive:true});
async function pages(dir=''){
 const results=[];
 for(const entry of await fs.readdir(path.join(root,dir),{withFileTypes:true})){
  if(entry.name.startsWith('.')||['node_modules','responsive-audit','assets','netlify','scripts','reports'].includes(entry.name))continue;
  const file=path.join(dir,entry.name);
  if(entry.isDirectory())results.push(...await pages(file));
  else if(entry.name==='index.html')results.push('/'+(dir?dir+'/':''));
 }
 return results;
}
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  let file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
  if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403);res.end();return;}
  if((await fs.stat(file)).isDirectory())file=path.join(file,'index.html');
  const body=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(body);
 }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true});
const report={date:new Date().toISOString(),scope:'All repository index pages, real Chromium rendering; mocked API/analytics to prevent audit traffic and emails',results:[],errors:[]};
const routes=(await pages()).filter(url=>!url.startsWith('/go/'));
for(const width of [390,1440]){
 const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1});
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.pathname.startsWith('/.netlify/functions/')){
   await route.fulfill({json:{success:true,comments:[],sent:true}});return;
  }
  if(url.origin!==origin){await route.abort();return;}
  await route.continue();
 });
 const page=await context.newPage();
 for(const url of routes){
  try{
   await page.goto(origin+url,{waitUntil:'domcontentloaded',timeout:20000});
   await page.waitForTimeout(350);
   const result=await page.evaluate(()=>{
    const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none';};
    const overflow=[...document.querySelectorAll('main *')].filter(visible).filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+3||r.left< -3;}).filter(e=>!e.closest('[class*="carousel"],[class*="scroll"],.table-wrap,.table-responsive')).slice(0,10).map(e=>({tag:e.tagName,class:e.className,text:e.textContent.trim().slice(0,65)}));
    return {title:document.title,viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,overflow};
   });
   report.results.push({url,width,...result});
   if(result.documentWidth>width+3)report.errors.push({url,width,reason:'Horizontal page overflow',...result});
   if(['/','/shop/','/natural/','/contact/','/free-guide/','/mens-health/testosterone-what-actually-works/','/worth-it/nitric-boost-ultra-review/'].includes(url)){
    await page.screenshot({path:path.join(out,`${width}-${url==='/'?'home':url.replaceAll('/','_')}.png`),fullPage:true});
   }
  }catch(error){report.errors.push({url,width,reason:error.message});}
 }
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
 // Validate the actual opt-in/opt-out payload without delivering real email or changing sheets.
 const captured=[];
 await page.unroute('**/*');
 await page.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.pathname.startsWith('/.netlify/functions/')){
   if(req.method()==='POST'){try{captured.push({path:url.pathname,body:req.postDataJSON()});}catch{}}
   await route.fulfill({json:{success:true,sent:true,comments:[]}});return;
  }
  if(url.origin!==origin){await route.abort();return;}
  await route.continue();
 });
 for(const consent of [false,true]){
  captured.length=0;
  await page.goto(origin+'/free-guide/',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(400);
  const form=page.locator('#free-guide-download-form:visible,#free-guide-download-form-2:visible').first();
  if(!(await form.count())){report.errors.push({width,reason:'Free guide form missing'});break;}
  const email=form.locator('input[type=email]');
  await email.fill('abc@');
  if(await email.evaluate(e=>e.checkValidity()))report.errors.push({width,reason:'Invalid email accepted'});
  await email.fill('audit@example.com');
  await form.locator('input[name="marketing_consent"]').setChecked(consent);
  await form.locator('button[type=submit]').click();
  await page.waitForTimeout(700);
  const signup=captured.find(e=>e.body.event_type==='free_pdf_signup');
  if(!signup||signup.body.marketing_consent!==(consent?'Yes':'No'))report.errors.push({width,reason:'Consent payload mismatch',consent,captured});
  report.results.push({url:'/free-guide/',width,test:'email consent',consent,recorded:signup?.body.marketing_consent});
 }
 await page.goto(origin+'/shop/',{waitUntil:'domcontentloaded'});
 await page.waitForTimeout(400);
 captured.length=0;
 await page.locator('[data-shop-key="free-preview"]').click();
 await page.waitForTimeout(500);
 const shopClick=captured.find(e=>e.body.event_type==='cta_click'&&e.body.source_page==='/shop/');
 if(!shopClick)report.errors.push({width,reason:'Shop click did not reach tracking relay'});
 report.results.push({url:'/shop/',width,test:'Shop click relay',passed:!!shopClick});
 await context.close();
 console.log('Rendered '+routes.length+' pages at '+width+'px');
}
await browser.close();await new Promise(resolve=>server.close(resolve));
await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({pages:routes.length,renderings:report.results.length,errors:report.errors.length}));
if(report.errors.length)process.exitCode=1;
