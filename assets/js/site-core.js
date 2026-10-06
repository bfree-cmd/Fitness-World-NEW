/* shared-utils.js */
(function(){
  'use strict';
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  window.FWUtils = Object.assign(window.FWUtils || {}, { esc, escapeHTML: esc });
})();
;
/* site-config.js */
window.FW_CONFIG = Object.freeze({
  ga4MeasurementId: "",
  metaPixelId: "",
  productionDomain: "",
  currency: "USD",
  encyclopediaPrice: 9.99
});
;
/* site-tracking.js */
(function(){
  const cfg=window.FW_CONFIG||{};
  const params=new URLSearchParams(location.search);
  const keys=['utm_source','utm_medium','utm_campaign','utm_content','utm_term'];
  const saved={};
  try{
    keys.forEach(k=>{
      const v=params.get(k);
      if(v) localStorage.setItem('fw_'+k,v.slice(0,300));
      saved[k]=localStorage.getItem('fw_'+k)||'';
    });
    if(!localStorage.getItem('fw_first_landing')) localStorage.setItem('fw_first_landing',location.href.slice(0,1000));
    if(!localStorage.getItem('fw_first_referrer') && document.referrer) localStorage.setItem('fw_first_referrer',document.referrer.slice(0,1000));
  }catch(e){}

  function initGA(){
    const id=String(cfg.ga4MeasurementId||'').trim(); if(!/^G-[A-Z0-9]+$/i.test(id)) return;
    const s=document.createElement('script'); s.async=true; s.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(id); document.head.appendChild(s);
    window.dataLayer=window.dataLayer||[]; window.gtag=function(){dataLayer.push(arguments)}; gtag('js',new Date()); gtag('config',id,{send_page_view:true});
  }
  function initMeta(){
    const id=String(cfg.metaPixelId||'').trim(); if(!/^\d{5,}$/.test(id)) return;
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init',id); fbq('track','PageView');
  }
  function track(name,params={}){
    const payload=Object.assign({page_path:location.pathname},params);
    if(typeof window.gtag==='function') gtag('event',name,payload);
    if(typeof window.fbq==='function'){
      const map={free_guide_lead:'Lead',encyclopedia_view:'ViewContent',encyclopedia_checkout_start:'InitiateCheckout',encyclopedia_purchase:'Purchase'};
      if(map[name]) fbq('track',map[name], name==='encyclopedia_purchase'?{value:Number(payload.value||cfg.encyclopediaPrice||9.99),currency:payload.currency||'USD'}:{} , payload.event_id?{eventID:payload.event_id}:undefined);
    }
  }
  function attribution(){
    const out={}; keys.forEach(k=>out[k]=saved[k]||'');
    try{out.first_landing=localStorage.getItem('fw_first_landing')||'';out.first_referrer=localStorage.getItem('fw_first_referrer')||'';}catch(e){}
    return out;
  }
  document.addEventListener('click',e=>{const a=e.target.closest?.('a');if(!a)return;const href=a.getAttribute('href')||'';if(/fitness-world-free-guide\.pdf/i.test(href))track('free_guide_download',{link_url:href});if(a.closest('#nw-final-offer')||a.href?.includes('#nw-checkout'))track('encyclopedia_cta_click',{link_url:href});});
  initGA(); initMeta();
  window.FWTracking={track,attribution};
  if(document.body.classList.contains('natural-wellness-page')) track('encyclopedia_view',{content_name:'Natural Wellness Encyclopedia'});
})();


// FW contextual encyclopedia CTA tracking 2026-09-01
 document.addEventListener('click',function(e){
   var a=e.target.closest && e.target.closest('.fw-encyclopedia-cta a');
   if(!a)return;
   var box=a.closest('.fw-encyclopedia-cta');
   var placement=box && box.getAttribute('data-fw-cta-placement') || 'contextual';
   if(window.FWTracking && typeof window.FWTracking.track==='function') window.FWTracking.track('encyclopedia_cta_click',{placement:placement,link_url:a.getAttribute('href')||''});
 });


