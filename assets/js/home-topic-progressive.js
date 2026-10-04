(function(){
  'use strict';
  function boot(){
    var grid=document.querySelector('[data-fw-home-topics]');
    if(!grid||grid.dataset.fwHomeTopicsReady==='1')return;
    var cards=Array.prototype.slice.call(grid.children).filter(function(el){return el.classList&&el.classList.contains('fw-topic-card');});
    if(cards.length<=3)return;
    grid.dataset.fwHomeTopicsReady='1';
    var expanded=false;
    var wrap=document.createElement('div');wrap.className='fw-home-topics-control';
    var btn=document.createElement('button');btn.type='button';btn.className='fw-home-topics-toggle';
    btn.setAttribute('aria-controls','topics');wrap.appendChild(btn);grid.insertAdjacentElement('afterend',wrap);
    function mobile(){return window.matchMedia('(max-width:760px)').matches;}
    function paint(){
      if(!mobile()){
        cards.forEach(function(c){c.hidden=false;c.removeAttribute('aria-hidden');});
        wrap.hidden=true;return;
      }
      wrap.hidden=false;
      cards.forEach(function(c,i){var hide=!expanded&&i>=3;c.hidden=hide;c.setAttribute('aria-hidden',hide?'true':'false');});
      btn.textContent=expanded?'SHOW LESS ↑':'LOAD MORE ↓';
      btn.setAttribute('aria-expanded',expanded?'true':'false');
    }
    btn.addEventListener('click',function(){expanded=!expanded;paint();if(!expanded)grid.scrollIntoView({behavior:'smooth',block:'start'});});
    var mq=window.matchMedia('(max-width:760px)');
    if(mq.addEventListener)mq.addEventListener('change',paint);else if(mq.addListener)mq.addListener(paint);
    paint();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
