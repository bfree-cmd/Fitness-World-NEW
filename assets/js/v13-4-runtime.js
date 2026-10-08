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
  function normalizeBrandTagline(){$$('.brandtagline').forEach(function(el){if(el.textContent.trim()!=='WHAT REALLY WORKS.')el.textContent='WHAT REALLY WORKS.';});var brand=document.querySelector('.brand.brand-wordmark');if(brand)brand.removeAttribute('aria-label');}
  function init(){normalizeBrandTagline();initNav();initNavMenus();initStatic();initHype();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
