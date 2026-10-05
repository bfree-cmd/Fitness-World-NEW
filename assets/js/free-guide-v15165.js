document.addEventListener("DOMContentLoaded", function () {
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

      // The guide has a direct-download fallback in the existing success modal, so the
      // user-facing success state must not wait on Google Sheets or the mail provider.
      try {
        localStorage.setItem("fwGuideRequested", "1");
        localStorage.setItem("fwGuideEmail", email);
      } catch (_) {}

      window.FWTracking?.track("free_guide_lead", {
        event_id: leadEventId,
        location: idx === 0 ? "free_guide_page" : "free_guide_page_secondary"
      });

      if (btn) { btn.textContent = "GUIDE READY ✓"; btn.disabled = true; }
      if (note) {
        note.textContent = "Your guide is ready to open. Checking email delivery…";
        note.classList.remove("form-error");
      }

      // Open the existing success / paid-PDF upsell immediately.
      requestAnimationFrame(() => setTimeout(openModal, 40));

      // Persist the email through the existing relay and require confirmation.
      const sender = window.FWEventTracking?.send;
      const capture = typeof sender === "function" ? sender("free_pdf_signup", {
        email,
        event_id: leadEventId,
        product_offer: "15 Natural Wellness Habits Worth Knowing",
        source_form: idx === 0 ? "Free Guide Form" : "Free Guide Form Secondary",
        marketing_consent: form.querySelector('input[name="marketing_consent"]:checked') ? "Yes" : "No",
        capture_source: "Website"
      }) : Promise.resolve({ success: false, error: "tracker_not_ready" });
      capture.then(result => {
        if (!result || result.success !== true) {
          console.warn("Fitness World free PDF lead tracking did not confirm", result || {});
        }
      });

      // Email delivery is also background-only. The direct guide link remains available
      // immediately even if the provider is slow or temporarily unavailable.
      const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timeout = setTimeout(() => controller?.abort(), 10000);
      fetch("/.netlify/functions/send-free-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        signal: controller?.signal
      }).then(async mail => {
        const mailData = await mail.json().catch(() => ({}));
        if (!mail.ok || mailData.sent !== true) throw new Error(mailData.detail || mailData.error || ("HTTP " + mail.status));
        if (note) note.textContent = "Guide sent — check your inbox. You can also open it now below.";
        const confirm = modal.querySelector(".fw-offer-confirm span:last-child");
        if (confirm) confirm.textContent = "Your free guide is ready — and we emailed a copy";
      }).catch(err => {
        console.warn("Fitness World guide email delivery delayed", err);
        if (note) note.textContent = "Your guide is ready. Email delivery may be delayed — open it now below.";
      }).finally(() => clearTimeout(timeout));
    });
  });

});

