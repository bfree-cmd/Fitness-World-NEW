(()=>{
  var PROMPTS=[
    'What do you want to know?',
    'Does creatine actually work?',
    'How much protein do I need?',
    'Is magnesium worth taking?',
    'What actually helps sleep?',
    'Does ashwagandha work?'
  ];
  var ROTATE_MS=3800;
  var FADE_MS=500;

  function setup(form){
    var input=form.querySelector('input[type="search"]');
    var rotator=form.querySelector('.fw-home-search-rotator');
    if(!input||!rotator)return;

    var reduceMotion=window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var isDesktop=function(){return window.matchMedia && window.matchMedia('(min-width: 761px)').matches;};
    var idx=0;
    var timer=null;

    function showNext(){
      rotator.classList.add('fw-rotator-swap');
      window.setTimeout(function(){
        idx=(idx+1)%PROMPTS.length;
        rotator.textContent=PROMPTS[idx];
        rotator.classList.remove('fw-rotator-swap');
      }, FADE_MS);
    }

    function start(){
      if(reduceMotion||!isDesktop())return;
      stop();
      timer=window.setInterval(showNext, ROTATE_MS);
    }
    function stop(){
      if(timer){window.clearInterval(timer);timer=null;}
    }

    function active(){
      form.classList.add('fw-search-active');
      stop();
    }
    function inactive(){
      if(input.value.length===0){
        form.classList.remove('fw-search-active');
        start();
      }
    }

    input.addEventListener('focus', active);
    input.addEventListener('input', function(){
      if(input.value.length>0){active();}
    });
    input.addEventListener('blur', inactive);

    window.addEventListener('resize', function(){
      if(!isDesktop()){stop();}
      else if(document.activeElement!==input && input.value.length===0){start();}
    });

    if(reduceMotion){
      rotator.textContent=PROMPTS[0];
    }else{
      start();
    }
  }
  document.addEventListener('DOMContentLoaded', function(){
    document.querySelectorAll('.fw-home-search').forEach(setup);
  });
})();
