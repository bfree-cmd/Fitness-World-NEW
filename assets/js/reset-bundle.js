(function(){
  'use strict';
  const ready=fetch('/assets/data/reset-bundle.json',{cache:'no-store',credentials:'same-origin'})
    .then(r=>{if(!r.ok)throw Error('Bundle details unavailable');return r.json();})
    .then(data=>data.files.filter(file=>file.released===true));
  let viewer;
  function showSample(file){
    if(!viewer){
      viewer=document.createElement('dialog');viewer.className='reset-sample-dialog';
      viewer.setAttribute('aria-labelledby','reset-sample-title');
      const close=document.createElement('button');close.type='button';close.className='reset-sample-close';close.textContent='Close preview ×';close.autofocus=true;close.addEventListener('click',()=>viewer.close());
      const title=document.createElement('h2');title.id='reset-sample-title';
      const img=document.createElement('img');img.className='reset-sample-image';
      const caption=document.createElement('p');caption.className='reset-sample-caption';
      viewer.append(close,title,img,caption);document.body.append(viewer);
      viewer.addEventListener('click',event=>{if(event.target===viewer){const box=viewer.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)viewer.close();}});
    }
    viewer.querySelector('h2').textContent=file.name;
    const img=viewer.querySelector('img');img.src=file.preview.src;img.alt=file.preview.alt;
    viewer.querySelector('p').textContent=file.preview.caption==='Book cover'?'Book cover.':'Selected detail from the printable PDF. Your purchase includes the complete file.';
    viewer.showModal();
  }
  function listFiles(list,files,descriptions){
    list.replaceChildren();
    files.forEach(file=>{
      const li=document.createElement('li'),title=document.createElement('strong');
      if(descriptions&&file.preview){
        const sample=document.createElement('button');sample.type='button';sample.className='reset-bundle-preview';
        sample.setAttribute('aria-label','View sample: '+file.name);sample.setAttribute('aria-haspopup','dialog');
        const img=document.createElement('img');img.src=file.preview.src;img.alt=file.preview.alt;img.loading='lazy';img.decoding='async';
        img.width=file.id==='reset'?1087:1072;img.height=file.id==='reset'?1407:file.id==='tracker'?520:430;
        const caption=document.createElement('span');caption.textContent='View sample';
        sample.append(img,caption);sample.addEventListener('click',()=>showSample(file));li.append(sample);
      }
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
