(function(){
  const bar=document.getElementById('nwStickyOffer');
  const hero=document.getElementById('nw-main-purchase-cta');
  const finalOffer=document.getElementById('nw-final-offer');
  const footer=document.querySelector('footer');
  if(!bar) return;
  let heroVisible=false, offerVisible=false, footerVisible=false;
  function update(){
    const scrolled=window.scrollY>Math.max(420,window.innerHeight*.55);
    const show=scrolled&&!heroVisible&&!offerVisible&&!footerVisible;
    bar.classList.toggle('is-visible',show);
    bar.setAttribute('aria-hidden',show?'false':'true');
  }
  if('IntersectionObserver' in window){
    const watch=(el,setter,threshold)=>{if(!el)return;new IntersectionObserver(e=>{setter(e[0].isIntersecting);update();},{threshold:threshold}).observe(el)};
    watch(hero,v=>heroVisible=v,.15);
    watch(finalOffer,v=>offerVisible=v,.08);
    watch(footer,v=>footerVisible=v,.01);
  }
  addEventListener('scroll',update,{passive:true});
  addEventListener('resize',update);
  update();
})();
