/* Fitness World V15.16.54 article runtime bundle — generated; edit component sources, not this file. */

/* --- article-progress.js --- */
(() => {
  'use strict';
  const body = document.body;
  if (!body || !body.classList.contains('fw-mobile-article-layout')) return;
  const bar = document.querySelector('.fw-reading-progress__bar');
  const article = document.querySelector('article.article-prose');
  if (!bar || !article) return;
  let ticking = false;
  const update = () => {
    const rect = article.getBoundingClientRect();
    const start = window.scrollY + rect.top;
    const end = start + article.offsetHeight - window.innerHeight;
    const span = Math.max(1, end - start);
    const value = Math.max(0, Math.min(1, (window.scrollY - start) / span));
    bar.style.width = `${(value * 100).toFixed(2)}%`;
    ticking = false;
  };
  const requestUpdate = () => {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  };
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate, { passive: true });
  update();
})();

/* --- conversion-features.js --- */
(function(){
  const event=(name,params={})=>{ if(typeof window.gtag==='function') window.gtag('event',name,params); };

  // Goal quiz
  const result=document.querySelector('.quiz-result');
  const routes={
    fitness:{title:'Start with movement.',text:'Explore practical fitness articles and simple ways to build more activity into your day.',href:'/stay-strong/',cta:'Explore strength & movement →'},
    nutrition:{title:'Start with everyday nutrition.',text:'Build around simple food and routine choices you can repeat consistently.',href:'/articles/',cta:'Explore nutrition articles →'},
    recovery:{title:'Start with recovery.',text:'Explore sleep, rest and recovery habits that support consistency.',href:'/natural-wellness/',cta:'Explore recovery guides →'},
    natural:{title:'Start with natural wellness.',text:'Explore beginner-friendly natural wellness information with practical context.',href:'/natural-wellness/',cta:'Explore natural wellness →'}
  };
  document.querySelectorAll('[data-goal]').forEach(btn=>btn.addEventListener('click',()=>{
    const r=routes[btn.dataset.goal]; if(!r||!result)return;
    result.innerHTML=`<strong>${r.title}</strong><p>${r.text}</p><a href="${r.href}">${r.cta}</a>`;
    result.classList.add('show'); event('wellness_goal_selected',{goal:btn.dataset.goal});
  }));

  // Mobile free-guide CTA: create it at runtime so it cannot silently disappear when templates change.
  const path=location.pathname.replace(/\/+$/,'/')||'/';
  const commercialFunnel=!!document.querySelector('a[href^="/go/"], [data-fw-commercial-funnel]');
  const stickyExcluded=/^\/(free-guide|natural|checkout|thank-you|contact\/success)\//.test(path)||commercialFunnel;
  let sticky=document.querySelector('.mobile-guide-sticky');
  if(!sticky && !stickyExcluded){
    sticky=document.createElement('aside');
    sticky.className='mobile-guide-sticky';
    sticky.setAttribute('aria-label','Free Fitness World guide');
    sticky.innerHTML='<span><strong>Free wellness guide</strong><small>15 practical habits worth knowing</small></span><a class="btn btn-main" href="/free-guide/?utm_source=mobile_sticky&utm_medium=onsite&utm_campaign=free_guide">GET FREE GUIDE</a>';
    document.body.appendChild(sticky);
  }
  if(sticky){
    const footer=document.querySelector('footer');
    let nearFooter=false;
    const paint=()=>sticky.classList.toggle('show',window.scrollY>520&&!nearFooter);
    if(footer && 'IntersectionObserver' in window){
      new IntersectionObserver(entries=>{nearFooter=entries.some(e=>e.isIntersecting);paint();},{rootMargin:'120px 0px 0px',threshold:.01}).observe(footer);
    }
    window.addEventListener('scroll',paint,{passive:true}); paint();
    sticky.querySelector('a')?.addEventListener('click',()=>event('free_guide_sticky_click',{location:path}));
  }

  // Capture funnel hooks
  document.querySelectorAll('a[href*="free-guide"],a[href="#free-guide"]').forEach(a=>a.addEventListener('click',()=>event('free_guide_cta_click',{location:location.pathname})));
  document.querySelectorAll('form').forEach(f=>{
    if(f.closest('#free-guide')||f.classList.contains('home-free-form')||f.closest('.guide-email-card')) f.addEventListener('submit',()=>event('free_guide_signup_submit'));
  });
  document.querySelectorAll('a[href*="/natural/"]').forEach(a=>a.addEventListener('click',()=>event('encyclopedia_click',{location:location.pathname})));
  document.querySelectorAll('a[href*="checkout"]').forEach(a=>a.addEventListener('click',()=>event('checkout_start',{location:location.pathname})));
  document.querySelectorAll('[data-share]').forEach(b=>b.addEventListener('click',()=>event('article_share',{method:b.dataset.share})));

  try{
    const visits=Number(localStorage.getItem('fwVisits')||0)+1; localStorage.setItem('fwVisits',String(visits));
    if(visits>1&&!localStorage.getItem('fwGuideRequested')) document.body.classList.add('fw-returning');
  }catch(e){}
})();

