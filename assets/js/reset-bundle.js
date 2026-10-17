(function(){
  'use strict';
  const ready=fetch('/assets/data/reset-bundle.json',{cache:'no-store',credentials:'same-origin'})
    .then(r=>{if(!r.ok)throw Error('Bundle details unavailable');return r.json();})
    .then(data=>data.files.filter(file=>file.released===true));
  function listFiles(list,files,descriptions){
    list.replaceChildren();
    files.forEach(file=>{
      const li=document.createElement('li'),title=document.createElement('strong');
      title.textContent=file.name;li.append(title);
      if(descriptions){const p=document.createElement('p');p.textContent=file.description;li.append(p);}
      list.append(li);
    });
  }
  function boot(){
    ready.then(files=>{
      const list=document.querySelector('[data-reset-bundle-list]');
      if(list){listFiles(list,files,true);list.closest('section').hidden=false;}
      const success=document.querySelector('[data-reset-success-files]');
      if(success)listFiles(success,files,false);
    }).catch(()=>{/* The existing product and checkout remain usable if details cannot load. */});
  }
  window.FWResetBundle={ready};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