// FITNESS WORLD V12 — growth-foundation analytics
(function(){
  if(window.__FW_V12_ANALYTICS__) return;
  window.__FW_V12_ANALYTICS__=true;
  const track=(name,params={})=>{
    if(window.FWTracking&&typeof window.FWTracking.track==='function') window.FWTracking.track(name,params);
    else if(typeof window.gtag==='function') window.gtag('event',name,Object.assign({page_path:location.pathname},params));
  };
  const clean=(s,n=120)=>String(s||'').replace(/\s+/g,' ').trim().slice(0,n);
  const pathFor=(a)=>{try{return new URL(a.href,location.href).pathname}catch(_){return ''}};
  const guideRoots=new Set(['/articles/','/research/','/what-actually-works/','/stay-strong/','/choose-smarter/','/live-healthier/','/compare/','/mens-health/','/understand-your-data/','/worth-it/','/glp1-nutrition-muscle/','/supplement-evidence/','/evidence-index/','/evidence-projects/','/evidence-standards/','/check-a-health-claim/','/screenshot-a-claim/','/health-hype-meter/','/evidence-iq/','/free-guide/','/natural/','/tools/']);

  document.addEventListener('click',e=>{
    const a=e.target.closest?.('a');
    if(!a) return;
    const dest=pathFor(a);
    const href=a.getAttribute('href')||'';

    // General CTA coverage only for CTAs not already covered by the existing
    // free-guide / encyclopedia / checkout / affiliate event families.
    if(a.matches('.btn,.btn-main,.btn-dark,.navcta') &&
       !/free-guide/i.test(href) && !/^\/natural\//.test(dest) &&
       !/checkout/i.test(href) && !a.classList.contains('fw-affiliate-link')){
      track('cta_click',{cta_text:clean(a.textContent,80),destination:dest||href});
    }

    if(dest && dest!==location.pathname && [...guideRoots].some(r=>dest===r || dest.startsWith(r==='/'?'/':r))){
      let navigation_type='guide';
      if(/^\/(evidence-|check-a-health-claim|screenshot-a-claim|supplement-evidence|health-hype-meter|evidence-iq)/.test(dest)) navigation_type='evidence';
      else if(/^\/tools\//.test(dest) || ['/compare/','/worth-it/','/understand-your-data/'].includes(dest)) navigation_type='tool_or_decision';
      track('internal_guide_navigation',{
        destination:dest,
        navigation_type,
        link_text:clean(a.textContent,100),
        placement:a.closest('footer')?'footer':a.closest('.article-sidebar-fw,.business-sidebar')?'sidebar':a.closest('.related-section')?'related':a.closest('.article-prose')?'article_body':'page'
      });
    }
  },{passive:true});

  // Article engagement: one event family, with milestones as parameters.
  if(document.documentElement.classList.contains('article-page')){
    const fired=new Set();
    const onScroll=()=>{
      const doc=document.documentElement;
      const max=Math.max(1,doc.scrollHeight-innerHeight);
      const pct=Math.round((scrollY/max)*100);
      [50,90].forEach(m=>{
        if(pct>=m&&!fired.has(m)){
          fired.add(m);
          track('article_engagement',{engagement_milestone:m,article_path:location.pathname});
        }
      });
      if(fired.size===2) removeEventListener('scroll',onScroll);
    };
    addEventListener('scroll',onScroll,{passive:true});
  }

  // Tool usage: records an interaction without duplicating the tool's own result events.
  const toolPath=/^(\/tools\/|\/check-a-health-claim\/|\/screenshot-a-claim\/|\/compare\/|\/worth-it\/|\/understand-your-data\/)/.test(location.pathname);
  if(toolPath){
    let started=false;
    const mark=e=>{
      if(started) return;
      const control=e.target.closest?.('button,input,select,textarea');
      if(!control) return;
      started=true;
      track('tool_interaction',{tool_path:location.pathname,control:clean(control.name||control.id||control.textContent||control.type,80)});
    };
    document.addEventListener('click',mark,{passive:true});
    document.addEventListener('change',mark,{passive:true});
  }
})();
;
/* micro-features.js */

document.addEventListener("DOMContentLoaded", function () {
  /* Back to top: site-wide, appears only after meaningful scroll */
  const backTop = document.createElement("button");
  backTop.type = "button";
  backTop.className = "back-to-top";
  backTop.setAttribute("aria-label", "Back to top");
  backTop.setAttribute("title", "Back to top");
  backTop.innerHTML = "↑";
  document.body.appendChild(backTop);

  const updateBackTop = () => {
    backTop.classList.toggle("is-visible", window.scrollY > 650);
  };
  window.addEventListener("scroll", updateBackTop, { passive: true });
  updateBackTop();
  backTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  /* Article-only features */
  const article = document.querySelector(".article-prose");
  if (!article) return;

  /* Reading time */
  const articleText = article.innerText || "";
  const words = articleText.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 220));
  const articleHeader = document.querySelector(".article-header .article-shell");
  const existingReadTime = articleHeader
    ? Array.from(articleHeader.querySelectorAll("*")).find(function (el) {
        return /^\s*\d+\s*min\s*read\s*$/i.test(el.textContent || "");
      })
    : null;
  if (articleHeader && !existingReadTime && !articleHeader.querySelector(".reading-time")) {
    const meta = document.createElement("div");
    meta.className = "reading-time";
    meta.setAttribute("aria-label", "Estimated reading time");
    meta.textContent = minutes + " min read";
    const h1 = articleHeader.querySelector("h1");
    if (h1) h1.insertAdjacentElement("afterend", meta);
    else articleHeader.appendChild(meta);
  }

  /* Reading progress */
  const progress = document.createElement("div");
  progress.className = "reading-progress";
  progress.setAttribute("aria-hidden", "true");
  progress.innerHTML = '<span class="reading-progress-bar"></span>';
  document.body.appendChild(progress);
  const bar = progress.querySelector(".reading-progress-bar");

  const updateProgress = () => {
    const rect = article.getBoundingClientRect();
    const articleTop = window.scrollY + rect.top;
    const articleHeight = article.offsetHeight;
    const viewport = window.innerHeight;
    const start = articleTop - 90;
    const end = articleTop + articleHeight - viewport;
    const range = Math.max(1, end - start);
    const pct = Math.min(1, Math.max(0, (window.scrollY - start) / range));
    bar.style.transform = "scaleX(" + pct + ")";
  };
  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress);
  updateProgress();
});


/* footer-accordion.js */
document.addEventListener('DOMContentLoaded',()=>{document.querySelectorAll('[data-footer-group]').forEach(group=>{const btn=group.querySelector('.footer-accordion-toggle');if(!btn)return;btn.addEventListener('click',()=>{if(!window.matchMedia('(max-width:760px)').matches)return;const open=group.classList.toggle('is-open');btn.setAttribute('aria-expanded',open?'true':'false');});});});
;
/* affiliate-tracking.js */
document.addEventListener('click',function(e){var a=e.target.closest('.fw-affiliate-link');if(!a)return;var d={event:'affiliate_click',product:a.dataset.affiliate||'',network:a.dataset.network||'',article:a.dataset.article||'',placement:a.dataset.placement||''};if(typeof window.gtag==='function')window.gtag('event','affiliate_click',d);});




/* FITNESS WORLD V189 — shared brand normalization */
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.brandtagline').forEach(function (el) {
    el.textContent = 'WHAT REALLY WORKS.';
  });
  document.querySelectorAll('a.navcta[href*="/free-guide/"]').forEach(function (el) {
    el.textContent = 'GET FREE PREVIEW';
    el.setAttribute('aria-label', 'Get the free preview');
  });
});
