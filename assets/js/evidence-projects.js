(function(){
  const DATA='/assets/data/evidence-projects.json';
  const esc=v=>window.FWUtils.escapeHTML(String(v??''));
  let cache=null;
  const track=(name,params={})=>{
    if(window.FWTracking&&typeof window.FWTracking.track==='function') return window.FWTracking.track(name,params);
    if(typeof window.gtag==='function') window.gtag('event',name,params);
  };
  const load=()=>cache?Promise.resolve(cache):fetch(DATA,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Project data unavailable');return r.json()}).then(d=>(cache=d,d));
  const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
  function renderFunding(root,p){
    if(!root)return;
    const raised=Number.isFinite(p.amountRaised)?Math.max(0,p.amountRaised):0;
    const hasGoal=Number.isFinite(p.fundingGoal)&&p.fundingGoal>0;
    const pct=hasGoal?Math.max(0,Math.min(100,Math.round((raised/p.fundingGoal)*100))):0;
    const goalLabel=hasGoal?money(p.fundingGoal)+' goal':'Goal pending';
    const pctLabel=hasGoal?pct+'% funded':'Funding target to be confirmed';
    root.innerHTML='<div class="ep-funding-labels"><strong>'+money(raised)+' raised</strong><strong>'+goalLabel+'</strong></div><div class="ep-progress" role="progressbar" aria-label="Funding progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+pct+'"><span style="width:'+pct+'%"></span></div><div class="ep-funding-percent">'+pctLabel+'</div>';
  }
  function renderStages(root,p){
    if(!root)return;
    const current=p.currentStage;
    if(!current){root.innerHTML='<ol class="ep-stage-list">'+(p.stages||[]).map(s=>'<li><span aria-hidden="true">○</span><div><strong>'+esc(s)+'</strong><small>Stage status not yet published</small></div></li>').join('')+'</ol><p class="ep-project-note">The current review stage will be marked here when a verified project update is published.</p>';return;}
    const idx=(p.stages||[]).indexOf(current);
    root.innerHTML='<ol class="ep-stage-list">'+(p.stages||[]).map((s,i)=>{const st=i<idx?'Completed':i===idx?'Current':'Upcoming',icon=i<idx?'✓':i===idx?'●':'○';return '<li class="'+st.toLowerCase()+'"><span aria-hidden="true">'+icon+'</span><div><strong>'+esc(s)+'</strong><small>'+st+'</small></div></li>'}).join('')+'</ol>';
  }
  function renderUpdates(root,p){
    if(!root)return;
    if(!p.updates||!p.updates.length){root.innerHTML='<div class="ep-data-state"><strong>The first project update will appear here as the Healthy Aging Evidence Project progresses.</strong></div>';return;}
    root.innerHTML=p.updates.map(u=>'<article class="ep-update"><time>'+esc(u.date)+'</time><h3>'+esc(u.title)+'</h3><p>'+esc(u.summary)+'</p>'+(u.url?'<a class="read-link" href="'+esc(u.url)+'">Read update →</a>':'')+'</article>').join('');
  }
  function renderFindings(root,p){
    if(!root)return;
    if(!p.findings||!p.findings.length){root.innerHTML='<div class="ep-data-state"><strong>Evidence review in progress</strong><span>Findings from the project will be added here as the evidence review develops.</span></div>';return;}
  }
  function renderComments(root,p){
    if(!root)return;
    if(!p.supporterComments||!p.supporterComments.length){root.hidden=true;return;}
    root.hidden=false;
  }
  function initAmount(root,data){
    if(!root)return;
    let selected='';
    const out=root.querySelector('[data-ep-support-status]');
    const buttons=[...root.querySelectorAll('[data-ep-amount]')];
    const other=root.querySelector('[data-ep-other]');
    const submit=root.querySelector('[data-ep-support]');
    const pick=v=>{selected=v;buttons.forEach(b=>b.classList.toggle('is-selected',b.dataset.epAmount===String(v)));track('evidence_project_amount_select',{project_id:'healthy-aging',amount:String(v)});};
    buttons.forEach(b=>b.addEventListener('click',()=>pick(b.dataset.epAmount)));
    if(other)other.addEventListener('input',()=>{buttons.forEach(b=>b.classList.remove('is-selected'));selected=other.value;});
    if(submit)submit.addEventListener('click',()=>{
      const n=Number(selected||other?.value||0);
      track('evidence_project_support_click',{project_id:'healthy-aging',amount:Number.isFinite(n)&&n>0?n:undefined});
      const base=(data.paypalSupportUrl||'').trim();
      if(!base){if(out)out.textContent='PayPal support is not live yet. The payment destination must be added to the Evidence Projects configuration before this button can redirect.';return;}
      if(!Number.isFinite(n)||n<=0){if(out)out.textContent='Choose a support amount first.';return;}
      let url=base.includes('{amount}')?base.replace('{amount}',encodeURIComponent(String(n))):base;
      if(!/^https:\/\//i.test(url)&&!/^\/\.netlify\/functions\//.test(url)){if(out)out.textContent='The configured PayPal destination is not valid.';return;}
      location.href=url;
    });
  }
  function initVote(root,project){
    const btn=root.querySelector('[data-ep-vote]'),status=root.querySelector('[data-ep-vote-status]');
    if(!btn)return;
    const key='fwEvidenceVote:'+project;
    try{if(localStorage.getItem(key)==='1'){btn.disabled=true;btn.textContent='INTEREST RECORDED';if(status)status.textContent='Thanks — your interest has already been recorded on this device.';}}catch(_){ }
    btn.addEventListener('click',async()=>{
      if(btn.disabled)return; btn.disabled=true; if(status)status.textContent='Recording your interest…';
      const body=new URLSearchParams({'form-name':'evidence-project-interest','project_id':project,'source':'Evidence Projects'});
      try{const r=await fetch('/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body.toString()});if(!r.ok)throw new Error();try{localStorage.setItem(key,'1')}catch(_){} btn.textContent='INTEREST RECORDED';if(status)status.textContent='Thanks. Your interest has been recorded.';track('evidence_project_vote',{project_id:project});}
      catch(_){btn.disabled=false;if(status)status.textContent='We could not record your interest. Please try again.';}
    });
  }
  function initSignup(form,project){
    if(!form)return; const status=form.querySelector('[data-ep-signup-status]');
    form.addEventListener('submit',async e=>{e.preventDefault();const input=form.querySelector('input[type="email"]'),email=(input?.value||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){if(status)status.textContent='Enter a valid email address.';input?.focus();return;}const btn=form.querySelector('button');if(btn)btn.disabled=true;if(status)status.textContent='Saving…';const attr=window.FWTracking?.attribution?.()||{};try{const r=await fetch('/.netlify/functions/save-lead',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,source:'Evidence Projects',action:'Project Updates: '+project,eventId:'fw_ep_'+project+'_'+Date.now(),eventSourceUrl:location.href,marketing_consent:form.querySelector('input[name="marketing_consent"]')?.checked===true,...attr})});const d=await r.json().catch(()=>({}));if(!r.ok||d.success===false)throw new Error();if(status)status.textContent='✓ You’re on the project updates list.';input.disabled=true;if(btn)btn.textContent='SAVED';track('evidence_project_updates_signup',{project_id:project});}catch(_){if(btn)btn.disabled=false;if(status)status.textContent='We couldn’t save your email. Please try again.';}});
  }
  function initShare(btn,project){if(!btn)return;btn.addEventListener('click',async()=>{track('evidence_project_share',{project_id:project});const data={title:document.title,text:'Fitness World Evidence Project',url:location.href};try{if(navigator.share)await navigator.share(data);else{await navigator.clipboard.writeText(location.href);const old=btn.textContent;btn.textContent='LINK COPIED';setTimeout(()=>btn.textContent=old,1800)}}catch(_){}})}
  document.addEventListener('DOMContentLoaded',async()=>{
    const page=document.querySelector('[data-evidence-project-page]');if(!page)return;
    const project=page.dataset.projectId||'hub';
    track(project==='hub'?'evidence_projects_view':'evidence_project_view',{project_id:project});
    try{const data=await load(),p=data.projects?.[project]||(project==='hub'?data.projects?.['healthy-aging']:null);if(p){document.querySelectorAll('[data-ep-funding]').forEach(x=>renderFunding(x,p));document.querySelectorAll('[data-ep-stages]').forEach(x=>renderStages(x,p));document.querySelectorAll('[data-ep-updates]').forEach(x=>renderUpdates(x,p));document.querySelectorAll('[data-ep-findings]').forEach(x=>renderFindings(x,p));document.querySelectorAll('[data-ep-comments]').forEach(x=>renderComments(x,p));document.querySelectorAll('[data-ep-support-box]').forEach(x=>initAmount(x,data));}document.querySelectorAll('[data-ep-vote-wrap]').forEach(x=>initVote(x,x.dataset.projectId));document.querySelectorAll('[data-ep-signup]').forEach(x=>initSignup(x,x.dataset.projectId||project));document.querySelectorAll('[data-ep-share]').forEach(x=>initShare(x,project));}
    catch(e){document.querySelectorAll('[data-ep-runtime-status]').forEach(x=>x.textContent='Project status data could not be loaded. Please refresh the page.');}
    const q=new URLSearchParams(location.search);const ret=document.querySelector('[data-ep-return]');if(ret&&q.get('support')==='return')ret.hidden=false;
  });
})();