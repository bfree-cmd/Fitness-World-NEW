(function () {
  'use strict';
  if (window.__FW_PREVIEW_POPUP__) return;
  window.__FW_PREVIEW_POPUP__ = true;
  const excluded = /^\/(free-guide|natural|checkout|contact|thank-you|success|unsubscribe|prelaunch|go)(\/|$)/;
  if (excluded.test(location.pathname) || /404|success|thank-you/.test(location.pathname)) return;
  const dismissKey = 'fwPreviewPopupDismissedAt';
  const saved = key => { try { return localStorage.getItem(key); } catch (_) { return null; } };
  const save = (key, value) => { try { localStorage.setItem(key, value); } catch (_) {} };
  if (saved('fwGuideRequested') || Date.now() - Number(saved(dismissKey) || 0) < 7 * 86400000) return;
  const css = document.createElement('link');
  css.rel = 'stylesheet'; css.href = '/assets/css/free-preview-popup.css?v=20261014'; document.head.appendChild(css);
  let elapsed = false, shown = false, previousFocus;
  function open() {
    if (shown || !elapsed || document.hidden || saved('fwGuideRequested')) return;
    const height = document.documentElement.scrollHeight - innerHeight;
    if (height > 0 && scrollY / height < 0.4) return;
    if (document.activeElement?.matches('input,textarea,select') || document.querySelector('[aria-modal="true"]:not([hidden])')) return;
    shown = true; previousFocus = document.activeElement;
    const overlay = document.createElement('div'); overlay.className = 'fw-preview-overlay';
    overlay.innerHTML = `<section class="fw-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="fw-preview-title"><button class="fw-preview-close" type="button" aria-label="Close free preview popup">×</button><div class="fw-preview-art"><img src="/assets/images/free-preview-cover-v188.webp" alt="The 30-Day Natural Wellness Reset — Free Preview" width="1024" height="1325"></div><div class="fw-preview-copy"><div class="fw-preview-heading"><h2 id="fw-preview-title">A simpler wellness routine starts here.</h2><p class="fw-preview-intro">Get the free 5-page Reset preview.</p></div><form id="fw-preview-popup-form"><label class="fw-preview-sr" for="fw-preview-popup-email">Your email address</label><input id="fw-preview-popup-email" name="email" type="email" autocomplete="email" placeholder="Your email address" maxlength="160" required><div class="fw-preview-trap" aria-hidden="true"><label>Leave this empty<input name="website" tabindex="-1" autocomplete="off"></label></div><button class="fw-preview-submit" type="submit">SEND ME THE FREE PDF</button><label class="fw-preview-consent"><input type="checkbox" name="marketing_consent"><span>Also email me Fitness World updates.</span></label><p class="fw-preview-note">Email updates are optional.</p><p class="fw-preview-status" role="status" aria-live="polite"></p></form><a class="fw-preview-download" href="/fitness-world-30-day-reset-free-preview.pdf" target="_blank" rel="noopener" hidden>OPEN YOUR FREE PREVIEW</a></div></section>`;
    document.body.appendChild(overlay);
    const oldOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const dialog = overlay.querySelector('.fw-preview-dialog');
    const form = overlay.querySelector('form');
    const closeButton = overlay.querySelector('.fw-preview-close');
    function close() { save(dismissKey, String(Date.now())); overlay.remove(); document.body.style.overflow = oldOverflow; document.removeEventListener('keydown', keys); previousFocus?.focus(); }
    function keys(e) {
      if (e.key === 'Escape') close();
      if (e.key !== 'Tab') return;
      const items = [...dialog.querySelectorAll('button,input,a[href]')].filter(el => !el.disabled && el.getClientRects().length);
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    closeButton.addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', keys); closeButton.focus();
    window.FWTracking?.track('free_preview_popup_view', { location: location.pathname });
    form.addEventListener('submit', async e => {
      e.preventDefault(); if (!form.reportValidity()) return;
      const button = form.querySelector('.fw-preview-submit'); if (button.disabled) return;
      const email = form.elements.email.value.trim().toLowerCase();
      const status = form.querySelector('.fw-preview-status');
      button.disabled = true; button.textContent = 'SENDING…'; status.textContent = ''; status.classList.remove('is-error');
      const consent = form.elements.marketing_consent.checked ? 'Yes' : 'No';
      const bot = form.elements.website.value;
      if (!bot) {
        window.FWEventTracking?.send('free_pdf_signup', { email, event_id: 'fw_popup_' + Date.now(), product_offer: '30-Day Natural Wellness Reset — Free Preview', source_form: 'Free Preview Popup', marketing_consent: consent, capture_source: 'Website Popup' }).catch(() => {});
      }
      const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 20000);
      try {
        const response = await fetch('/.netlify/functions/send-free-guide', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, website: bot }), signal: controller.signal });
        const data = await response.json();
        if (!response.ok || data.sent !== true) throw new Error('Email unavailable');
        status.textContent = 'Preview sent — check your inbox and spam folder.';
        button.textContent = 'PREVIEW SENT';
        if (!data.skipped) {
          save('fwGuideRequested', '1'); save('fwGuideEmail', email);
          window.FWTracking?.track('free_preview_popup_signup', { location: location.pathname, marketing_consent: consent });
          overlay.querySelector('.fw-preview-download').hidden = false;
        }
      } catch (_) {
        status.textContent = 'We couldn’t confirm email delivery. Try again, or open the preview below.';
        status.classList.add('is-error'); button.disabled = false; button.textContent = 'SEND ME THE FREE PDF';
        if (!bot) overlay.querySelector('.fw-preview-download').hidden = false;
      } finally { clearTimeout(timeout); }
    });
    window.removeEventListener('scroll', open);
  }
  window.addEventListener('scroll', open, { passive: true });
  document.addEventListener('visibilitychange', open);
  setTimeout(() => { elapsed = true; open(); }, 5000);
})();
