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
  const stickyExcluded=/^\/(free-guide|natural|checkout|thank-you|contact\/success)\//.test(path)||commercialFunnel||path==='/';
  let sticky=document.querySelector('.mobile-guide-sticky');
  if(!sticky && !stickyExcluded){
    sticky=document.createElement('aside');
    sticky.className='mobile-guide-sticky';
    sticky.setAttribute('aria-label','Free 30-Day Reset preview');
    sticky.innerHTML='<span><strong>Free 5-page Reset preview</strong></span><a class="btn btn-main" href="/free-guide/?utm_source=mobile_sticky&utm_medium=onsite&utm_campaign=free_guide">Get free preview</a>';
    document.body.appendChild(sticky);
  }
  if(sticky){
    // Avoid competing with any visible inline preview card, button or form.
    const previewTargets=[...document.querySelectorAll('.fw-article-email-capture,.fw-encyclopedia-cta,.guide-email-card,a[href*="/free-guide/"]')].filter(el=>!sticky.contains(el)&&!el.closest('.topbar,footer'));
    if('IntersectionObserver' in window){
      const visible=new Set();
      const observer=new IntersectionObserver(entries=>{
        entries.forEach(entry=>{if(entry.isIntersecting)visible.add(entry.target);else visible.delete(entry.target)});
        sticky.classList.toggle('fw-inline-preview-visible',visible.size>0);
      },{rootMargin:'0px 0px 80px 0px',threshold:0});
      previewTargets.forEach(el=>observer.observe(el));
    }
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
  document.querySelectorAll('a[href*="/the-30-day-natural-wellness-reset/"]').forEach(a=>a.addEventListener('click',()=>event('encyclopedia_click',{location:location.pathname})));
  document.querySelectorAll('a[href*="checkout"]').forEach(a=>a.addEventListener('click',()=>event('checkout_start',{location:location.pathname})));
  document.querySelectorAll('[data-share]').forEach(b=>b.addEventListener('click',()=>event('article_share',{method:b.dataset.share})));

  try{
    const visits=Number(localStorage.getItem('fwVisits')||0)+1; localStorage.setItem('fwVisits',String(visits));
    if(visits>1&&!localStorage.getItem('fwGuideRequested')) document.body.classList.add('fw-returning');
  }catch(e){}
})();
