document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll('input[name="marketing_consent"]').forEach(input=>{
    const label=input.closest('label'); if(!label) return;
    const span=label.querySelector('span'); if(span) span.textContent="Optional: also send me occasional Fitness World evidence updates and offers after the series. Unsubscribe anytime.";
    if(!label.previousElementSibling?.classList.contains('fw-series-disclosure')){
      const note=document.createElement('p'); note.className='fw-series-disclosure';
      note.style.fontSize='12px'; note.style.lineHeight='1.5'; note.textContent="Your free preview includes four follow-up emails with tips and offers over 9 days. Unsubscribe anytime.";
      label.before(note);
    }
  });

  const trigger = document.getElementById("open-free-guide-form");
  const gate = document.getElementById("free-guide-email");
  const forms = Array.from(document.querySelectorAll("#free-guide-download-form, #free-guide-download-form-2"));
  const modal = document.getElementById("free-guide-success");

  function revealPrimaryGate(opts = {}) {
    if (!gate) return;
    gate.hidden = false;
    const anchor = document.getElementById("get-guide") || gate;
    anchor.scrollIntoView({ behavior: opts.instant ? "auto" : "smooth", block: "start" });
    if (opts.focus) {
      const email = document.getElementById("free-guide-email-input");
      if (email) setTimeout(() => email.focus(), 250);
    }
  }

  if (trigger && gate) {
    trigger.addEventListener("click", e => {
      e.preventDefault();
      revealPrimaryGate({ focus: true });
      window.FWTracking?.track("free_guide_form_start", { location: "free_guide_page" });
    });
  }

  if (gate && (location.hash === "#get-guide" || location.hash === "#free-guide-email")) {
    requestAnimationFrame(() => revealPrimaryGate({ instant: true, focus: false }));
  }

  if (!forms.length || !modal) return;
  const closeBtn = modal.querySelector(".fw-offer-close");

  function closeModal() {
    modal.classList.remove("open");
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("fw-modal-open");
  }
  function openModal() {
    // Keep the shared dialog visible when the secondary form submits while the primary gate is hidden.
    if (modal.parentElement !== document.body) document.body.appendChild(modal);
    modal.hidden = false;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("fw-modal-open");
    setTimeout(() => document.getElementById("free-guide-encyclopedia-cta")?.focus(), 80);
  }

  closeBtn?.addEventListener("click", closeModal);
  modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && modal.classList.contains("open")) closeModal(); });

  forms.forEach((form, idx) => {
    form.addEventListener("submit", e => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const input = form.querySelector('input[type="email"]');
      const email = (input?.value || "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { input?.focus(); return; }

      // Lock the form immediately so one click cannot generate duplicate submissions.
      if (btn?.disabled) return;
      if (btn) { btn.disabled = true; btn.textContent = "SENDING…"; }

      const note = form.querySelector(".guide-email-note") || form.closest(".guide-email-card")?.querySelector(".guide-email-note");
      const attr = window.FWTracking?.attribution?.() || {};
      const leadEventId = "fw_lead_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);


      if (note) {
        note.textContent = "Sending your free preview…";
        note.classList.remove("form-error");
      }

      // Persist the email through the existing relay and require confirmation.
      const sender = window.FWEventTracking?.send;
      const capture = typeof sender === "function" ? sender("free_pdf_signup", {
        email,
        event_id: leadEventId,
        product_offer: "30-Day Natural Wellness Reset — Free Preview",
        source_form: idx === 0 ? "Free Guide Form" : "Free Guide Form Secondary",
        marketing_consent: form.querySelector('input[name="marketing_consent"]:checked') ? "Yes" : "No",
        capture_source: "Website"
      }) : Promise.resolve({ success: false, error: "tracker_not_ready" });
      capture.then(result => {
        if (!result || result.success !== true) {
          console.warn("Fitness World free PDF lead tracking did not confirm", result || {});
        }
      });

      // Confirm provider acceptance before showing the emailed-preview success state.
      const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timeout = setTimeout(() => controller?.abort(), 10000);
      const botField = form.querySelector('input[name="bot-field"]')?.value || "";
      fetch("/.netlify/functions/send-free-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, bot_field: botField, marketing_consent: !!form.querySelector('input[name="marketing_consent"]:checked'), consent_version: 'reset-welcome-v1', source: 'free_guide' }),
        signal: controller?.signal
      }).then(async mail => {
        const mailData = await mail.json().catch(() => ({}));
        if (!mail.ok || mailData.sent !== true) throw new Error(mailData.detail || mailData.error || ("HTTP " + mail.status));
        window.FWTracking?.confirmPreviewLead(mailData, { event_id: leadEventId, location: idx === 0 ? "free_guide_page" : "free_guide_page_secondary" });
        try {
          localStorage.setItem("fwGuideRequested", "1");
          localStorage.setItem("fwGuideEmail", email);
        } catch (_) {}
        if (btn) btn.textContent = "PREVIEW SENT ✓";
        if (note) note.textContent = "Free preview sent — check your inbox and spam folder.";
        const confirm = modal.querySelector(".fw-offer-confirm span:last-child");
        if (confirm) confirm.textContent = "Your free preview has been emailed";
        const choice = modal.querySelector(".fw-offer-choice-note");
        if (choice) choice.textContent = "Check your inbox and spam folder for your 5-page PDF. If it does not arrive, contact support@fitnessworld.pro.";
        openModal();
      }).catch(err => {
        console.warn("Fitness World guide email delivery delayed", err);
        if (btn) { btn.textContent = "TRY AGAIN"; btn.disabled = false; }
        if (note) {
          note.textContent = "We could not confirm the email was sent. Please check your address and try again, or contact support@fitnessworld.pro.";
          note.classList.add("form-error");
        }
      }).finally(() => clearTimeout(timeout));
    });
  });

});

