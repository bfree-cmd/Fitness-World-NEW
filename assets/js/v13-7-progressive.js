/* Fitness World V13.7 — MUST-PASS progressive loading for Choose Smarter + What Actually Works */
(function(){
  'use strict';
  function mobile(){return window.matchMedia('(max-width:760px)').matches;}
  function directCards(grid){return Array.prototype.slice.call(grid.children).filter(function(el){return /^(A|ARTICLE|DIV)$/.test(el.tagName);});}
  function init(grid){
    if(grid.dataset.fwV137Ready==='1') return;
    var cards=directCards(grid); if(cards.length<=6) return;
    grid.dataset.fwV137Ready='1';
    cards.forEach(function(c){c.classList.remove('fw-v137-seed-hidden','fw-v137-mobile-seed-hidden');});
    var visible=mobile()?4:6;
    var desktopStep=6, mobileStep=4;
    function paint(){
      cards.forEach(function(c,i){var hide=i>=visible;c.hidden=hide;if(hide){c.style.setProperty('display','none','important');}else{c.style.removeProperty('display');}c.setAttribute('aria-hidden',hide?'true':'false');});
    }
    paint();
    var old=grid.nextElementSibling;
    if(old&&old.classList.contains('fw-v137-progressive-control')) old.remove();
    var wrap=document.createElement('div');wrap.className='fw-v137-progressive-control';
    var btn=document.createElement('button');btn.type='button';btn.className='btn btn-secondary fw-progressive-load';
    btn.textContent=grid.dataset.fwLoadLabelV137||'LOAD MORE →';btn.setAttribute('aria-expanded','false');
    wrap.appendChild(btn);grid.insertAdjacentElement('afterend',wrap);
    btn.addEventListener('click',function(){
      visible=Math.min(visible+(mobile()?mobileStep:desktopStep),cards.length);paint();btn.setAttribute('aria-expanded','true');
      if(visible>=cards.length) wrap.remove();
    });
  }
  function boot(){document.querySelectorAll('[data-fw-progressive-v137]').forEach(init);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