/* --- article-share.js --- */
/* Fitness World — shared article share actions. */
(() => {
  'use strict';
  const rows=[...document.querySelectorAll('.share-row')];
  if(!rows.length) return;

  const articleUrl=()=>document.querySelector('link[rel="canonical"]')?.href || location.href;
  const articleTitle=()=>document.querySelector('h1')?.textContent?.trim() || document.title;
  const open=(url)=>window.open(url,'_blank','noopener,noreferrer,width=760,height=640');
  const encoded=(v)=>encodeURIComponent(v);

  async function copy(row){
    const status=row.querySelector('.copy-status');
    const url=articleUrl();
    let ok=false;
    try{
      await navigator.clipboard.writeText(url);
      ok=true;
    }catch(_){
      try{
        const ta=document.createElement('textarea');
        ta.value=url; ta.setAttribute('readonly','');
        ta.style.position='fixed'; ta.style.opacity='0'; ta.style.pointerEvents='none';
        document.body.appendChild(ta); ta.select(); ok=document.execCommand('copy'); ta.remove();
      }catch(__){}
    }
    if(status){
      status.textContent=ok?'Copied!':'Copy unavailable';
      clearTimeout(status._fwTimer);
      status._fwTimer=setTimeout(()=>{status.textContent='';},1600);
    }
  }

  rows.forEach(row=>row.addEventListener('click',e=>{
    const btn=e.target.closest('[data-share]');
    if(!btn || !row.contains(btn)) return;
    const method=btn.dataset.share;
    const url=articleUrl();
    const title=articleTitle();
    if(method==='copy'){ copy(row); return; }
    if(method==='facebook') open('https://www.facebook.com/sharer/sharer.php?u='+encoded(url));
    else if(method==='whatsapp') open('https://wa.me/?text='+encoded(title+' '+url));
    else if(method==='pinterest') open('https://www.pinterest.com/pin/create/button/?url='+encoded(url)+'&description='+encoded(title));
    else if(method==='x') open('https://x.com/intent/post?text='+encoded(title)+'&url='+encoded(url));
  }));


  // On article pages, the fixed free-guide utility must never cover the
  // Natural Wellness Encyclopedia card. Hide it while that card is in view.
  const sticky=document.querySelector('.mobile-guide-sticky');
  const encyclopedia=[...document.querySelectorAll('.fw-encyclopedia-cta')];
  if(sticky && encyclopedia.length && 'IntersectionObserver' in window){
    const visibleCards=new Set();
    const io=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting) visibleCards.add(entry.target);
        else visibleCards.delete(entry.target);
      });
      sticky.classList.toggle('fw-sticky-safe-hide',visibleCards.size>0);
    },{threshold:0.01,rootMargin:'0px 0px 72px 0px'});
    encyclopedia.forEach(el=>io.observe(el));
  }
})();

/* --- article-print.js --- */
document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('[data-fw-print-article]').forEach(button=>{
    button.addEventListener('click',()=>window.print());
  });
});

/* --- article-email-capture.js --- */
(()=>{
  let modal, returnFocus;
  function closeModal(){
    if(!modal)return;
    modal.hidden=true; modal.classList.remove('open'); modal.setAttribute('aria-hidden','true');
    document.body.classList.remove('fw-modal-open');
    returnFocus?.focus();
  }
  function openModal(button){
    if(!modal){
      const template=document.createElement('template');
      template.innerHTML="<div aria-hidden=\"true\" aria-labelledby=\"articleGuideOfferTitle\" aria-modal=\"true\" class=\"fw-offer-modal\" hidden=\"\" id=\"article-guide-success\" role=\"dialog\">\n<div class=\"fw-offer-card\" role=\"document\">\n<button aria-label=\"Close offer\" class=\"fw-offer-close\" type=\"button\">×</button>\n<div class=\"fw-offer-confirm\"><span class=\"fw-offer-check\">✓</span><span>Your free guide is ready</span></div>\n<h2 id=\"articleGuideOfferTitle\">Ready to go deeper?</h2>\n<div class=\"fw-offer-grid\">\n<img alt=\"Natural Wellness Encyclopedia cover\" class=\"fw-offer-cover\" decoding=\"async\" height=\"604\" loading=\"lazy\" src=\"/assets/images/natural-wellness-cover.webp\" width=\"436\"/>\n<div class=\"fw-offer-copy\">\n<h3>The Natural Wellness Encyclopedia</h3>\n<p>Go beyond the starter guide with a deeper, evidence-aware reference for herbs, teas, foods and everyday wellness.</p>\n<ul class=\"fw-offer-points\"><li>70+ pages of practical wellness information</li><li>Herbs, teas, recipes &amp; healthy living</li><li>Clear safety and everyday-use context</li></ul>\n</div>\n</div>\n<p class=\"fw-offer-choice-note\">Open your free guide now. We’ll also email a copy when delivery is available.</p><a class=\"btn btn-secondary fw-offer-cta fw-offer-guide-link\" href=\"/fitness-world-free-guide.pdf\" rel=\"noopener\" target=\"_blank\">OPEN YOUR FREE GUIDE</a><a class=\"btn btn-main fw-offer-cta\" href=\"/natural/?utm_source=article_mid_content_success&amp;utm_medium=post_email_modal&amp;utm_campaign=free_to_encyclopedia\" id=\"article-guide-encyclopedia-cta\">EXPLORE THE ENCYCLOPEDIA</a>\n<p class=\"fw-offer-meta\"><strong>$9.99</strong> · One-time digital edition · No subscription</p>\n</div>\n</div>";
      modal=template.content.firstElementChild;
      document.body.appendChild(modal);
      modal.querySelector('.fw-offer-close').addEventListener('click',closeModal);
      modal.addEventListener('click',e=>{if(e.target===modal)closeModal();});
      document.addEventListener('keydown',e=>{
        if(modal.hidden)return;
        if(e.key==='Escape'){closeModal();return;}
        if(e.key==='Tab'){
          const controls=[...modal.querySelectorAll('button,a[href]')];
          const first=controls[0],last=controls[controls.length-1];
          if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
          else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
        }
      });
    }
    returnFocus=button;
    modal.hidden=false; modal.classList.add('open'); modal.setAttribute('aria-hidden','false');
    document.body.classList.add('fw-modal-open');
    modal.querySelector('.fw-offer-close').focus();
  }
  function init(form){
    if(form.dataset.fwReady==='1')return; form.dataset.fwReady='1';
    form.addEventListener('submit',async e=>{
      e.preventDefault();
      const input=form.querySelector('input[type="email"]');
      const btn=form.querySelector('button[type="submit"]');
      const status=form.querySelector('.fw-article-email-status');
      const email=(input?.value||'').trim().toLowerCase();
      if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)){input?.focus();return;}
      if(form.dataset.fwSubmitting==='1')return;
      if(form.dataset.fwCaptured===email){openModal(btn);return;}
      form.dataset.fwSubmitting='1';
      if(btn){btn.disabled=true;btn.textContent='GUIDE READY ✓';}
      if(status){status.textContent='';status.classList.remove('is-error');}
      openModal(btn);
      const eventId='fw_article_guide_'+Date.now()+'_'+Math.random().toString(36).slice(2,9);
      // Preserve the analytics event without the legacy wrapper copying a stale guide email.
      if(typeof window.gtag==='function')window.gtag('event','free_guide_lead',{event_id:eventId,location:'article_mid_content'});
      const sender=window.FWEventTracking?.send;
      const capture=typeof sender==='function'?sender('free_pdf_signup',{
        email,event_id:eventId,
        product_offer:'15 Natural Wellness Habits Worth Knowing',
        source_form:'Article Mid-Content Guide',
        marketing_consent:form.querySelector('input[name="marketing_consent"]:checked')?'Yes':'No',
        capture_source:'Website'
      }):Promise.resolve({success:false});
      // Use the existing Resend function in the background; it cannot block the dialog.
      fetch('/.netlify/functions/send-free-guide',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})})
        .then(r=>r.json()).then(result=>{if(result.sent!==true)console.warn('Fitness World guide email delivery unavailable');})
        .catch(()=>console.warn('Fitness World guide email delivery unavailable'));
      const result=await capture.catch(()=>({success:false}));
      form.dataset.fwSubmitting='0';
      if(result.success===true){
        form.dataset.fwCaptured=email;
        if(btn)btn.disabled=false;
      }else{
        if(btn){btn.disabled=false;btn.textContent='TRY AGAIN';}
        if(status){status.textContent='Email could not be saved. Please try again.';status.classList.add('is-error');}
      }
    });
  }
  document.addEventListener('DOMContentLoaded',()=>document.querySelectorAll('.fw-article-email-form').forEach(init));
})();

