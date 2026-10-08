(function(){
  'use strict';
  var id='G-FXRMZYR0YY';
  window.dataLayer=window.dataLayer||[];
  window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};
  window.gtag('js',new Date());
  window.gtag('config',id);
  var loaded=false;
  function load(){
    if(loaded)return;
    loaded=true;
    var s=document.createElement('script');
    s.async=true;
    s.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(id);
    document.head.appendChild(s);
    cleanup();
  }
  function cleanup(){
    ['pointerdown','keydown','touchstart'].forEach(function(type){window.removeEventListener(type,load,true);});
  }
  ['pointerdown','keydown','touchstart'].forEach(function(type){window.addEventListener(type,load,{once:true,passive:true,capture:true});});
  window.addEventListener('load',function(){
    if('requestIdleCallback' in window) requestIdleCallback(load,{timeout:2500});
    else setTimeout(load,1800);
  },{once:true});
})();
