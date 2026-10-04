document.addEventListener('DOMContentLoaded',()=>{
  const q=document.getElementById('evidenceSearch');
  const grid=document.getElementById('evidenceGrid');
  const cards=[...document.querySelectorAll('.evidence-index-card')];
  const count=document.getElementById('evidenceCount');
  const state={territory:'all',evidence:'all',verdict:'all'};
  function run(){
    const term=(q?.value||'').trim().toLowerCase(); let matches=0;
    cards.forEach(c=>{
      const okT=state.territory==='all'||c.dataset.territory===state.territory;
      const okE=state.evidence==='all'||c.dataset.evidence===state.evidence;
      const okV=state.verdict==='all'||c.dataset.verdict===state.verdict;
      const hay=((c.dataset.search||'')+' '+c.textContent).toLowerCase();
      const okQ=!term||hay.includes(term); const ok=okT&&okE&&okV&&okQ;
      c.dataset.fwFilterMatch=ok?'1':'0'; if(ok)matches++;
    });
    if(count)count.textContent=matches;
    grid?.dispatchEvent(new CustomEvent('fw:progressive-filter-change',{bubbles:true,detail:{matches}}));
  }
  q?.addEventListener('input',run);
  document.querySelectorAll('[data-filter-group]').forEach(group=>group.querySelectorAll('.evidence-filter').forEach(b=>b.addEventListener('click',()=>{
    const key=group.dataset.filterGroup; state[key]=b.dataset.filter;
    group.querySelectorAll('.evidence-filter').forEach(x=>x.classList.toggle('is-active',x===b)); run();
  })));
  run();
});