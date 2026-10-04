(function(){
  'use strict';
  const normalize=value=>String(value||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  function boot(){
    const search=document.querySelector('#article-search');
    const topicButtons=[...document.querySelectorAll('[data-filter]')];
    const formatButtons=[...document.querySelectorAll('[data-format-filter]')];
    const clear=document.querySelector('#articles-clear-filters');
    const noResults=document.querySelector('#no-results');
    const loadMore=document.querySelector('#articles-load-more');
    const featuredSection=document.querySelector('[data-fw-articles-featured]');
    const librarySection=document.querySelector('[data-fw-articles-library]');
    const libraryGrid=document.querySelector('#articles-library-grid');
    const sort=document.querySelector('#articles-sort');
    const featuredCards=[...document.querySelectorAll('[data-fw-article-featured][data-fw-article-card]')];
    const libraryCards=[...document.querySelectorAll('#articles-library-grid>[data-fw-article-card]')];
    const originalLibraryOrder=[...libraryCards];
    const allCards=[...featuredCards,...libraryCards];
    if(!search||!libraryGrid||!allCards.length)return;

    const params=new URLSearchParams(location.search);
    let activeTopic=normalize(params.get('topic')||'all');
    let activeFormat=normalize(params.get('format')||'all');
    let renderLimit=12;
    const PAGE_SIZE=12;

    const buttonValue=(b,key)=>normalize(b.dataset[key]||'all');
    if(!topicButtons.some(b=>buttonValue(b,'filter')===activeTopic))activeTopic='all';
    if(!formatButtons.some(b=>buttonValue(b,'formatFilter')===activeFormat))activeFormat='all';

    function setActive(buttons,key,value){
      buttons.forEach(btn=>{
        const on=buttonValue(btn,key)===value;
        btn.classList.toggle('active',on);
        btn.setAttribute('aria-pressed',on?'true':'false');
      });
    }
    function matches(card){
      const q=normalize(search.value);
      const topic=normalize(card.dataset.topic);
      const format=normalize(card.dataset.format);
      const hay=normalize((card.dataset.searchText||'')+' '+card.textContent+' '+(card.getAttribute('href')||''));
      const terms=q.split(/\s+/).filter(Boolean);
      return (activeTopic==='all'||topic===activeTopic) &&
             (activeFormat==='all'||format===activeFormat) &&
             (!terms.length||terms.every(t=>hay.includes(t)));
    }
    function updateUrl(){
      const u=new URL(location.href);
      if(activeTopic==='all')u.searchParams.delete('topic');else u.searchParams.set('topic',activeTopic);
      if(activeFormat==='all')u.searchParams.delete('format');else u.searchParams.set('format',activeFormat);
      try{history.replaceState({},'',u.pathname+(u.search||''));}catch(_){/* synthetic QA documents may have an opaque origin */}
    }
    function applySort(){
      if(!sort||!libraryGrid)return;
      const cards=sort.value==='az'
        ? [...originalLibraryOrder].sort((a,b)=>normalize(a.querySelector('strong')?.textContent).localeCompare(normalize(b.querySelector('strong')?.textContent)))
        : originalLibraryOrder;
      cards.forEach(card=>libraryGrid.appendChild(card));
    }
    function paint(){
      applySort();
      const featuredMatches=featuredCards.filter(matches);
      const libraryMatches=libraryCards.filter(matches);
      const discovery=!!normalize(search.value)||activeTopic!=='all'||activeFormat!=='all';
      const libraryVisible=new Set(libraryMatches.slice(0,Math.min(renderLimit,libraryMatches.length)));
      const setCardVisible=(c,show)=>{c.hidden=!show;if(!show)c.style.setProperty('display','none','important');else c.style.removeProperty('display');c.setAttribute('aria-hidden',show?'false':'true')};
      featuredCards.forEach(c=>setCardVisible(c,featuredMatches.includes(c)));
      libraryCards.forEach(c=>setCardVisible(c,libraryVisible.has(c)));
      if(featuredSection)featuredSection.hidden=featuredMatches.length===0;
      if(librarySection)librarySection.hidden=libraryMatches.length===0;
      const total=featuredMatches.length+libraryMatches.length;
      if(noResults)noResults.hidden=total!==0;
      if(loadMore){
        loadMore.hidden=libraryMatches.length<=renderLimit;
        loadMore.setAttribute('aria-hidden',loadMore.hidden?'true':'false');
      }
      if(clear){
        clear.hidden=!discovery;
        clear.setAttribute('aria-hidden',clear.hidden?'true':'false');
      }
      document.dispatchEvent(new CustomEvent('fw:articles-filtered',{detail:{total,topic:activeTopic,format:activeFormat,query:search.value.trim()}}));
    }
    function resetLimit(){renderLimit=PAGE_SIZE;}
    topicButtons.forEach(btn=>btn.addEventListener('click',()=>{
      activeTopic=buttonValue(btn,'filter');resetLimit();setActive(topicButtons,'filter',activeTopic);paint();updateUrl();
    }));
    formatButtons.forEach(btn=>btn.addEventListener('click',()=>{
      activeFormat=buttonValue(btn,'formatFilter');resetLimit();setActive(formatButtons,'formatFilter',activeFormat);paint();updateUrl();
    }));
    search.addEventListener('input',()=>{resetLimit();paint()});
    if(sort)sort.addEventListener('change',()=>{resetLimit();paint()});
    if(loadMore)loadMore.addEventListener('click',()=>{renderLimit+=PAGE_SIZE;paint()});
    if(clear)clear.addEventListener('click',()=>{
      search.value='';activeTopic='all';activeFormat='all';resetLimit();
      setActive(topicButtons,'filter',activeTopic);setActive(formatButtons,'formatFilter',activeFormat);paint();updateUrl();search.focus();
    });
    setActive(topicButtons,'filter',activeTopic);setActive(formatButtons,'formatFilter',activeFormat);paint();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
