/* Fitness World Mobile UX Template System — V1
   Mobile-only progressive disclosure for long hub pages.
   Desktop is intentionally untouched. Content remains in the DOM and is fully
   restored whenever the viewport leaves the mobile breakpoint. */
(function(){
  'use strict';
  const mq=window.matchMedia('(max-width:760px)');
  const body=document.body;
  if(!body || !body.classList.contains('fw-mobile-ux-v1')) return;

  const state=[];

  function directChildren(el){
    return Array.from(el.children).filter(n=>n.nodeType===1 && !n.classList.contains('fw-mobile-more-toggle'));
  }

  function hasDedicatedProgressiveControl(el){
    return el.matches('[data-fw-progressive-v137],[data-fw-progressive],[data-fw-load-label-v137]');
  }

  function sectionLabel(el){
    const section=el.closest('.business-section,.hub-section');
    const h=section && section.querySelector('h2,h3');
    return h ? h.textContent.trim() : 'this section';
  }

  function buildToggle(el,visibleCount){
    const items=directChildren(el);
    if(items.length<=visibleCount) return;
    const hidden=items.slice(visibleCount);
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='fw-mobile-more-toggle';
    btn.setAttribute('aria-expanded','false');
    btn.dataset.fwMoreCount=String(hidden.length);
    const label=sectionLabel(el);
    btn.setAttribute('aria-label','View more items in '+label);
    btn.innerHTML='<span>View more</span><span class="fw-mobile-more-chevron" aria-hidden="true">→</span>';
    hidden.forEach(item=>{
      item.dataset.fwMobileDensityHidden='true';
      item.hidden=true;
    });
    el.insertAdjacentElement('afterend',btn);
    const rec={el,items,hidden,btn,visibleCount,expanded:false};
    state.push(rec);
    btn.addEventListener('click',()=>{
      rec.expanded=!rec.expanded;
      hidden.forEach(item=>{
        item.hidden=!rec.expanded;
        if(rec.expanded) item.removeAttribute('data-fw-mobile-density-hidden');
        else item.dataset.fwMobileDensityHidden='true';
      });
      btn.setAttribute('aria-expanded',rec.expanded?'true':'false');
      btn.classList.toggle('is-open',rec.expanded);
      btn.querySelector('span').textContent=rec.expanded?'Show less':'View more';
      const arrow=btn.querySelector('.fw-mobile-more-chevron');
      if(arrow) arrow.textContent=rec.expanded?'↑':'→';
      btn.setAttribute('aria-label',rec.expanded?'Show fewer items in '+label:'View more items in '+label);
    });
  }

  function setup(){
    if(!mq.matches) return;
    body.classList.add('fw-mobile-ux-active');

    // Evidence/investigation lists: three strong choices first, depth on demand.
    document.querySelectorAll('.latest-investigation-grid').forEach(el=>{
      if(hasDedicatedProgressiveControl(el)) return;
      if(el.dataset.fwMobileDensityReady) return;
      const n=directChildren(el).length;
      if(n>4){
        el.dataset.fwMobileDensityReady='true';
        buildToggle(el,3);
      }
    });

    // Very long non-investigation navigation lists use four visible items.
    document.querySelectorAll('.tool-list:not(.latest-investigation-grid)').forEach(el=>{
      if(hasDedicatedProgressiveControl(el)) return;
      if(el.dataset.fwMobileDensityReady) return;
      const n=directChildren(el).length;
      if(n>6){
        el.dataset.fwMobileDensityReady='true';
        buildToggle(el,4);
      }
    });

    // Long topic grids on hub pages: keep four primary choices visible, then reveal depth.
    document.querySelectorAll('.territory-grid').forEach(el=>{
      if(hasDedicatedProgressiveControl(el)) return;
      if(el.dataset.fwMobileDensityReady) return;
      const n=directChildren(el).length;
      if(n>5){
        el.dataset.fwMobileDensityReady='true';
        buildToggle(el,4);
      }
    });

    // Men's Health has a seven-card topic grid; the shared rule above now handles it.
    if(body.classList.contains('fw-hub-mens-health')){
      document.querySelectorAll('.territory-grid').forEach(el=>{
        if(hasDedicatedProgressiveControl(el)) return;
        if(el.dataset.fwMobileDensityReady) return;
        const n=directChildren(el).length;
        if(n>6){
          el.dataset.fwMobileDensityReady='true';
          buildToggle(el,4);
        }
      });
    }
  }

  function teardown(){
    body.classList.remove('fw-mobile-ux-active');
    state.splice(0).forEach(rec=>{
      rec.items.forEach(item=>{
        item.hidden=false;
        item.removeAttribute('data-fw-mobile-density-hidden');
      });
      rec.el.removeAttribute('data-fw-mobile-density-ready');
      rec.btn.remove();
    });
  }

  function sync(){
    if(mq.matches){ if(!body.classList.contains('fw-mobile-ux-active')) setup(); }
    else teardown();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',sync,{once:true});
  else sync();
  if(mq.addEventListener) mq.addEventListener('change',sync); else mq.addListener(sync);
})();
