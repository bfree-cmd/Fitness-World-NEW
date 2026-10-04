(function(){
'use strict';
function init(grid){
 if(grid.dataset.fwV1594Ready==='1')return;
 const cards=Array.from(grid.children).filter(el=>/^(A|ARTICLE|DIV)$/.test(el.tagName));
 const step=Math.max(1,parseInt(grid.dataset.fwV1594Step||'3',10));
 if(cards.length<=step)return;
 grid.dataset.fwV1594Ready='1'; let visible=step;
 const wrap=document.createElement('div'); wrap.className='fw-v1594-progressive-control';
 const btn=document.createElement('button'); btn.type='button'; btn.className='fw-v1594-load-more'; wrap.appendChild(btn); grid.insertAdjacentElement('afterend',wrap);
 const filterAware=grid.dataset.fwV1510FilterAware==='1';
 const matching=()=>filterAware?cards.filter(c=>c.dataset.fwFilterMatch!=='0'):cards;
 function paint(){
   const match=matching(), allowed=new Set(match.slice(0,visible));
   cards.forEach(card=>{
     const isMatch=!filterAware||card.dataset.fwFilterMatch!=='0'; const show=isMatch&&allowed.has(card);
     card.hidden=!show; if(!show)card.style.setProperty('display','none','important');else card.style.removeProperty('display');
     card.setAttribute('aria-hidden',show?'false':'true');
   });
   const all=visible>=match.length;
   const hideOnComplete=grid.dataset.fwV1594HideOnComplete==='1';
   wrap.hidden=match.length<=step || (all&&hideOnComplete);
   btn.textContent=all?'SHOW LESS ↑':'LOAD MORE ↓'; btn.setAttribute('aria-expanded',all?'true':'false');
 }
 btn.addEventListener('click',()=>{
   const total=matching().length;
   if(visible>=total){visible=step;paint();grid.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}
   else {visible=Math.min(total,visible+step);paint();}
 });
 grid.addEventListener('fw:progressive-filter-change',()=>{visible=step;paint();});
 paint();
}
function boot(){document.querySelectorAll('[data-fw-v1594-progressive]').forEach(init);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