/* --- evidence-engine.js --- */
(function(){
  const state={data:null,promise:null};
  const stop=new Set(['does','do','is','are','the','a','an','for','to','of','and','or','your','you','actually','what','which','can','it','with','after','before','how','much','need','should','while','taking','on','in','vs','worth','i','my','me']);
  function normalize(s){return String(s||'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s-]/g,' ').replace(/-/g,' ').replace(/\s+/g,' ').trim()}
  function tokens(s){return normalize(s).split(' ').filter(x=>x&& !stop.has(x))}
  function load(){if(state.data)return Promise.resolve(state.data);if(state.promise)return state.promise;state.promise=fetch('/assets/data/evidence-engine.json',{credentials:'same-origin'}).then(r=>{if(!r.ok)throw new Error('Evidence data unavailable');return r.json()}).then(d=>state.data=d);return state.promise}
  function scoreEntry(q,e){
    const nq=normalize(q); if(!nq)return 0;
    const qTokens=tokens(q); let score=0;
    const claim=normalize(e.claim), aliases=(e.aliases||[]).map(normalize), key=(e.keywords||[]).map(normalize);
    if(claim===nq) score+=200;
    if(aliases.includes(nq)) score+=180;
    if(claim.includes(nq)||nq.includes(claim)) score+=70;
    aliases.forEach(a=>{if(a.includes(nq)||nq.includes(a))score+=45});
    const cTokens=new Set(tokens(e.claim+' '+aliases.join(' ')+' '+key.join(' ')));
    let matched=0; qTokens.forEach(t=>{if(cTokens.has(t)){matched++;score+=14} else {for(const c of cTokens){if(t.length>=5&&c.length>=5&&(t.startsWith(c)||c.startsWith(t))){score+=5;break}}}});
    if(qTokens.length&&matched===qTokens.length)score+=35;
    if(qTokens.length>=2&&matched/qTokens.length>=.66)score+=20;
    return score;
  }
  async function search(q,opts={}){const d=await load();let rows=d.reviewed_claims.map(e=>({entry:e,score:scoreEntry(q,e)})).sort((a,b)=>b.score-a.score);if(opts.buyOnly)rows=rows.filter(r=>r.entry.buy);const best=rows[0];const threshold=tokens(q).length<=1?34:42;return {query:q,best:best&&best.score>=threshold?best:null,candidates:rows.slice(0,5),threshold}}
  function byId(id){return load().then(d=>d.reviewed_claims.find(e=>e.id===id)||null)}
  function track(name,params){try{window.FWTracking?.track(name,params||{})}catch(e){}}
  window.FWEvidenceEngine={load,search,byId,normalize,tokens,track};
})();

/* --- evidence-share.js --- */
(function(){
  
  function ensurePanel(){let p=document.getElementById('fw-share-panel');if(p)return p;p=document.createElement('div');p.id='fw-share-panel';p.className='fw-share-panel';p.innerHTML='<div class="fw-share-dialog" role="dialog" aria-modal="true" aria-labelledby="fw-share-title"><div class="fw-share-dialog-head"><h3 id="fw-share-title">Share this verdict</h3><button class="fw-share-close" type="button" aria-label="Close share panel">×</button></div><div id="fw-share-preview" class="fw-share-preview"></div><div class="fw-share-actions"><button type="button" data-fw-share="native">Share</button><button type="button" data-fw-share="copy">Copy link</button><button type="button" data-fw-share="download">Download card</button></div><p class="fw-tool-help" id="fw-share-status" aria-live="polite"></p></div>';document.body.appendChild(p);p.querySelector('.fw-share-close').onclick=()=>close();p.addEventListener('click',e=>{if(e.target===p)close()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&p.classList.contains('is-open'))close()});return p}
  let current=null;
  let lastFocus=null;
  function short(s,n=150){s=String(s||'');return s.length>n?s.slice(0,n-1).replace(/\s+\S*$/,'')+'…':s}
  function open(entry){lastFocus=document.activeElement;current=entry;const p=ensurePanel(),pre=p.querySelector('#fw-share-preview');pre.innerHTML='<div><div class="fw-sp-brand">FITNESS WORLD</div><div class="fw-sp-kicker">CLAIM CHECK</div><h4>'+window.FWUtils.escapeHTML(entry.claim)+'</h4><div class="fw-sp-evidence">EVIDENCE · '+window.FWUtils.escapeHTML(entry.evidence)+'</div><div class="fw-sp-verdict">'+window.FWUtils.escapeHTML(short(entry.verdict,110))+'</div></div><div class="fw-sp-take">'+window.FWUtils.escapeHTML(short(entry.takeaway||entry.supported,170))+'<br><br>What the evidence actually says.</div>';p.classList.add('is-open');p.querySelector('#fw-share-status').textContent='';p.querySelector('.fw-share-close').focus();window.FWEvidenceEngine?.track('share_verdict',{claim_id:entry.id,category:entry.category})}
  function close(){document.getElementById('fw-share-panel')?.classList.remove('is-open');if(lastFocus&&typeof lastFocus.focus==='function'){try{lastFocus.focus()}catch(_){}}lastFocus=null}
  async function copyLink(){const url=new URL(current?.url||location.pathname,location.origin).href;try{await navigator.clipboard.writeText(url);status('Link copied.');window.FWEvidenceEngine?.track('verdict_copy_link',{claim_id:current.id})}catch(e){status('Copy was not available in this browser.') }}
  async function nativeShare(){const url=new URL(current?.url||location.pathname,location.origin).href;const data={title:current.claim,text:'Fitness World verdict: '+short(current.verdict,130),url};if(navigator.share){try{await navigator.share(data);return}catch(e){if(e.name==='AbortError')return}}await copyLink()}
  function wrapText(ctx,text,x,y,maxWidth,lineHeight,maxLines){const words=String(text||'').split(/\s+/);let line='',lines=[];for(const w of words){const test=line?line+' '+w:w;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=w}else line=test}if(line)lines.push(line);if(lines.length>maxLines){lines=lines.slice(0,maxLines);lines[maxLines-1]=lines[maxLines-1].replace(/[.,;:]?$/,'')+'…'}lines.forEach((l,i)=>ctx.fillText(l,x,y+i*lineHeight));return y+lines.length*lineHeight}
  function download(){if(!current)return;const c=document.createElement('canvas');c.width=1080;c.height=1350;const x=c.getContext('2d');x.fillStyle='#103c2e';x.fillRect(0,0,c.width,c.height);x.fillStyle='#ffffff';x.font='800 38px Arial, sans-serif';x.fillText('FITNESS WORLD',78,92);x.fillStyle='#cfe8dd';x.font='800 28px Arial, sans-serif';x.fillText('CLAIM CHECK',78,150);x.fillStyle='#ffffff';x.font='800 66px Arial, sans-serif';let y=wrapText(x,current.claim.toUpperCase(),78,255,920,78,5);y+=44;x.fillStyle='#d8eee5';x.font='800 30px Arial, sans-serif';x.fillText('EVIDENCE · '+String(current.evidence||'REVIEWED').toUpperCase(),78,y);y+=82;x.fillStyle='#ffffff';x.font='800 34px Arial, sans-serif';x.fillText('FITNESS WORLD VERDICT',78,y);y+=64;x.font='800 48px Arial, sans-serif';y=wrapText(x,current.verdict,78,y,920,60,5);y+=42;x.fillStyle='#e7f2ed';x.font='400 31px Arial, sans-serif';wrapText(x,current.takeaway||current.supported,78,y,920,45,5);x.fillStyle='#cfe8dd';x.font='700 26px Arial, sans-serif';x.fillText('What the evidence actually says.',78,1260);const a=document.createElement('a');a.download='fitness-world-'+current.id+'-verdict.png';a.href=c.toDataURL('image/png');a.click();status('Verdict card downloaded.');window.FWEvidenceEngine?.track('verdict_download',{claim_id:current.id})}
  function status(t){const el=document.getElementById('fw-share-status');if(el)el.textContent=t}
  document.addEventListener('click',e=>{const openBtn=e.target.closest('[data-fw-share-id]');if(openBtn){e.preventDefault();window.FWEvidenceEngine?.byId(openBtn.dataset.fwShareId).then(entry=>entry&&open(entry));return}const b=e.target.closest('[data-fw-share]');if(!b)return;const a=b.dataset.fwShare;if(a==='native')nativeShare();if(a==='copy')copyLink();if(a==='download')download()});
  window.FWShareVerdict={open,close};
})();

