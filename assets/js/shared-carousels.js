(function(){
  'use strict';
  const reduced=()=>window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function setup(root){
    const track=root.querySelector('[data-fw-carousel-track]');
    const controls=root.querySelector('[data-fw-carousel-controls]');
    if(!track||!controls)return;
    const prev=controls.querySelector('.fw-carousel-prev'), next=controls.querySelector('.fw-carousel-next'), dots=controls.querySelector('[data-fw-carousel-dots]');
    const cards=()=>Array.from(track.children).filter(x=>x.matches('a,article'));
    let pageCount=1, active=0, itemPerPage=1, positions=[];
    function measure(){
      const cs=cards(); if(!cs.length)return;
      const kind=root.getAttribute('data-fw-carousel')||'';
      const w=window.innerWidth;
      if(kind==='related'){
        itemPerPage=w>=761?3:1;
        track.style.setProperty('display','flex','important');
        track.style.setProperty('flex-wrap','nowrap','important');
        track.style.setProperty('overflow-x','auto','important');
        const gap=parseFloat(getComputedStyle(track).columnGap||getComputedStyle(track).gap)||16;
        const usedGap=Math.max(0,gap*(itemPerPage-1));
        cs.forEach(card=>{card.style.setProperty('flex',w>=761?`0 0 calc((100% - ${usedGap}px)/3)`:'0 0 100%','important');});
      } else if(kind==='waw') itemPerPage=w>=1081?3:(w>=901?2:1);
      else itemPerPage=1;
      controls.hidden=cs.length<=itemPerPage;
      pageCount=Math.max(1,Math.ceil(cs.length/itemPerPage));
      positions=[];
      for(let i=0;i<pageCount;i++){
        const idx=Math.min(i*itemPerPage,cs.length-1); const tr=track.getBoundingClientRect(), cr=cs[idx].getBoundingClientRect(); positions.push(track.scrollLeft + (cr.left-tr.left));
      }
      if(kind==='related' || kind==='waw') {
        const shell=root.querySelector(kind==='related'?'.fw-related-carousel-shell':'.fw-waw-carousel-shell')||root;
        const target=(cs[0].querySelector('img')||cs[0]);
        const sr=shell.getBoundingClientRect(), tr=target.getBoundingClientRect();
        const y=kind==='waw' ? (tr.bottom-sr.top) : ((tr.top-sr.top)+(tr.height/2));
        shell.style.setProperty(kind==='related'?'--fw-related-arrow-y':'--fw-waw-arrow-y',Math.max(0,y)+'px');
      }
      buildDots(); sync();
    }
    function buildDots(){
      if(!dots)return; dots.textContent='';
      for(let i=0;i<pageCount;i++){
        const b=document.createElement('button'); b.type='button'; b.className='fw-carousel-dot'; b.setAttribute('aria-label','Go to carousel position '+(i+1)+' of '+pageCount);
        b.addEventListener('click',()=>go(i)); dots.appendChild(b);
      }
    }
    function go(i){
      active=Math.max(0,Math.min(pageCount-1,i));
      track.scrollTo({left:positions[active]||0,behavior:reduced()?'auto':'smooth'}); updateControls();
    }
    function sync(){
      if(!positions.length)return;
      let best=0,dist=Infinity; const x=track.scrollLeft;
      positions.forEach((p,i)=>{const d=Math.abs(p-x);if(d<dist){dist=d;best=i}}); active=best; updateControls();
    }
    function updateControls(){
      if(prev)prev.disabled=active<=0;if(next)next.disabled=active>=pageCount-1;
      if(dots)Array.from(dots.children).forEach((d,i)=>d.classList.toggle('is-active',i===active));
    }
    let raf=0; track.addEventListener('scroll',()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(sync)},{passive:true});
    prev&&prev.addEventListener('click',()=>go(active-1)); next&&next.addEventListener('click',()=>go(active+1));
    const ro='ResizeObserver' in window?new ResizeObserver(measure):null; ro&&ro.observe(track); window.addEventListener('resize',measure,{passive:true});
    cards().forEach(card=>{const im=card.querySelector('img');if(im&&!im.complete)im.addEventListener('load',measure,{once:true});});
    measure();
  }
  const init=()=>document.querySelectorAll('[data-fw-carousel]').forEach(setup);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
