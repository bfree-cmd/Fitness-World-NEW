(function(){
  'use strict';

  const PRODUCT='30-Day Natural Wellness Reset';
  const PRICE=9.99;
  const CURRENCY='USD';

  const cleanEmail=value=>String(value||'').trim().toLowerCase();
  const validEmail=value=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail(value));
  const onceKey=orderID=>'fwEncyclopediaPurchase:'+String(orderID||'');

  function storedGuideEmail(){
    try{return cleanEmail(localStorage.getItem('fwGuideEmail'));}catch(_){return '';}
  }


  function attribution(){
    try{return window.FWTracking?.attribution?.()||{};}catch(_){return {};}
  }

  const paidLeadInFlight=new Map();
  function trackPaidPdfLead(emailEl){
    const value=cleanEmail(emailEl?.value);
    if(!validEmail(value)) return Promise.resolve({skipped:true});
    const key='fwPaidPdfLead:'+value;
    try{if(sessionStorage.getItem(key)==='1') return Promise.resolve({skipped:true});}catch(_){ }
    if(paidLeadInFlight.has(value)) return paidLeadInFlight.get(value);

    const run=(async()=>{
      const sender=window.FWEventTracking?.send;
      if(typeof sender!=='function') return {success:false,error:'tracker_not_ready'};
      const result=await sender('paid_pdf_lead',{
        email:value,
        product_offer:PRODUCT,
        source_form:'Paid PDF Email',
        gross_amount:PRICE,
        currency:CURRENCY,
        marketing_consent:'No',
        capture_source:'Website'
      }).catch(()=>({success:false,error:'tracking_request_failed'}));

      if(result&&result.success===true){
        try{sessionStorage.setItem(key,'1');}catch(_){ }
      }else{
        console.warn('Fitness World paid PDF lead tracking did not confirm',result||{});
      }
      return result||{success:false};
    })().finally(()=>paidLeadInFlight.delete(value));

    paidLeadInFlight.set(value,run);
    return run;
  }

  function checkoutId(){
    try{
      if(crypto&&typeof crypto.randomUUID==='function') return crypto.randomUUID();
    }catch(_){ }
    return 'fw_checkout_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,12);
  }

  function loadPayPal(clientId){
    if(window.paypal) return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const existing=document.querySelector('script[data-fw-paypal-sdk]');
      if(existing){
        existing.addEventListener('load',resolve,{once:true});
        existing.addEventListener('error',()=>reject(new Error('PayPal SDK failed to load')),{once:true});
        setTimeout(()=>window.paypal?resolve():reject(new Error('PayPal SDK timed out')),12000);
        return;
      }
      const s=document.createElement('script');
      s.dataset.fwPaypalSdk='1';
      s.src='https://www.paypal.com/sdk/js?client-id='+encodeURIComponent(clientId)+'&currency='+CURRENCY+'&intent=capture&components=buttons';
      s.async=true;
      s.onload=resolve;
      s.onerror=()=>reject(new Error('PayPal SDK failed to load'));
      document.head.appendChild(s);
      setTimeout(()=>window.paypal?resolve():reject(new Error('PayPal SDK timed out')),12000);
    });
  }

  document.addEventListener('DOMContentLoaded',async()=>{
    const email=document.getElementById('nw-purchase-email');
    const status=document.getElementById('nw-email-status');
    const container=document.getElementById('paypal-button-container');
    const fallback=document.getElementById('nw-paypal-preview');
    if(!email||!container) return;
    const pendingKey='fwEncyclopediaPendingOrder';
    let pendingOrderID='';
    function showPending(orderID){
      pendingOrderID=String(orderID||'');
      try{sessionStorage.setItem(pendingKey,pendingOrderID);}catch(_){ }
      if(status) status.textContent='Payment status is being checked. Please do not pay again.';
      const panel=document.createElement('div');
      panel.setAttribute('role','status');
      panel.setAttribute('aria-live','polite');
      const title=document.createElement('strong');
      title.textContent='Payment confirmation pending';
      const explanation=document.createElement('p');
      explanation.textContent='Please do not start another payment. Your order ID is '+pendingOrderID+'. Keep it for support.';
      const support=document.createElement('a');
      support.href='mailto:support@fitnessworld.pro?subject='+encodeURIComponent('Payment status for order '+pendingOrderID);
      support.textContent='Contact purchase support';
      panel.append(title,explanation,support);
      container.replaceChildren(panel);
    }
    try{pendingOrderID=sessionStorage.getItem(pendingKey)||'';}catch(_){ }
    if(pendingOrderID){showPending(pendingOrderID);return;}

    const prefill=storedGuideEmail();
    if(prefill&&validEmail(prefill)){
      email.value=prefill;
      if(status) status.textContent='Email ready — continue with secure checkout.';
    }

    let cfg=null;
    try{
      const r=await fetch('/.netlify/functions/paypal-config',{cache:'no-store',credentials:'same-origin'});
      cfg=await r.json().catch(()=>null);
      if(!r.ok) throw new Error(cfg?.error||'Checkout configuration request failed');
    }catch(_){
      if(fallback){fallback.textContent='Secure checkout unavailable';fallback.disabled=true;}
      if(status) status.textContent='Secure checkout could not load. Please refresh and try again.';
      return;
    }

    if(!cfg?.configured||!cfg?.clientId){
      if(fallback){fallback.textContent='Secure checkout setup pending';fallback.disabled=true;}
      if(status) status.textContent='Checkout requires the production PayPal account to be connected in Netlify.';
      return;
    }

    try{await loadPayPal(cfg.clientId);}catch(_){
      if(fallback){fallback.textContent='Secure checkout unavailable';fallback.disabled=true;}
      if(status) status.textContent='Secure checkout could not load. Please refresh and try again.';
      return;
    }
    if(!window.paypal){
      if(status) status.textContent='Secure checkout could not load. Please refresh and try again.';
      return;
    }

    if(fallback) fallback.remove();
    const isValid=()=>validEmail(email.value);
    email.addEventListener('input',()=>{
      if(pendingOrderID) return;
      if(status) status.textContent=isValid()?'Email looks good — continue with secure checkout.':'Enter a valid email to continue to secure checkout.';
    });
    email.addEventListener('change',()=>{ if(!pendingOrderID) trackPaidPdfLead(email); });
    email.addEventListener('blur',()=>{ if(!pendingOrderID) trackPaidPdfLead(email); });

    let currentCheckoutId='';
    let paidClickTracked=false;
    let paymentStage='idle';

    paypal.Buttons({
      style:{layout:'vertical',shape:'rect',label:'paypal',tagline:false},
      onClick:(_,actions)=>{
        if(pendingOrderID) return actions.reject();
        if(!isValid()){
          email.focus();
          if(status) status.textContent='Enter a valid email before checkout.';
          return actions.reject();
        }
        currentCheckoutId=checkoutId();
        paymentStage='starting_order';
        trackPaidPdfLead(email);
        if(!paidClickTracked){
          paidClickTracked=true;
          window.FWTracking?.track('encyclopedia_checkout_start',{value:PRICE,currency:CURRENCY});
        }
        return actions.resolve();
      },
      createOrder:async()=>{
        if(pendingOrderID) throw new Error('Payment confirmation is pending');
        const r=await fetch('/.netlify/functions/paypal-create-order',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          credentials:'same-origin',
          body:JSON.stringify({email:cleanEmail(email.value),checkoutId:currentCheckoutId||checkoutId()})
        });
        const d=await r.json().catch(()=>({}));
        if(!r.ok||!d.orderID){
          paymentStage='order_creation_failed';
          if(status) status.textContent='PayPal could not start the checkout. Please try again.';
          throw new Error(d.detail||d.error||'Could not start checkout');
        }
        paymentStage='order_created';
        return d.orderID;
      },
      onApprove:async data=>{
        paymentStage='confirming_payment';
        if(status) status.textContent='Confirming payment and preparing your 30-Day Reset…';
        const r=await fetch('/.netlify/functions/paypal-capture-order',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          credentials:'same-origin',
          body:JSON.stringify({orderID:data.orderID,email:cleanEmail(email.value),eventSourceUrl:location.href,...attribution()})
        });
        const d=await r.json().catch(()=>({}));
        if(d.status==='PENDING_CONFIRMATION'){
          showPending(data.orderID);
          return;
        }
        if(!r.ok||d.status!=='COMPLETED'){
          if(status) status.textContent='Payment status could not be confirmed. Please do not pay again; contact support@fitnessworld.pro with order ID '+data.orderID+'.';
          throw new Error(d.detail||d.error||'Payment was not completed');
        }

        const modal=document.getElementById('nw-purchase-success');
        const msg=document.getElementById('nw-purchase-success-message');
        const dl=document.getElementById('nw-secure-download');
        if(msg){
          if(d.deliveryStatus==='Delivered'){
            msg.textContent='Payment confirmed. We sent your 30-Day Natural Wellness Reset to '+email.value.trim()+'.';
          }else if(d.deliveryStatus==='Pending'&&d.downloadUrl){
            msg.textContent='Payment confirmed. We could not send the confirmation email right now, so please use the secure download link below and save it -- it will not be re-sent automatically.';
          }else{
            msg.textContent='Payment confirmed, but we could not prepare your download link. This is a delivery issue only, not a payment problem -- please contact support@fitnessworld.pro with your order ID ('+String(d.eventId||'').replace('fw_purchase_','')+') and we will get your 30-Day Reset to you.';
          }
        }
        if(dl&&d.downloadUrl){dl.href=d.downloadUrl;dl.hidden=false;}
        if(modal) modal.hidden=false;
        try{localStorage.setItem('fwEncyclopediaPurchased','1');}catch(_){ }

        // Analytics only. Paid Purchase is persisted server-side after confirmed capture.
        // The per-order marker prevents duplicate client analytics if PayPal re-fires onApprove.
        let already=false;
        try{already=sessionStorage.getItem(onceKey(data.orderID))==='1';}catch(_){ }
        if(!already){
          try{sessionStorage.setItem(onceKey(data.orderID),'1');}catch(_){ }
          window.FWTracking?.track('encyclopedia_purchase',{value:PRICE,currency:CURRENCY,event_id:d.eventId||('fw_purchase_'+data.orderID)});
        }
      },
      onCancel:()=>{if(status) status.textContent='Checkout cancelled. You can continue whenever you are ready.';},
      onError:err=>{
        console.error(err);
        if(pendingOrderID) return;
        paidClickTracked=false;
        currentCheckoutId='';
        if(paymentStage==='order_creation_failed') return;
        if(paymentStage==='starting_order'){
          if(status) status.textContent='PayPal could not open or start checkout. Please refresh and try again.';
          paymentStage='idle';
          return;
        }
        if(status) status.textContent='Checkout could not be confirmed. Before paying again, check your PayPal activity or contact support@fitnessworld.pro.';
        paymentStage='idle';
      }
    }).render('#paypal-button-container');

    document.getElementById('nw-close-success')?.addEventListener('click',()=>{
      const m=document.getElementById('nw-purchase-success');
      if(m)m.hidden=true;
    });
  });
})();
