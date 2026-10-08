import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const skipDirs=new Set(['.git','.netlify','node_modules']);
const htmlFiles=[];
function walk(dir){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if(skipDirs.has(ent.name)) continue;
    const p=path.join(dir,ent.name);
    if(ent.isDirectory()) walk(p);
    else if(ent.isFile() && ent.name.endsWith('.html')) htmlFiles.push(p);
  }
}
walk(root);

const rel=p=>path.relative(root,p).replaceAll('\\\\','/');
const strip=s=>String(s||'').replace(/[?#].*$/,'');
function localCandidates(from,href){
  if(!href || /^(?:https?:|mailto:|tel:|javascript:|data:|#)/i.test(href)) return null;
  if(href.startsWith('/.netlify/functions/')) return null;
  const clean=strip(href);
  if(!clean) return null;
  const p=clean.startsWith('/')?path.join(root,clean.slice(1)):path.resolve(path.dirname(from),clean);
  const out=[p];
  if(path.extname(p)==='') out.push(path.join(p,'index.html'));
  return out;
}

const errors=[];
const warnings=[];
let jsonLdBlocks=0,linksChecked=0,imagesChecked=0;
for(const file of htmlFiles){
  const html=fs.readFileSync(file,'utf8');
  const name=rel(file);

  for(const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
    jsonLdBlocks++;
    try{JSON.parse(m[1].trim());}catch(e){errors.push(name+': invalid JSON-LD ('+e.message+')');}
  }

  const ids=[...html.matchAll(/\sid=["']([^"']+)["']/gi)].map(m=>m[1]);
  const seen=new Set();
  for(const id of ids){if(seen.has(id)) warnings.push(name+': duplicate id '+id); seen.add(id);}

  for(const m of html.matchAll(/<a\b([^>]*)>/gi)){
    const attrs=m[1];
    const hm=attrs.match(/\shref=["']([^"']+)["']/i);
    const href=hm&&hm[1];
    if(!href) continue;
    const candidates=localCandidates(file,href);
    if(candidates){
      linksChecked++;
      if(!candidates.some(p=>fs.existsSync(p))) errors.push(name+': broken internal link -> '+href);
    }
    if(/\starget=["']_blank["']/i.test(attrs) && !/\srel=["'][^"']*noopener/i.test(attrs)) warnings.push(name+': target=_blank without noopener -> '+href);
  }

  for(const m of html.matchAll(/<img\b([^>]*)>/gi)){
    imagesChecked++;
    const attrs=m[1];
    const sm=attrs.match(/\ssrc=["']([^"']+)["']/i);
    const src=sm&&sm[1];
    if(!/\salt=["'][^"']*["']/i.test(attrs)) errors.push(name+': image missing alt -> '+(src||'(unknown src)'));
    const candidates=localCandidates(file,src);
    if(candidates && !candidates.some(p=>fs.existsSync(p))){
      if(String(src||'').startsWith('/assets/images/pexels-cache/')) warnings.push(name+': legacy Pexels cache image not present in repo -> '+src);
      else errors.push(name+': missing image -> '+src);
    }
  }

  const indexable=!/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html);
  if(indexable && !/<link\b[^>]*rel=["']canonical["']/i.test(html)) warnings.push(name+': indexable page missing canonical');
  if(!/<meta\b[^>]*name=["']viewport["']/i.test(html)) errors.push(name+': missing viewport meta');
  if(!/<title>[^<]+<\/title>/i.test(html)) errors.push(name+': missing title');
}

console.log('Static QA: '+htmlFiles.length+' HTML files, '+linksChecked+' internal links, '+imagesChecked+' images, '+jsonLdBlocks+' JSON-LD blocks.');
if(warnings.length){
  console.log('Warnings ('+warnings.length+'):');
  for(const w of warnings.slice(0,80)) console.log('  - '+w);
  if(warnings.length>80) console.log('  ... '+(warnings.length-80)+' more warnings');
}
if(errors.length){
  console.error('Errors ('+errors.length+'):');
  for(const e of errors.slice(0,120)) console.error('  - '+e);
  if(errors.length>120) console.error('  ... '+(errors.length-120)+' more errors');
  process.exit(1);
}
console.log('Static QA passed.');
