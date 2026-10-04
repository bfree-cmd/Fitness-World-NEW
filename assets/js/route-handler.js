(function(){
  var product=document.body&&document.body.getAttribute('data-affiliate-product');
  var cfg=window.FW_AFFILIATE_OFFERS&&window.FW_AFFILIATE_OFFERS[product];
  var status=document.querySelector('[data-router-status]');
  if(!cfg||!cfg.url){if(status)status.textContent='Offer temporarily unavailable.';return;}
  try{
    var qs=new URLSearchParams(location.search);var u=new URL(cfg.url);
    var src=(qs.get('src')||'').trim();if(src)u.searchParams.set('aff_sub1',src.slice(0,100));
    var fbclid=qs.get('fbclid');if(fbclid)u.searchParams.set('fbclid',fbclid.slice(0,250));
    ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].forEach(function(k){var v=qs.get(k);if(v&&!u.searchParams.has(k))u.searchParams.set(k,v.slice(0,200));});
    var link=document.querySelector('[data-router-link]');if(link)link.href=u.toString();
    if(status)status.textContent='Opening the current offer…';
    setTimeout(function(){location.replace(u.toString());},120);
  }catch(e){if(status)status.textContent='Offer temporarily unavailable.';}
})();
