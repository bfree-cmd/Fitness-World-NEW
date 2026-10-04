document.addEventListener('DOMContentLoaded',()=>{
  // Skip link: move keyboard focus into the main content. Safari only follows an
  // in-page link with focus when the target is focusable, so make it focusable on use.
  document.querySelectorAll('a.fw-skip-link[href^="#"]').forEach(link=>link.addEventListener('click',()=>{
    const target=document.getElementById(link.getAttribute('href').slice(1));
    if(!target)return;
    if(!target.hasAttribute('tabindex'))target.setAttribute('tabindex','-1');
    target.focus({preventScroll:false});
  }));
  const toggle=document.querySelector('[data-fw-header-search-toggle]');
  const panel=document.querySelector('[data-fw-header-search-panel]');
  if(!toggle||!panel)return;
  const input=panel.querySelector('#fw-header-search-input');
  const close=panel.querySelector('[data-fw-header-search-close]');
  const results=panel.querySelector('[data-fw-header-search-results]');
  const allLink=panel.querySelector('[data-fw-header-search-all]');
  const tabs=[...panel.querySelectorAll('[data-fw-search-filter]')];
  let index=[],filter='all',loaded=false;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const aliases={magnesum:'magnesium',magnisium:'magnesium',protien:'protein',protiens:'protein',sleap:'sleep',insomia:'insomnia',testostrone:'testosterone',testesterone:'testosterone',collegen:'collagen',collagin:'collagen',electrolites:'electrolytes',ashwaganda:'ashwagandha',vitamind:'vitamin d',omega3:'omega 3',bloodsugar:'blood sugar',smartwatch:'wearable watch'};
  const norm=value=>String(value||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  const edit1=(a,b)=>{if(Math.abs(a.length-b.length)>1)return false;let i=0,j=0,d=0;while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue}if(++d>1)return false;if(a.length>b.length)i++;else if(b.length>a.length)j++;else{i++;j++}}return d+(i<a.length||j<b.length?1:0)<=1};
  const expand=value=>norm(value).split(' ').map(token=>aliases[token]||token).join(' ');
  const matches=(item,value)=>{const query=expand(value),hay=norm(`${item.title} ${item.desc||''}`);if(hay.includes(query))return true;return query.split(' ').every(token=>hay.split(' ').some(word=>word===token||(token.length>=5&&edit1(token,word))))};
  const quick=[
    {title:'Check a Health Claim',url:'/check-a-health-claim/',desc:'Test a health claim against reviewed Fitness World evidence.',kind:'tools'},
    {title:"Men's Health",url:'/mens-health/',desc:'Testosterone, strength, nutrition and everyday men’s health.',kind:'topics'},
    {title:'Sleep & Recovery',url:'/sleep-recovery/',desc:'Evidence-aware sleep and recovery guidance.',kind:'topics'},
    {title:'Natural Wellness',url:'/natural-wellness/',desc:'Herbs, foods and natural wellness without the hype.',kind:'topics'},
    {title:'Browse Articles',url:'/articles/',desc:'See all Fitness World investigations and guides.',kind:'articles'}
  ];
  function classify(x){return x.kind||(x.url||'').startsWith('/articles/')?'articles':'topics'}
  async function ensure(){if(loaded)return;loaded=true;try{const r=await fetch('/assets/data/site-search-index.json?v=15.16.168r3',{cache:'force-cache'});if(r.ok)index=await r.json()}catch(_){index=[]}render()}
  function matchKind(x){if(filter==='all')return true;return (x.kind||classify(x))===filter}
  function render(){
    const q=(input?.value||'').trim();
    let list=q?index.filter(x=>matchKind(x)&&matches(x,q)):quick.filter(matchKind);
    list=list.slice(0,4);
    results.innerHTML=list.length?list.map(x=>`<a class="fw-header-search-result" href="${esc(x.url)}">${x.image?`<span class="fw-header-search-thumb"><img alt="" src="${esc(x.image)}" loading="lazy"/></span>`:`<span class="fw-header-search-thumb fw-header-search-thumb--icon" aria-hidden="true">⌕</span>`}<span><strong>${esc(x.title)}</strong><small>${esc(x.desc||'')}</small></span><b aria-hidden="true">›</b></a>`).join(''):'<div class="fw-header-search-empty">No matching Fitness World pages found yet.</div>';
    if(allLink)allLink.href='/search/'+(q?'?q='+encodeURIComponent(q):'');
  }
  function open(){if(matchMedia('(max-width:900px)').matches){location.href='/search/';return}panel.hidden=false;toggle.setAttribute('aria-expanded','true');ensure();setTimeout(()=>input?.focus(),30)}
  function shut(){panel.hidden=true;toggle.setAttribute('aria-expanded','false')}
  toggle.addEventListener('click',()=>panel.hidden?open():shut());
  close?.addEventListener('click',shut);
  input?.addEventListener('input',render);
  input?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();location.href=allLink.href}});
  tabs.forEach(btn=>btn.addEventListener('click',()=>{filter=btn.dataset.fwSearchFilter||'all';tabs.forEach(b=>b.classList.toggle('is-active',b===btn));render()}));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)shut()});
  document.addEventListener('click',e=>{if(!panel.hidden&&!panel.contains(e.target)&&!toggle.contains(e.target))shut()});
});
