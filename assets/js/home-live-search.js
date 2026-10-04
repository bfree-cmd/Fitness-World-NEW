document.addEventListener('DOMContentLoaded',()=>{
  const form=document.querySelector('.fw-home-search');
  const input=form?.querySelector('#fw-home-search-q');
  const plus=form?.querySelector('[data-fw-home-search-plus]');
  if(!form||!input)return;

  const panel=document.createElement('div');
  panel.className='fw-home-live-search';
  panel.id='fw-home-live-search-panel';
  panel.hidden=true;
  panel.innerHTML=`<div class="fw-header-search-card">
    <div aria-label="Search filters" class="fw-header-search-tabs" role="tablist">
      <button aria-selected="true" class="is-active" data-fw-home-search-filter="all" role="tab" type="button">All</button>
      <button aria-selected="false" data-fw-home-search-filter="articles" role="tab" type="button">Articles</button>
      <button aria-selected="false" data-fw-home-search-filter="topics" role="tab" type="button">Topics</button>
      <button aria-selected="false" data-fw-home-search-filter="tools" role="tab" type="button">Tools &amp; Guides</button>
    </div>
    <div aria-live="polite" class="fw-header-search-results" data-fw-home-search-results></div>
    <a class="fw-header-search-all" data-fw-home-search-all href="/search/">VIEW ALL RESULTS →</a>
  </div>`;
  form.append(panel);

  const results=panel.querySelector('[data-fw-home-search-results]');
  const allLink=panel.querySelector('[data-fw-home-search-all]');
  const tabs=[...panel.querySelectorAll('[data-fw-home-search-filter]')];
  const hero=form.closest('.fw-simple-hero');
  let index=[];
  let filter='all';
  let loaded=false;
  let active=-1;

  const featured=[
    {title:'Check a Health Claim',url:'/check-a-health-claim/',desc:'Test a health claim against reviewed Fitness World evidence.',kind:'tools',image:'/assets/images/ui/discovery-tool-claim-v178.svg'},
    {title:"Men's Health",url:'/mens-health/',desc:'Testosterone, strength, nutrition and everyday men’s health.',kind:'topics',image:'/assets/images/mens-health-blood-flow-runner-local.webp'},
    {title:'Sleep & Recovery',url:'/sleep-recovery/',desc:'Evidence-aware sleep and recovery guidance.',kind:'topics',image:'/assets/images/ui/topic-sleep.webp'},
    {title:'Natural Wellness',url:'/natural-wellness/',desc:'Herbs, foods and natural wellness without the hype.',kind:'topics',image:'/assets/images/article-ginger-botanical.webp'},
    {title:"Women's Health",url:'/womens-health/',desc:'Menopause, strength, protein, sleep and everyday women’s health.',kind:'topics',image:'/assets/images/hero-womens-health.webp'},
    {title:'Choose Smarter',url:'/choose-smarter/',desc:'Evidence-aware supplement and natural wellness guidance designed to help readers make more informed choices.',kind:'topics',image:'/assets/images/hero-photos-v165r4/choose-smarter-pexels-8422702-v165r4.webp'},
    {title:'Evidence Finder',url:'/tools/evidence-finder/',desc:'Find evidence ratings for supplements, habits and wellness claims.',kind:'tools',image:'/assets/images/ui/discovery-tool-evidence-v178.svg'},
    {title:'Health Hype Meter',url:'/health-hype-meter/',desc:'Compare the strength of a claim with the strength of its evidence.',kind:'tools',image:'/assets/images/ui/discovery-tool-hype-v178.svg'},
    {title:'Creatine Guide & Calculator',url:'/tools/creatine-guide-calculator/',desc:'Build a practical creatine guide based on your goals and preferences.',kind:'tools',image:'/assets/images/ui/discovery-tool-creatine-v178.svg'},
    {title:'Browse Articles',url:'/articles/',desc:'See all Fitness World investigations and practical guides.',kind:'articles',image:'/assets/images/hero-photos-v165r4/articles-pexels-8933605-v165r4.webp'}
  ];
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const aliases={magnesum:'magnesium',magnisium:'magnesium',protien:'protein',protiens:'protein',sleap:'sleep',insomia:'insomnia',testostrone:'testosterone',testesterone:'testosterone',collegen:'collagen',collagin:'collagen',electrolites:'electrolytes',ashwaganda:'ashwagandha',vitamind:'vitamin d',omega3:'omega 3',bloodsugar:'blood sugar',smartwatch:'wearable watch'};
  const norm=value=>String(value||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  const edit1=(a,b)=>{if(Math.abs(a.length-b.length)>1)return false;let i=0,j=0,d=0;while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue}if(++d>1)return false;if(a.length>b.length)i++;else if(b.length>a.length)j++;else{i++;j++}}return d+(i<a.length||j<b.length?1:0)<=1};
  const expand=value=>norm(value).split(' ').map(token=>aliases[token]||token).join(' ');
  const matches=(item,value)=>{const query=expand(value),hay=norm(`${item.title} ${item.desc||''}`);if(hay.includes(query))return true;return query.split(' ').every(token=>hay.split(' ').some(word=>word===token||(token.length>=5&&edit1(token,word))))};
  const kindOf=item=>item.kind||(((item.url||'').startsWith('/articles/')||(item.url||'').startsWith('/worth-it/'))?'articles':'topics');
  const matchesFilter=item=>filter==='all'||kindOf(item)===filter;
  const combined=()=>{
    const seen=new Set();
    return [...featured,...index].filter(item=>{
      if(!item?.url||seen.has(item.url))return false;
      seen.add(item.url);
      return true;
    });
  };

  function links(){return [...results.querySelectorAll('.fw-header-search-result')]}
  function setActive(next){
    const items=links();
    active=items.length?Math.max(-1,Math.min(next,items.length-1)):-1;
    items.forEach((item,i)=>{
      item.classList.toggle('is-active',i===active);
      item.setAttribute('aria-selected',String(i===active));
    });
    if(active>=0)items[active].scrollIntoView({block:'nearest'});
  }
  function render(){
    const query=input.value.trim();
    allLink.hidden=!query;
    let list=combined().filter(matchesFilter);
    if(query)list=list.filter(item=>matches(item,query));
    list=list.slice(0,4);
    results.innerHTML=list.length?list.map(item=>`<a aria-selected="false" class="fw-header-search-result" href="${esc(item.url)}" role="option">${item.image?`<span class="fw-header-search-thumb"><img alt="" loading="lazy" src="${esc(item.image)}"/></span>`:`<span aria-hidden="true" class="fw-header-search-thumb fw-header-search-thumb--icon">⌕</span>`}<span><strong>${esc(item.title)}</strong><small>${esc(item.desc||'')}</small></span><b aria-hidden="true">›</b></a>`).join(''):'<div class="fw-header-search-empty">No matching Fitness World pages found yet.</div>';
    results.setAttribute('role','listbox');
    allLink.href='/search/'+(query?`?q=${encodeURIComponent(query)}`:'');
    active=-1;
  }
  async function ensureIndex(){
    if(loaded)return;
    loaded=true;
    try{
      const response=await fetch('/assets/data/site-search-index.json?v=15.16.168r3',{cache:'force-cache'});
      if(response.ok)index=await response.json();
    }catch(_){index=[]}
    render();
  }
  function open(){
    panel.hidden=false;
    form.classList.add('is-open');
    hero?.classList.add('fw-home-search-open');
    input.setAttribute('aria-expanded','true');
    plus?.setAttribute('aria-expanded','true');
    ensureIndex();
    render();
  }
  function close(){
    panel.hidden=true;
    form.classList.remove('is-open');
    hero?.classList.remove('fw-home-search-open');
    input.setAttribute('aria-expanded','false');
    plus?.setAttribute('aria-expanded','false');
    setActive(-1);
  }

  input.setAttribute('aria-autocomplete','list');
  input.setAttribute('aria-controls',panel.id);
  input.setAttribute('aria-expanded','false');
  plus?.addEventListener('click',()=>{
    if(panel.hidden){open(); input.focus({preventScroll:true});}
    else close();
  });
  // Let the form's native GET action submit to /search/?q=… . The input's
  // keydown handler below still opens a highlighted suggestion on Enter.
  input.addEventListener('focus',()=>{if(input.value.trim())open()});
  input.addEventListener('input',()=>{
    if(!input.value.trim()){close();return}
    open();render();
  });
  input.addEventListener('keydown',event=>{
    const items=links();
    if(event.key==='ArrowDown'){
      event.preventDefault();
      if(panel.hidden)open();
      setActive(active>=items.length-1?0:active+1);
    }else if(event.key==='ArrowUp'){
      event.preventDefault();
      setActive(active<=0?items.length-1:active-1);
    }else if(event.key==='Enter'&&active>=0&&items[active]){
      event.preventDefault();
      location.href=items[active].href;
    }else if(event.key==='Escape'){
      event.preventDefault();
      close();
      input.blur();
    }
  });
  tabs.forEach(button=>button.addEventListener('click',()=>{
    filter=button.dataset.fwHomeSearchFilter||'all';
    tabs.forEach(tab=>{
      const selected=tab===button;
      tab.classList.toggle('is-active',selected);
      tab.setAttribute('aria-selected',String(selected));
    });
    render();
    input.focus();
  }));
  document.addEventListener('click',event=>{
    if(!panel.hidden&&!form.contains(event.target))close();
  });
});
