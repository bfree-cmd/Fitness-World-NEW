(function () {
  'use strict';
  if (window.__FW_EVENT_TRACKING__) return;
  window.__FW_EVENT_TRACKING__ = true;

  const ENDPOINT = '/.netlify/functions/track-event';
  const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  const MAX = 500;
  const recent = new Map();

  const clean = (value, max = MAX) => String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, max);
  const storeCall = (which, method, key, value) => {
    try {
      const store = which === 'session' ? window.sessionStorage : window.localStorage;
      return store[method](key, value);
    } catch (_) { return null; }
  };
  const uuid = () => {
    try { if (crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID(); } catch (_) {}
    return 'fw_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 12);
  };

  function persistentId() {
    let id = storeCall('local', 'getItem', 'fw_visitor_id');
    if (!id) {
      id = uuid();
      storeCall('local', 'setItem', 'fw_visitor_id', id);
    }
    return id;
  }

  function sessionId() {
    let id = storeCall('session', 'getItem', 'fw_session_id');
    if (!id) {
      id = uuid();
      storeCall('session', 'setItem', 'fw_session_id', id);
    }
    return id;
  }

  function rememberAttribution() {
    const params = new URLSearchParams(location.search);
    UTM_KEYS.forEach((key) => {
      const v = clean(params.get(key), 300);
      if (v) storeCall('local', 'setItem', 'fw_' + key, v);
    });
    if (!storeCall('local', 'getItem', 'fw_first_landing')) {
      storeCall('local', 'setItem', 'fw_first_landing', clean(location.href, 1000));
    }
    if (document.referrer && !storeCall('local', 'getItem', 'fw_first_referrer')) {
      storeCall('local', 'setItem', 'fw_first_referrer', clean(document.referrer, 1000));
    }
  }

  function attribution() {
    const out = {};
    UTM_KEYS.forEach((key) => { out[key] = clean(storeCall('local', 'getItem', 'fw_' + key), 300); });
    out.referrer_url = clean(document.referrer || storeCall('local', 'getItem', 'fw_first_referrer'), 1000);
    return out;
  }

  function device() {
    const ua = navigator.userAgent || '';
    if (/ipad|tablet/i.test(ua) || (navigator.maxTouchPoints > 1 && /macintosh/i.test(ua))) return 'Tablet';
    if (/mobi|android|iphone|ipod/i.test(ua) || innerWidth <= 760) return 'Mobile';
    return 'Desktop';
  }

  function context() {
    return Object.assign({
      source_page: clean(location.pathname, 500),
      device: device(),
      capture_source: 'Website',
      visitor_session_id: 'v:' + persistentId() + '|s:' + sessionId()
    }, attribution());
  }

  function dedupeKey(eventType, detail) {
    return [eventType, detail.product_offer || '', detail.source_form || '', detail.email || '', detail.order_id || ''].map(v => clean(v, 100)).join('|');
  }

  function shouldSend(eventType, detail) {
    const key = dedupeKey(eventType, detail);
    const now = Date.now();
    const last = recent.get(key) || 0;
    recent.set(key, now);
    return now - last > 750;
  }

  function send(eventType, detail = {}) {
    const payload = Object.assign({}, context(), detail, { event_type: eventType });
    if (!shouldSend(eventType, payload)) return Promise.resolve({ skipped: true });
    const body = JSON.stringify(payload);

    // sendBeacon keeps click/submission events alive during navigation.
    try {
      if (detail.__beacon && navigator.sendBeacon) {
        const ok = navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
        if (ok) return Promise.resolve({ queued: true });
      }
    } catch (_) {}

    return fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      credentials: 'same-origin',
      keepalive: true,
      cache: 'no-store'
    }).then(r => r.json().catch(() => ({}))).catch(() => ({}));
  }

  function formEmail(selector) {
    const el = document.querySelector(selector);
    return clean(el && el.value, 320).toLowerCase();
  }

  function inferAffiliate(a) {
    const raw = a.getAttribute('href') || '';
    let path = '';
    try { path = new URL(raw, location.href).pathname; } catch (_) {}
    const go = path.match(/^\/go\/([^/]+)\/?/i);
    const product = clean(a.dataset.affiliate || (go && go[1]) || a.dataset.product || '', 150);
    let network = clean(a.dataset.network || '', 100);
    if (!network) {
      if (/hop\.clickbank\.net/i.test(raw) || go) network = 'ClickBank';
      else if (/digistore|advancedbionutritionals|#aff=/i.test(raw)) network = 'Digistore24';
      else network = 'Other';
    }
    return { product, network, destination: clean(raw, 1000) };
  }

  function mirrorExistingTracker() {
    const fw = window.FWTracking;
    if (!fw || typeof fw.track !== 'function' || fw.track.__fwSheetWrapped) return;
    const original = fw.track.bind(fw);
    const wrapped = function (name, params) {
      const result = original(name, params || {});
      const p = params || {};
      if (name === 'free_guide_lead') {
        const email = clean(storeCall('local', 'getItem', 'fwGuideEmail') || formEmail('#free-guide-email-input') || formEmail('#free-guide-email-input-2'), 320).toLowerCase();
        send('free_pdf_signup', {
          email,
          product_offer: '15 Natural Wellness Habits Worth Knowing',
          source_form: clean(p.location || 'Free Guide Form', 200),
          marketing_consent: document.querySelector((p.location === 'free_guide_page_secondary' ? '#free-guide-download-form-2' : '#free-guide-download-form') + ' input[name="marketing_consent"]:checked') ? 'Yes' : 'No',
          capture_source: 'Netlify Form'
        });
      } else if (name === 'evidence_project_updates_signup') {
        send('evidence_project_updates', {
          email: formEmail('[data-ep-signup] input[type="email"]'),
          product_offer: clean(p.project_id || 'Evidence Projects', 200),
          source_form: 'Evidence Project Updates',
          marketing_consent: document.querySelector('[data-ep-signup] input[name="marketing_consent"]:checked') ? 'Yes' : 'No'
        });
      } else if (name === 'encyclopedia_checkout_start') {
        send('paid_pdf_click', {
          email: formEmail('#nw-purchase-email'),
          product_offer: 'Natural Wellness Encyclopedia',
          source_form: 'PayPal Checkout',
          payment_provider: 'PayPal',
          gross_amount: Number(p.value || 9.99),
          currency: clean(p.currency || 'USD', 12)
        });
      } else if (name === 'encyclopedia_cta_click') {
        send('cta_click', {
          product_offer: 'Natural Wellness Encyclopedia',
          source_form: clean(p.placement || 'Encyclopedia CTA', 200)
        });
      } else if (name === 'cta_click') {
        send('cta_click', {
          product_offer: clean(p.destination || '', 500),
          source_form: clean(p.cta_text || 'CTA', 200)
        });
      }
      return result;
    };
    wrapped.__fwSheetWrapped = true;
    fw.track = wrapped;
  }

  rememberAttribution();
  mirrorExistingTracker();

  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    const rel = a.getAttribute('rel') || '';
    const isAffiliate = a.classList.contains('fw-affiliate-link') || /^\/go\//i.test(href) || /hop\.clickbank\.net/i.test(href) || /\bsponsored\b/i.test(rel);
    if (!isAffiliate) return;
    // On /go/ pages, the inbound click was already recorded on the source page.
    if (/^\/go\//.test(location.pathname) && !a.classList.contains('fw-affiliate-link')) return;
    const info = inferAffiliate(a);
    send('affiliate_click', {
      product_offer: info.product || clean(a.textContent, 150) || 'Affiliate Offer',
      source_form: clean(a.dataset.placement || a.textContent || 'Affiliate CTA', 200),
      notes: 'Network: ' + info.network + (info.destination ? ' | Destination: ' + info.destination : ''),
      __beacon: true
    });
  }, { capture: true, passive: true });

  // Future native newsletter forms are tracked without touching contact/search/tool forms.
  document.addEventListener('submit', (e) => {
    const form = e.target;
    if (!(form instanceof HTMLFormElement)) return;
    const name = clean(form.getAttribute('name') || form.id || '', 150).toLowerCase();
    if (!/newsletter/.test(name)) return;
    const input = form.querySelector('input[type="email"]');
    const email = clean(input && input.value, 320).toLowerCase();
    if (!email) return;
    send('newsletter_signup', {
      email,
      source_form: clean(form.getAttribute('name') || form.id || 'Newsletter Form', 200),
      marketing_consent: form.querySelector('input[name="marketing_consent"]:checked') ? 'Yes' : 'No',
      __beacon: true
    });
  }, { capture: true });

  // Page View is intentionally anonymous unless the visitor has separately supplied an email.
  send('page_view', { source_form: 'Page View' });

  window.FWEventTracking = Object.freeze({ send, context });
})();