/* --- evidence-card-actions.js --- */
(function(){
  
  function init(){
    const pathSlug=location.pathname.match(/^\/articles\/([^/]+)\//)?.[1]; const canonical=document.querySelector('link[rel="canonical"]')?.href||''; const canonicalSlug=canonical.match(/\/articles\/([^/]+)\//)?.[1]; const slug=pathSlug||canonicalSlug||document.body?.dataset?.articleSlug;
    if(!slug)return;
    document.querySelectorAll('.fw-evidence-card-v2').forEach(card=>{
      // V15.16.181: the actions row renders as a next step BELOW the card (not inside its padding-less, rounded box).
      if(card.dataset.fwActions==='1'||card.querySelector('.fw-evidence-card-actions'))return;
      card.dataset.fwActions='1';
      FWEvidenceEngine.byId(slug).then(entry=>{
        const d=document.createElement('div');d.className='fw-evidence-card-actions';
        d.innerHTML=(entry?'<button type="button" data-fw-card-share>SHARE THIS VERDICT</button>':'')+'<a href="/check-a-health-claim/?q='+encodeURIComponent(slug)+'">CHECK A HEALTH CLAIM →</a>';
        card.classList.add('fw-evidence-card--has-actions');
        card.insertAdjacentElement('afterend',d);
        const share=d.querySelector('[data-fw-card-share]');
        if(share)share.addEventListener('click',()=>window.FWShareVerdict?.open(entry));
        if(!entry)return;
        const status=document.createElement('details');status.className='fw-verdict-status';status.innerHTML='<summary>VERDICT STATUS & HISTORY</summary><div class="fw-verdict-status__body"><p><strong>Current verdict:</strong> '+window.FWUtils.escapeHTML(entry.verdict)+'</p><p><strong>Last reviewed:</strong> '+window.FWUtils.escapeHTML(entry.last_reviewed)+'</p><p>No previous Fitness World verdict is recorded for this investigation.</p></div>';
        card.appendChild(status);
      });
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

/* --- evidence-receipt-better-alternative.js --- */
(function(){
  const esc=window.FWUtils.escapeHTML;
  function sources(){
    const out=[]; const seen=new Set();
    document.querySelectorAll('a[href^="http"]').forEach(a=>{const h=a.href;if(!h||seen.has(h))return; if(/pexels|facebook|instagram|threads|youtube|netlify/i.test(h))return; const t=(a.textContent||'').trim(); if(/pubmed|doi|journal|study|review|source|reference|ncbi|nih|bmj|jama|nature|sciencedirect|springer|wiley|frontiers|mdpi|cochrane/i.test(h+' '+t)){seen.add(h);out.push({h,t:t||new URL(h).hostname});}}); return out.slice(0,4);
  }
  function init(){
    const slug=location.pathname.match(/^\/articles\/([^/]+)\//)?.[1]; if(!slug||!window.FWEvidenceEngine)return;
    document.querySelectorAll('.fw-evidence-card-v2').forEach(card=>{
      FWEvidenceEngine.byId(slug).then(entry=>{
        if(!entry||card.querySelector('.fw-evidence-receipt')||document.querySelector('[data-fw-v2-receipt-for="'+slug+'"]'))return;
        const src=sources();
        const rec=document.createElement('details'); rec.className='fw-evidence-receipt';
        let html='<summary>WHY DID FITNESS WORLD REACH THIS VERDICT?</summary><div class="fw-receipt-body"><div class="fw-receipt-kicker">EVIDENCE RECEIPT</div>'+
          '<div class="fw-receipt-grid"><div><span>Claim</span><strong>'+esc(entry.claim)+'</strong></div><div><span>Evidence strength</span><strong>'+esc(entry.evidence)+'</strong></div></div>'+
          (entry.supported?'<div class="fw-receipt-section"><strong>What supports the claim</strong><p>'+esc(entry.supported)+'</p></div>':'')+
          (entry.uncertain?'<div class="fw-receipt-section"><strong>Main limitations / what we still don’t know</strong><p>'+esc(entry.uncertain)+'</p></div>':'')+
          (entry.last_reviewed?'<div class="fw-receipt-section"><strong>Last reviewed</strong><p>'+esc(entry.last_reviewed)+'</p></div>':'')+
          (src.length?'<div class="fw-receipt-section"><strong>Important sources</strong><ul>'+src.map(x=>'<li><a href="'+esc(x.h)+'" target="_blank" rel="noopener noreferrer">'+esc(x.t)+'</a></li>').join('')+'</ul></div>':'')+
          '<div class="fw-receipt-verdict"><span>FITNESS WORLD VERDICT</span><p>'+esc(entry.verdict)+'</p></div></div>';
        rec.innerHTML=html; card.appendChild(rec); rec.addEventListener('toggle',()=>{if(rec.open)FWEvidenceEngine.track('evidence_receipt_open',{claim_id:entry.id})},{once:true});
        if(entry.better_alternative){
          const b=document.createElement('details');b.className='fw-better-alternative fw-compact-decision';b.setAttribute('aria-label','Better alternative');
          b.innerHTML='<summary><span>WHAT MAKES MORE SENSE?</span><span class="fw-accordion-chevron" aria-hidden="true">⌄</span></summary><div class="fw-compact-decision-body"><p><strong>Consider:</strong> '+esc(entry.better_alternative.consider)+'</p><p>'+esc(entry.better_alternative.why)+'</p>'+(entry.better_alternative.url?'<a href="'+esc(entry.better_alternative.url)+'">'+esc(entry.better_alternative.cta||'LEARN MORE →')+'</a>':'')+'</div>';
          card.appendChild(b); b.querySelector('a')?.addEventListener('click',()=>FWEvidenceEngine.track('better_alternative_click',{claim_id:entry.id,destination:entry.better_alternative.url}));
        }
      });
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

/* Final duplicate-receipt guard: removes legacy standalone prompt boxes that contain only the same receipt question. */
(function(){
  function clean(){
    const phrase='why did fitness world reach this verdict?';
    document.querySelectorAll('.fw-evidence-card-v2').forEach(card=>{
      let n=card.nextElementSibling;
      while(n && n.classList && n.classList.contains('fw-better-alternative')) n=n.nextElementSibling;
      if(n){
        const text=(n.textContent||'').trim().replace(/\s+/g,' ').toLowerCase();
        if(text===phrase && !n.matches('details.fw-evidence-receipt')) n.remove();
      }
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(clean,250));else setTimeout(clean,250);
})();

/* --- v13-4-runtime.js --- */
(function(){
  'use strict';
  function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));}
  var lockedY=0,locked=false,lastToggle=null;
  function isMobile(){return window.innerWidth<=768;}
  function setLocked(on){
    if(on&&isMobile()&&!locked){
      lockedY=window.scrollY||window.pageYOffset||0;locked=true;
      document.documentElement.classList.add('fw-nav-open');document.body.classList.add('fw-nav-open');
      document.body.style.position='fixed';document.body.style.top=(-lockedY)+'px';document.body.style.left='0';document.body.style.right='0';document.body.style.width='100%';
    }else if((!on||!isMobile())&&locked){
      locked=false;document.documentElement.classList.remove('fw-nav-open');document.body.classList.remove('fw-nav-open');
      document.body.style.position='';document.body.style.top='';document.body.style.left='';document.body.style.right='';document.body.style.width='';
      window.scrollTo(0,lockedY);
    }else{
      document.documentElement.classList.toggle('fw-nav-open',!!on&&isMobile());document.body.classList.toggle('fw-nav-open',!!on&&isMobile());
    }
  }
  function anyOpen(){return !!document.querySelector('.topbar .navlinks.mobile-open');}
  function closeNav(returnFocus){
    $$('.topbar .navlinks.mobile-open').forEach(function(n){n.classList.remove('mobile-open');n.setAttribute('aria-hidden','true');});
    $$('.topbar .mobile-menu-toggle').forEach(function(b){b.setAttribute('aria-expanded','false');b.setAttribute('aria-label','Open navigation');});
    setLocked(false);
    collapseNavMenus();
    if(returnFocus&&lastToggle){try{lastToggle.focus();}catch(e){}}
  }
  /* V15.16.179 — header dropdowns (desktop) / accordions (menu panel).
     Top-level labels stay real links; the adjacent chevron button owns the
     menu via aria-expanded + aria-controls. Menu links are ordinary anchors
     in the HTML, so they remain crawlable without JavaScript. */
  function isPanelNav(){return window.innerWidth<=1100;}
  function setNavMenu(item,open){
    var b=item.querySelector('[data-fw-nav-toggle]');
    item.classList.toggle('is-open',!!open);
    if(b)b.setAttribute('aria-expanded',open?'true':'false');
    if(!open)delete item.dataset.fwHoverOpen;
  }
  function collapseNavMenus(except){$$('.topbar [data-fw-nav-item].is-open').forEach(function(i){if(i!==except)setNavMenu(i,false);});}
  function initNavMenus(){
    $$('.topbar .navlinks').forEach(function(nav){
      var items=$$('[data-fw-nav-item]',nav);if(!items.length)return;
      nav.classList.add('fw-nav-ready');
      items.forEach(function(item){
        var b=item.querySelector('[data-fw-nav-toggle]'),timer=null;if(!b)return;
        b.addEventListener('click',function(e){
          e.preventDefault();
          if(item.classList.contains('is-open')&&item.dataset.fwHoverOpen==='1'){delete item.dataset.fwHoverOpen;return;}
          var open=!item.classList.contains('is-open');
          if(!isPanelNav())collapseNavMenus(item);
          setNavMenu(item,open);
        });
        item.addEventListener('pointerenter',function(e){
          if(e.pointerType!=='mouse'||isPanelNav())return;
          clearTimeout(timer);
          if(!item.classList.contains('is-open')){collapseNavMenus(item);setNavMenu(item,true);item.dataset.fwHoverOpen='1';}
        });
        item.addEventListener('pointerleave',function(e){
          if(e.pointerType!=='mouse'||isPanelNav())return;
          clearTimeout(timer);
          timer=setTimeout(function(){if(item.dataset.fwHoverOpen==='1')setNavMenu(item,false);},160);
        });
        item.addEventListener('keydown',function(e){
          if(e.key!=='Escape'||!item.classList.contains('is-open'))return;
          e.preventDefault();e.stopPropagation();setNavMenu(item,false);try{b.focus();}catch(_){}
        });
        item.addEventListener('focusout',function(e){
          if(isPanelNav())return;
          if(!e.relatedTarget||!item.contains(e.relatedTarget))setNavMenu(item,false);
        });
      });
    });
    document.addEventListener('click',function(e){if(!isPanelNav()&&!(e.target.closest&&e.target.closest('[data-fw-nav-item]')))collapseNavMenus();});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!isPanelNav())collapseNavMenus();});
    var wasPanel=isPanelNav();
    window.addEventListener('resize',function(){var now=isPanelNav();if(now!==wasPanel){wasPanel=now;collapseNavMenus();}});
  }
  function initNav(){
    $$('.topbar').forEach(function(h){
      var b=h.querySelector('.mobile-menu-toggle'),n=h.querySelector('.navlinks');if(!b||!n)return;
      b.setAttribute('aria-expanded','false');b.setAttribute('aria-label','Open navigation');n.setAttribute('aria-hidden',isMobile()?'true':'false');
      b.addEventListener('click',function(){
        var opening=!n.classList.contains('mobile-open');
        $$('.topbar .navlinks.mobile-open').forEach(function(other){if(other!==n)other.classList.remove('mobile-open');});
        n.classList.toggle('mobile-open',opening);b.setAttribute('aria-expanded',opening?'true':'false');b.setAttribute('aria-label',opening?'Close navigation':'Open navigation');n.setAttribute('aria-hidden',opening?'false':'true');lastToggle=b;
        setLocked(opening);
        if(opening){var first=n.querySelector('a');if(first)setTimeout(function(){try{first.focus({preventScroll:true});}catch(e){first.focus();}},30);}
      });
      n.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){closeNav(false);});});
    });
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&anyOpen()){e.preventDefault();closeNav(true);}});
    window.addEventListener('resize',function(){if(!isMobile())closeNav(false);else $$('.topbar .navlinks:not(.mobile-open)').forEach(function(n){n.setAttribute('aria-hidden','true');});});
  }

  function cards(grid){return Array.prototype.slice.call(grid.children).filter(function(x){return /^(A|ARTICLE|DIV)$/.test(x.tagName)&&!x.classList.contains('fw-hype-load-wrap')&&!x.classList.contains('fw-progressive-control');});}
  function mk(label){var b=document.createElement('button');b.type='button';b.className='btn btn-secondary fw-progressive-load';b.textContent=label||'LOAD MORE →';b.setAttribute('aria-expanded','false');return b;}
  function initGrid(grid){
    if(grid.dataset.fwV134Ready==='1')return;var desktop=parseInt(grid.dataset.fwProgressive||'6',10)||6;var mobile=parseInt(grid.dataset.fwMobileStep||'4',10)||4;var step=isMobile()?mobile:desktop;var all=cards(grid);if(all.length<=step)return;
    grid.dataset.fwV134Ready='1';var next=grid.nextElementSibling;while(next&&(next.classList.contains('fw-progressive-load')||next.classList.contains('fw-hype-load-wrap'))){var rm=next;next=next.nextElementSibling;rm.remove();}
    var visible=step;function paint(){all.forEach(function(c,i){var hide=i>=visible;c.hidden=hide;c.classList.toggle('fw-progressive-hidden',hide);c.setAttribute('aria-hidden',hide?'true':'false');});}paint();
    var wrap=document.createElement('div');wrap.className='fw-progressive-control';var b=mk(grid.dataset.fwLoadLabel||'LOAD MORE →');wrap.appendChild(b);grid.insertAdjacentElement('afterend',wrap);
    b.addEventListener('click',function(){visible=Math.min(visible+desktop,all.length);paint();b.setAttribute('aria-expanded','true');if(visible>=all.length)wrap.remove();});
  }
  function initStatic(){$$('[data-fw-progressive]').forEach(initGrid);}
  function initHype(){
    var root=document.querySelector('[data-fw-hype-meter]');if(!root)return;var out=root.querySelector('[data-fw-hype-results]');if(!out)return;var visible=isMobile()?4:6,step=6,control=null,busy=false;
    function kill(){if(control){control.remove();control=null;}}function apply(reset){var all=$$('.fw-hype-card',out);if(reset)visible=isMobile()?4:6;kill();if(!all.length)return;all.forEach(function(c,i){c.hidden=i>=visible;c.setAttribute('aria-hidden',i>=visible?'true':'false');});if(all.length>visible){control=document.createElement('div');control.className='fw-hype-load-wrap';var b=mk('LOAD MORE CLAIMS →');control.appendChild(b);out.insertAdjacentElement('afterend',control);b.addEventListener('click',function(){visible=Math.min(visible+step,all.length);all.forEach(function(c,i){c.hidden=i>=visible;});if(visible>=all.length)kill();});}}
    var mo=new MutationObserver(function(){if(busy)return;busy=true;requestAnimationFrame(function(){busy=false;apply(true);});});mo.observe(out,{childList:true});var f=root.querySelector('[data-fw-hype-filter]');if(f)f.addEventListener('change',function(){setTimeout(function(){apply(true);},0);});setTimeout(function(){apply(true);},0);
  }
  function init(){initNav();initNavMenus();initStatic();initHype();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

/* --- article-interactive-canvas.js --- */
(() => {
  'use strict';

  const ready = () => {
    const body = document.body;
    const root = document.documentElement;
    const prose = document.querySelector('.article-prose-fixed, article.article-prose');
    if (!body || !root || !prose || !root.classList.contains('article-page') || !body.classList.contains('fw-article-reading-system')) return;

    const excludedText = /^(natural wellness encyclopedia|want more evidence-led guidance\??|references\s*&\s*sources|references|more from fitness world|put this evidence into context|take the practical guide with you)$/i;
    const excludedParents = '.fw-v2-quick-answer,.article-final-card,.article-cta,.sources,.about-author,.mobile-article-product-cta,.fw-evidence-card,.fw-authority-layer';
    let headings = Array.from(prose.querySelectorAll('h2')).filter((h) => {
      const text = h.textContent.trim();
      return text && !excludedText.test(text) && !h.closest(excludedParents);
    });

    if (headings.length < 2) return;
    headings = headings.slice(0, 7);

    const slugify = (value) => value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 52) || 'section';
    const used = new Set(Array.from(document.querySelectorAll('[id]')).map((el) => el.id));
    headings.forEach((heading, idx) => {
      if (heading.id) return;
      const base = `fw-${slugify(heading.textContent.trim())}`;
      let id = base;
      let suffix = 2;
      while (used.has(id)) id = `${base}-${suffix++}`;
      heading.id = id;
      used.add(id);
      heading.style.scrollMarginTop = '94px';
    });

    body.classList.add('fw-article-interactive-ready');
    body.dataset.fwArticleTone = '0';

    const makeLink = (heading, className = '') => {
      const a = document.createElement('a');
      a.href = `#${heading.id}`;
      a.textContent = heading.textContent.trim();
      if (className) a.className = className;
      a.addEventListener('click', (event) => {
        event.preventDefault();
        heading.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
        history.replaceState(null, '', `#${heading.id}`);
      });
      return a;
    };

    // Mobile collapsible section navigator. It replaces the older horizontal jump strip visually.
    const mobile = document.createElement('details');
    mobile.className = 'fw-article-mobile-nav';
    const summary = document.createElement('summary');
    const summaryTitle = document.createElement('span');
    summaryTitle.textContent = 'In this article';
    const mobileProgress = document.createElement('span');
    mobileProgress.className = 'fw-article-mobile-nav__progress';
    mobileProgress.textContent = '0% read';
    summary.append(summaryTitle, mobileProgress);
    const mobileList = document.createElement('ul');
    mobileList.className = 'fw-article-mobile-nav__links';
    headings.forEach((heading) => {
      const li = document.createElement('li');
      const a = makeLink(heading);
      a.dataset.fwTarget = heading.id;
      a.addEventListener('click', () => { mobile.open = false; });
      li.appendChild(a);
      mobileList.appendChild(li);
    });
    mobile.append(summary, mobileList);
    const oldJump = prose.querySelector('.fw-v2-jump-nav');
    if (oldJump) oldJump.insertAdjacentElement('beforebegin', mobile);
    else prose.insertAdjacentElement('afterbegin', mobile);

    // Desktop edge rail with section markers.
    const edge = document.createElement('aside');
    edge.className = 'fw-article-edge-progress';
    edge.setAttribute('aria-label', 'Article reading progress');
    const edgeTrack = document.createElement('div');
    edgeTrack.className = 'fw-article-edge-progress__track';
    const edgeFill = document.createElement('span');
    edgeFill.className = 'fw-article-edge-progress__fill';
    edgeTrack.appendChild(edgeFill);
    const markerWrap = document.createElement('div');
    markerWrap.className = 'fw-article-edge-progress__markers';
    const markers = headings.map((heading, idx) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'fw-article-edge-progress__marker';
      button.style.top = `${headings.length === 1 ? 50 : (idx / (headings.length - 1)) * 100}%`;
      button.setAttribute('aria-label', `Go to ${heading.textContent.trim()}`);
      button.title = heading.textContent.trim();
      button.addEventListener('click', () => heading.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }));
      markerWrap.appendChild(button);
      return button;
    });
    edge.append(edgeTrack, markerWrap);
    body.appendChild(edge);

    // Wide-desktop companion card in the unused outer margin.
    const companion = document.createElement('aside');
    companion.className = 'fw-article-companion';
    companion.setAttribute('aria-label', 'In this article');
    const eyebrow = document.createElement('div');
    eyebrow.className = 'fw-article-companion__eyebrow';
    eyebrow.textContent = 'Reading guide';
    const title = document.createElement('h2');
    title.className = 'fw-article-companion__title';
    title.textContent = 'In this article';
    const meter = document.createElement('div');
    meter.className = 'fw-article-companion__meter';
    const meterTrack = document.createElement('span');
    meterTrack.className = 'fw-article-companion__meter-track';
    const meterFill = document.createElement('span');
    meterFill.className = 'fw-article-companion__meter-fill';
    meterTrack.appendChild(meterFill);
    const meterText = document.createElement('span');
    meterText.textContent = '0%';
    meter.append(meterTrack, meterText);
    const desktopList = document.createElement('ul');
    desktopList.className = 'fw-article-companion__links';
    const desktopLinks = headings.map((heading) => {
      const li = document.createElement('li');
      const a = makeLink(heading);
      a.dataset.fwTarget = heading.id;
      li.appendChild(a);
      desktopList.appendChild(li);
      return a;
    });
    const actions = document.createElement('div');
    actions.className = 'fw-article-companion__actions';
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'fw-article-companion__action';
    copy.textContent = 'Copy link';
    const status = document.createElement('span');
    status.className = 'fw-article-companion__copy-status';
    const top = document.createElement('button');
    top.type = 'button';
    top.className = 'fw-article-companion__action';
    top.textContent = 'Top ↑';
    copy.addEventListener('click', async () => {
      const canonical = document.querySelector('link[rel="canonical"]')?.href || location.href.split('#')[0];
      try {
        await navigator.clipboard.writeText(canonical);
        status.textContent = 'Copied';
        window.setTimeout(() => { status.textContent = ''; }, 1400);
      } catch (_) {
        status.textContent = 'Copy unavailable';
      }
    });
    top.addEventListener('click', () => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));
    actions.append(copy, status, top);
    companion.append(eyebrow, title, meter, desktopList, actions);
    body.appendChild(companion);

    const article = prose;
    const update = () => {
      const rect = article.getBoundingClientRect();
      const start = window.scrollY + rect.top;
      const end = start + article.offsetHeight - window.innerHeight;
      const span = Math.max(1, end - start);
      const value = Math.max(0, Math.min(1, (window.scrollY - start) / span));
      const pct = Math.round(value * 100);
      edgeFill.style.height = `${pct}%`;
      meterFill.style.width = `${pct}%`;
      meterText.textContent = `${pct}%`;
      mobileProgress.textContent = `${pct}% read`;

      const viewportProbe = window.scrollY + Math.min(window.innerHeight * .34, 300);
      let activeIndex = 0;
      headings.forEach((heading, idx) => {
        const y = window.scrollY + heading.getBoundingClientRect().top;
        if (y <= viewportProbe) activeIndex = idx;
      });
      body.dataset.fwArticleTone = String(activeIndex % 4);
      markers.forEach((marker, idx) => marker.classList.toggle('is-active', idx === activeIndex));
      desktopLinks.forEach((link, idx) => link.classList.toggle('is-active', idx === activeIndex));
      mobileList.querySelectorAll('a').forEach((link, idx) => link.classList.toggle('is-active', idx === activeIndex));

      const articleBottom = start + article.offsetHeight - window.innerHeight * .35;
      body.classList.toggle('fw-article-companion-active', window.scrollY <= articleBottom);
    };

    let ticking = false;
    const requestUpdate = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { update(); ticking = false; });
    };
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate, { passive: true });
    update();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true });
  else ready();
})();

/* --- shared-carousels.js --- */
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
