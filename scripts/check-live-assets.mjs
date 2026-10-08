import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const base=(process.env.FW_AUDIT_BASE_URL||'https://fitnessworld.pro').replace(/\/$/,'');
const skip=new Set(['.git','.netlify','node_modules']);
const html=[];
function walk(dir){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if(skip.has(ent.name)) continue;
    const p=path.join(dir,ent.name);
    if(ent.isDirectory()) walk(p);
    else if(ent.isFile() && ent.name.endsWith('.html')) html.push(p);
  }
}
walk(root);

const refs=new Set();
for(const file of html){
  const s=fs.readFileSync(file,'utf8');
  for(const m of s.matchAll(/(?:src|srcset)=["']([^"']*\/assets\/images\/pexels-cache\/[^"'\s,]+)/gi)){
    refs.add(m[1].replace(/[?#].*$/,''));
  }
}

const urls=[...refs].sort();
const broken=[];
let cursor=0;
async function worker(){
  while(true){
    const i=cursor++;
    if(i>=urls.length) return;
    const asset=urls[i].startsWith('http')?urls[i]:base+urls[i];
    try{
      let r=await fetch(asset,{method:'HEAD',redirect:'follow'});
      if(r.status===405 || r.status===501) r=await fetch(asset,{method:'GET',redirect:'follow',headers:{Range:'bytes=0-0'}});
      if(!r.ok) broken.push({asset:urls[i],status:r.status});
    }catch(e){
      broken.push({asset:urls[i],status:'network-error'});
    }
  }
}
await Promise.all(Array.from({length:Math.min(16,Math.max(1,urls.length))},worker));

const report={
  checked:urls.length,
  broken:broken.length,
  broken_assets:broken.sort((a,b)=>String(a.asset).localeCompare(String(b.asset)))
};
fs.writeFileSync('live-pexels-assets-report.json',JSON.stringify(report,null,2));
console.log('Live Pexels cache audit: '+report.checked+' referenced assets checked; '+report.broken+' unavailable.');
for(const item of report.broken_assets.slice(0,120)) console.log('  - '+item.status+' '+item.asset);
if(report.broken>120) console.log('  ... '+(report.broken-120)+' more');
