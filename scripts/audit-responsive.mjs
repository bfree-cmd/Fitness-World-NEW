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
    return {title:document.title,viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,overflow,linkedInLinks:document.querySelectorAll('a[href*="linkedin.com"]').length};
   });
   report.results.push({url,width,...result});
   if(result.linkedInLinks)report.errors.push({url,width,reason:'Unowned LinkedIn link remains'});
   const short=page.locator('[data-fw-short]');
   if(await short.count()){
    if(await short.count()!==1)report.errors.push({url,width,reason:'Duplicate Short'});
    if(await short.locator('iframe').count()!==1)report.errors.push({url,width,reason:'Native YouTube embed missing'});
    if(await short.locator('button,.fw-short__copy,.fw-short__external').count())report.errors.push({url,width,reason:'Custom video cover or duplicate links remain'});
    const videoId=await short.getAttribute('data-fw-short');
    const player=await short.locator('.fw-short__player').boundingBox();
    const fullVideo=await short.evaluate(el=>el.classList.contains('fw-short--full'));
    const expectedHeight=player?(fullVideo?Math.max(200,player.width*9/16):player.width*16/9):0;
    if(!player||player.width<200||Math.abs(player.height-expectedHeight)>3)report.errors.push({url,width,reason:'Invalid player size',player});
    const frame=short.locator('iframe');
    const source=await frame.getAttribute('src');
    if(!source?.startsWith('https://www.youtube-nocookie.com/embed/'+videoId+'?')||!source.includes('playsinline=1')||!source.includes('autoplay=0'))report.errors.push({url,width,reason:'Incorrect Short player URL',source});
    if(!(await frame.getAttribute('title'))||await frame.getAttribute('referrerpolicy')!=='strict-origin-when-cross-origin')report.errors.push({url,width,reason:'Player title/referrer policy missing'});
    if(await frame.getAttribute('loading')!=='lazy')report.errors.push({url,width,reason:'Video lazy loading missing'});
    report.results.push({url,width,test:'Native YouTube embed',videoId,source,player});
    const paired=await short.evaluate(el=>{
     const parent=el.parentElement;
     if(!parent.classList.contains('fw-short-with-reading'))return null;
     const reading=parent.querySelector(':scope > section').getBoundingClientRect(),video=el.getBoundingClientRect();
     const heading=parent.querySelector(':scope > section .fw-v1510-section-head');
     const headingWidth=heading?.getBoundingClientRect().width,copyWidth=heading?.firstElementChild?.getBoundingClientRect().width;
     return {reading:{top:reading.top,bottom:reading.bottom,right:reading.right},video:{top:video.top,bottom:video.bottom,left:video.left},headingWidth,copyWidth};
    });
    if(paired){
     const expectedTop=Math.max(paired.reading.top,paired.reading.bottom-(paired.video.bottom-paired.video.top));
     const fits=width>1000?Math.abs(expectedTop-paired.video.top)<4&&paired.reading.right<=paired.video.left:paired.video.top>=paired.reading.bottom-2;
     if(!fits)report.errors.push({url,width,reason:'Short is not paired with reading correctly',paired});
     if(paired.headingWidth&&paired.copyWidth<paired.headingWidth-4)report.errors.push({url,width,reason:'Heading narrowed by an empty grid column',paired});
     report.results.push({url,width,test:'Short beside related reading',passed:fits});
    }

   }

   const sidebarShort=await page.locator('.fw-short--sidebar').count();
   if(sidebarShort){
    const layout=await page.evaluate(()=>{
     const video=document.querySelector('.fw-short--sidebar'),article=document.querySelector('article.article-prose-fixed'),sidebar=video.closest('.article-sidebar-fw'),offer=sidebar?.querySelector('.desktop-article-product-cta');
     if(!article||!sidebar||!offer)return null;
     const v=video.getBoundingClientRect(),a=article.getBoundingClientRect(),s=sidebar.getBoundingClientRect(),o=offer.getBoundingClientRect();
     const beside=s.left>=a.right-2;
     return {beside,insideArticle:article.contains(video),gap:v.top-o.bottom,afterArticle:v.top>=a.bottom-2,insideRail:v.left>=s.left-2&&v.right<=s.right+2};
    });
    const fits=layout&&!layout.insideArticle&&layout.insideRail&&(layout.beside?layout.gap>=-2&&layout.gap<=40:layout.afterArticle);
    if(!fits)report.errors.push({url,width,reason:'Article Short left its sidebar or introduced an empty gap',layout});
    report.results.push({url,width,test:'Article Short in sidebar; after text when stacked',passed:!!fits,layout});
   }
   if(await page.locator('.fw-protein-explainer').count()){
    const layout=await page.evaluate(()=>{
     const help=document.querySelector('.fw-protein-explainer'),panel=document.querySelector('.tool-shell>.panel'),result=document.querySelector('.tool-shell>.result'),video=help.querySelector('[data-fw-short]'),copy=help.querySelector('.fw-protein-explainer-copy');
     const h=help.getBoundingClientRect(),p=panel.getBoundingClientRect(),r=result.getBoundingClientRect(),v=video.getBoundingClientRect(),c=copy.getBoundingClientRect();
     const stacked=Math.abs(p.left-r.left)<20;
     return {stacked,equalCards:Math.abs(p.height-r.height)<3,afterInputs:r.top>=p.bottom-2,helpGap:h.top-Math.max(p.bottom,r.bottom),videoInside:v.left>=h.left&&v.right<=h.right&&v.top>=h.top&&v.bottom<=h.bottom,videoPaired:innerWidth>800?v.left>=c.right:v.top>=c.bottom,noProgress:!result.querySelector('.progress')};
    });
    const fits=layout.videoInside&&layout.videoPaired&&layout.noProgress&&layout.helpGap>=0&&layout.helpGap<=32&&(layout.stacked?layout.afterInputs:layout.equalCards);
    if(!fits)report.errors.push({url,width,reason:'Approved protein calculator layout regression',layout});
    report.results.push({url,width,test:'Compact calculator cards and integrated explanation video',passed:fits,layout});
   }
   // A desktop resource rail must follow the reader, while its contents and
   // the footer remain independently reachable. Stacked mobile rails stay in flow.
   const resourceRail=page.locator('main.fw-sticky-cta-layout > aside.fw-sticky-cta-track');
   if(await resourceRail.count()){
    const before=await resourceRail.evaluate(e=>{const r=e.getBoundingClientRect();return {top:r.top,left:r.left,width:r.width,height:r.height,position:getComputedStyle(e).position,scrollY:window.scrollY};});
    if(width>1024){
     await page.evaluate(()=>{const rail=document.querySelector('main.fw-sticky-cta-layout > aside.fw-sticky-cta-track'),r=rail.getBoundingClientRect(),main=rail.parentElement.getBoundingClientRect();window.scrollBy({top:Math.max(0,r.top-92)+500,behavior:"instant"});});
     const follow=await resourceRail.evaluate(e=>{const r=e.getBoundingClientRect(),main=e.parentElement.getBoundingClientRect(),s=getComputedStyle(e);return {top:r.top,bottom:r.bottom,mainBottom:main.bottom,position:s.position,overflow:s.overflowY,height:r.height,mainPaddingBottom:parseFloat(getComputedStyle(e.parentElement).paddingBottom)||0,scrollY:window.scrollY};});
     const expectedTop=Math.min(Math.max(92,before.top-(follow.scrollY-before.scrollY)),follow.mainBottom-follow.mainPaddingBottom-follow.height);
     const fits=follow.position==='sticky'&&Math.abs(follow.top-expectedTop)<3&&follow.height<=900-112+3&&follow.bottom<=follow.mainBottom+3;
     if(!fits)report.errors.push({url,width,reason:'Desktop resource offer does not follow scrolling safely',before,follow});
     report.results.push({url,width,test:'Resource rail follows scrolling within main',passed:fits});
     await page.evaluate(()=>window.scrollTo({top:0,behavior:"instant"}));
    }else if(['sticky','fixed'].includes(before.position))report.errors.push({url,width,reason:'Stacked mobile resource rail must remain in flow',before});
   }
   if(result.documentWidth>width+3)report.errors.push({url,width,reason:'Horizontal page overflow',...result});
   if(['/','/shop/','/affiliate-disclosure/','/mens-health/','/the-30-day-natural-wellness-reset/','/contact/','/free-guide/','/mens-health/testosterone-what-actually-works/','/worth-it/nitric-boost-ultra-review/'].includes(url)){
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
  if(!(await page.locator('#free-guide-success').isVisible()))report.errors.push({width,reason:'Confirmed email did not open success dialog'});
  if(await page.locator('a[href*="fitness-world-30-day-reset-free-preview.pdf"]').count())report.errors.push({width,reason:'Free guide page still links directly to PDF'});
  if(!signup||signup.body.marketing_consent!==(consent?'Yes':'No'))report.errors.push({width,reason:'Consent payload mismatch',consent,captured});
  report.results.push({url:'/free-guide/',width,test:'email consent',consent,recorded:signup?.body.marketing_consent});
 }
 await page.route('**/.netlify/functions/send-free-guide',route=>route.fulfill({status:503,json:{sent:false,error:'Test provider failure'}}));
 await page.goto(origin+'/free-guide/',{waitUntil:'domcontentloaded'});
 await page.waitForTimeout(400);
 const failureForm=page.locator('#free-guide-download-form-2');
 await failureForm.locator('input[type=email]').fill('audit@example.com');
 await failureForm.locator('button[type=submit]').click();
 await page.waitForTimeout(700);
 const failureButton=failureForm.locator('button[type=submit]');
 if(await page.locator('#free-guide-success').isVisible()||await failureButton.isDisabled()||await failureButton.textContent()!=='TRY AGAIN')report.errors.push({width,reason:'Email failure incorrectly confirmed or cannot retry'});
 report.results.push({url:'/free-guide/',width,test:'email failure permits retry without false success'});
 await page.unroute('**/.netlify/functions/send-free-guide');
 await page.goto(origin+'/shop/',{waitUntil:'domcontentloaded'});
 await page.waitForTimeout(400);
 if(width===390){
  const menu=page.locator('.mobile-menu-toggle');
  await menu.click();
  if(await menu.getAttribute('aria-expanded')!=='true')report.errors.push({width,reason:'Mobile menu did not open'});
  await page.getByRole('button',{name:'Tools & Guides menu',exact:true}).click();
  if(!(await page.locator('#fw-nav-menu-tools a[href="/shop/"]').isVisible()))report.errors.push({width,reason:'Shop navigation link missing'});
  await menu.click();
 }
 captured.length=0;
 await page.locator('[data-shop-key="free-preview"]').click();
 await page.waitForTimeout(500);
 const shopClick=captured.find(e=>e.body.event_type==='cta_click'&&e.body.source_page==='/shop/');
 if(!shopClick)report.errors.push({width,reason:'Shop click did not reach tracking relay'});
 report.results.push({url:'/shop/',width,test:'Shop click relay',passed:!!shopClick});
 await context.close();
 console.log('Rendered '+routes.length+' pages at '+width+'px');
}
// One live analytics check; intercept internal relays so the audit creates no leads/comments.
const liveContext=await browser.newContext({viewport:{width:390,height:900}});
await liveContext.route('**/.netlify/functions/**',route=>route.fulfill({json:{success:true,comments:[]}}));
const livePage=await liveContext.newPage();
const analytics=[];
livePage.on('response',response=>{
 const url=new URL(response.url());
 if(/(^|\.)google-analytics\.com$/.test(url.hostname)&&url.pathname.includes('collect')){
  const body=response.request().postData()||'';
  const name=url.searchParams.get('en')||new URLSearchParams(body).get('en')||'';
  analytics.push({event:name,status:response.status(),measurementId:url.searchParams.get('tid')||''});
 }
});
try{
 await livePage.goto('https://comforting-marigold-ea2f43.netlify.app/shop/',{waitUntil:'domcontentloaded',timeout:30000});
 await livePage.waitForTimeout(3000);
 await livePage.locator('[data-shop-key="free-preview"]').click();
 await livePage.waitForTimeout(4000);
 report.externalAnalytics={ga4Requests:analytics,ga4Received:analytics.some(r=>r.status>=200&&r.status<300),metaPixelConfigured:false,dashboardVerified:false};
}catch(error){report.externalAnalytics={error:error.message,dashboardVerified:false};}
await liveContext.close();
await browser.close();await new Promise(resolve=>server.close(resolve));
await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({pages:routes.length,renderings:report.results.length,errors:report.errors.length}));
if(report.errors.length)process.exitCode=1;
