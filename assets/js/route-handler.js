(function(){
  var product=document.body&&document.body.getAttribute('data-affiliate-product');
  var cfg=window.FW_AFFILIATE_OFFERS&&window.FW_AFFILIATE_OFFERS[product];
  var status=document.querySelector('[data-router-status]');
  if(!cfg||!cfg.url){if(status)status.textContent='Offer temporarily unavailable.';return;}
  try{
    var qs=new URLSearchParams(location.search);
    var u=new URL(cfg.url);
    var src=(qs.get('src')||'').trim();
    if(src)u.searchParams.set('aff_sub1',src.slice(0,100));
    var fbclid=qs.get('fbclid');
    if(fbclid)u.searchParams.set('fbclid',fbclid.slice(0,250));
    ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].forEach(function(k){
      var v=qs.get(k);
      if(v&&!u.searchParams.has(k))u.searchParams.set(k,v.slice(0,200));
    });
    var link=document.querySelector('[data-router-link]');
    if(link)link.href=u.toString();
    if(status)status.textContent='Opening the current offer…';

    var names={
      spartamax:'SpartaMax',
      nitricboost:'Nitric Boost Ultra',
      prostavive:'ProstaVive',
      prodentim:'ProDentim'
    };
    var ref=document.referrer||'';
    var sourcePage='';
    try{sourcePage=ref?new URL(ref).pathname:'';}catch(_){}
    var ua=navigator.userAgent||'';
    var device=/ipad|tablet/i.test(ua)||(navigator.maxTouchPoints>1&&/macintosh/i.test(ua))
      ?'Tablet'
      :(/mobi|android|iphone|ipod/i.test(ua)||innerWidth<=760?'Mobile':'Desktop');
    var visitor='',session='';
    try{visitor=localStorage.getItem('fw_visitor_id')||'';}catch(_){}
    try{session=sessionStorage.getItem('fw_session_id')||'';}catch(_){}

    var payload={
      event_type:'affiliate_click',
      product_offer:names[product]||product||'Affiliate Offer',
      source_page:sourcePage||('/go/'+product+'/'),
      source_form:src||'Affiliate Router',
      referrer_url:ref,
      device:device,
      capture_source:'Website',
      visitor_session_id:(visitor||session)?('v:'+visitor+'|s:'+session):'',
      notes:'Network: ClickBank | Destination: '+u.toString()
    };
    ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].forEach(function(k){
      var v=qs.get(k);
      if(!v){try{v=localStorage.getItem('fw_'+k)||'';}catch(_){}}
      if(v)payload[k]=String(v).slice(0,300);
    });

    var done=false;
    function go(){if(done)return;done=true;location.replace(u.toString());}

    fetch('/.netlify/functions/track-event',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload),
      credentials:'same-origin',
      keepalive:true,
      cache:'no-store'
    }).catch(function(){}).finally(go);

    setTimeout(go,350);
  }catch(e){
    if(status)status.textContent='Offer temporarily unavailable.';
  }
})();