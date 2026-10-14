import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const origin='https://fitnessworld.pro';
const key='d482b21ce1704ad7b8e43ac96306f219';
const all=process.argv.includes('--all');
const dry=process.argv.includes('--dry-run');
const before=process.env.INDEXNOW_BEFORE || '';
const locs=[...readFileSync('sitemap.xml','utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1].replaceAll('&amp;','&'));
if(!locs.length || locs.some(u=>new URL(u).origin!==origin)) throw Error('Invalid production sitemap');
let changed=[];
if(before && !/^0+$/.test(before)) changed=execFileSync('git',['diff','--name-only',before,'HEAD'],{encoding:'utf8'}).trim().split('\n');
const initial=changed.some(p=>p==='d482b21ce1704ad7b8e43ac96306f219.txt' || p==='scripts/submit-indexnow.mjs');
const shared=changed.some(p=>/^(assets\/|netlify\/edge-functions\/|_redirects$|netlify.toml$)/.test(p));
const pathUrl=p=>origin+'/'+p.replace(/index\.html$/,'');
let urls=all||initial||shared||!before ? locs : changed.filter(p=>p.endsWith('.html')).map(pathUrl).filter(u=>locs.includes(u));
urls=[...new Set(urls)];
if(!urls.length){console.log('No indexable page changes; nothing submitted.');process.exit(0);}
console.log('IndexNow URLs:',urls.length);
if(dry){console.log(JSON.stringify(urls,null,2));process.exit(0);}
const fetchText=async u=>{const r=await fetch(u,{signal:AbortSignal.timeout(20000),headers:{'Cache-Control':'no-cache'}});if(!r.ok)throw Error(u+' returned '+r.status);return r.text();};
const changedHtml=changed.filter(p=>p.endsWith('.html') && locs.includes(pathUrl(p)));
let ready=false;
for(let attempt=0;attempt<30;attempt++){
 try{
  if((await fetchText(origin+'/'+key+'.txt')).trim()!==key) throw Error('Key not deployed yet');
  for(const p of changedHtml) if((await fetchText(pathUrl(p))).trim()!==readFileSync(p,'utf8').trim()) throw Error('Page deployment pending: '+p);
  const liveLocs=[...(await fetchText(origin+'/sitemap.xml')).matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1].replaceAll('&amp;','&'));
  if(urls.some(u=>!liveLocs.includes(u))) throw Error('Sitemap deployment pending');
  ready=true;break;
 }catch(e){console.log(e.message);if(attempt<29)await new Promise(r=>setTimeout(r,20000));}
}
if(!ready)throw Error('Production deployment did not become ready; no URLs submitted.');
const response=await fetch('https://api.indexnow.org/indexnow',{method:'POST',headers:{'Content-Type':'application/json; charset=utf-8'},body:JSON.stringify({host:'fitnessworld.pro',key,keyLocation:origin+'/'+key+'.txt',urlList:urls}),signal:AbortSignal.timeout(30000)});
console.log('IndexNow response:',response.status);
if(![200,202].includes(response.status))throw Error('Submission failed: '+(await response.text()).slice(0,500));
console.log('URLs received; indexing is decided by the search engines.');
