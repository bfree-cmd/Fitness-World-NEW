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
