import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import rateLimit from './lib/rate-limit.js';
import lifecycle from './lib/reset-email-lifecycle.js';
const {allow:rateAllow,response:rateResponse}=rateLimit;
const json = (statusCode, body, headers = {}) => ({
  statusCode,
  headers: { "content-type": "application/json; charset=utf-8", ...headers },
  body: JSON.stringify(body)
});

const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

const siteUrl = () => {
  const raw = process.env.FW_SITE_URL || "https://fitnessworld.pro";
  return String(raw).replace(/\/$/, "");
};

// Use bundled assets first so email delivery does not wait on a website download.
async function bundledAsset(filename) {
  // Netlify bundles this ESM source as CJS; import.meta.url is not reliable there.
  const candidates = [resolve(process.cwd(), filename), resolve(process.cwd(), 'netlify/functions', filename)];
  for (const candidate of candidates) {
    try { return await readFile(candidate); } catch { /* Try the next bundle location. */ }
  }
  return null;
}
const activeSiteUrl = () => 'https://comforting-marigold-ea2f43.netlify.app';
const validPdf = buffer => buffer && buffer.length < 35 * 1024 * 1024 && buffer.subarray(0, 5).toString() === '%PDF-';

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json(405, { sent: false, error: "Method not allowed" }, { Allow: "POST" });
  }

  const rate = rateAllow(event, { limit: 5, windowMs: 10 * 60 * 1000, key: "free-guide" });
  if (!rate.ok) return rateResponse(rate.retryAfter);

  let body = {};
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { sent: false, error: "Invalid JSON" });
  }

  // The public form already contains a Netlify honeypot; honor it server-side too.
  if (String(body.bot_field || body["bot-field"] || body.website || "").trim()) {
    return json(200, { sent: true, skipped: true });
  }

  const email = String(body.email || "").trim().toLowerCase();
  if (!validEmail(email)) {
    return json(400, { sent: false, error: "Valid email required" });
  }

  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  if (!apiKey) {
    console.error("Free guide email failed: RESEND_API_KEY is not configured");
    return json(503, { sent: false, error: "Email delivery is not configured or unavailable" });
  }

  const configuredFrom = String(
    process.env.RESEND_FROM_EMAIL ||
    process.env.FW_FROM_EMAIL ||
    process.env.FITNESS_WORLD_FROM_EMAIL ||
    ""
  ).trim();

  const from =
    configuredFrom && !/@resend\.dev>?$/i.test(configuredFrom)
      ? configuredFrom
      : "Fitness World <support@fitnessworld.pro>";

  let guideUrl = String(
    process.env.FW_FREE_GUIDE_URL || `${siteUrl()}/fitness-world-30-day-reset-free-preview.pdf`
  ).trim();

  // Keep an explicitly configured live URL when it works; use the active site while
  // the custom-domain migration is pending. This does not change any domain settings.
  try {
    const check = await fetch(guideUrl, { method: 'HEAD', signal: AbortSignal.timeout(2500) });
    if (!check.ok || !/application\/pdf/i.test(check.headers.get('content-type') || '')) {
      guideUrl = `${activeSiteUrl()}/fitness-world-30-day-reset-free-preview.pdf`;
    }
  } catch {
    guideUrl = `${activeSiteUrl()}/fitness-world-30-day-reset-free-preview.pdf`;
  }

  const attachments = [];
  let attachmentReady = false;
  const previewCoverUrl = `${siteUrl()}/assets/images/free-preview-email-cover-20261018.jpg`;
  let pdfBuffer = await bundledAsset('fitness-world-30-day-reset-free-preview.pdf');
  if (!validPdf(pdfBuffer)) {
    try {
      const response = await fetch(guideUrl, { signal: AbortSignal.timeout(4000) });
      if (response.ok) pdfBuffer = Buffer.from(await response.arrayBuffer());
    } catch { /* The working download link remains available. */ }
  }
  if (validPdf(pdfBuffer)) {
    attachments.push({ filename: 'Fitness-World-30-Day-Natural-Wellness-Reset-Free-Preview.pdf', content: pdfBuffer.toString('base64') });
    attachmentReady = true;
  }

  const trackedDownload = placement => {
    const url = new URL(guideUrl);
    url.searchParams.set('utm_source','resend');
    url.searchParams.set('utm_medium','email');
    url.searchParams.set('utm_campaign','reset_welcome_v2');
    url.searchParams.set('utm_content',placement);
    return url.toString();
  };
  // Do not promise tomorrow's follow-up until the production sequence is enabled.
  const followupReady = lifecycle.enabled() && !!lifecycle.postalAddress();
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: "Your free Reset preview is here",
        html: (() => {
          return `
<!doctype html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Your free Reset preview</title></head>
  <body style="margin:0;padding:0;background:#f4f1e8;font-family:Arial,Helvetica,sans-serif;color:#172019;">
    <span style="display:none;font-size:1px;line-height:1px;color:#f4f1e8;max-height:0;overflow:hidden;">Start with Day 1 tonight. It takes 2 minutes.</span>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f1e8;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#ffffff;border:1px solid #dfe6dc;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px 10px;text-align:center;">
                <div style="font-size:12px;font-weight:800;letter-spacing:.12em;color:#2f7a3d;">FITNESS WORLD</div>
                <div style="margin-top:4px;font-size:11px;font-weight:700;color:#657067;">WHAT REALLY WORKS.</div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 8px;text-align:center;">
                <div style="font-size:12px;font-weight:800;letter-spacing:.12em;color:#2f7a3d;">YOUR FREE PREVIEW IS READY</div>
                <h1 style="margin:10px 0 10px;font-size:30px;line-height:1.12;color:#172019;">The 30-Day Natural Wellness Reset</h1>
                <p style="margin:0 auto;max-width:520px;font-size:16px;line-height:1.6;color:#55625a;">Hi there,</p><p style="font-size:16px;line-height:1.6;color:#55625a;">Here's your free preview of The 30-Day Natural Wellness Reset: <a href="${trackedDownload('email_1_intro_download')}" style="color:#2e6c35;">Download your preview</a></p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px 10px;text-align:center;">
                <a href="${trackedDownload('email_1_cover_download')}" style="display:block;text-decoration:none;">
                  <img src="${previewCoverUrl}" width="220" height="285" alt="FREE 5-page preview — The 30-Day Natural Wellness Reset" style="display:block;width:100%;max-width:220px;height:auto;margin:0 auto;border:0;border-radius:8px;">
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 32px 6px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr><td style="padding:0 0 14px;font-size:15px;line-height:1.6;color:#334139;">Inside you'll find how the Reset works, the 4-Part Meal Method, and your first 3 challenge days.</td></tr>
                  <tr><td style="padding:0 0 14px;font-size:15px;line-height:1.6;color:#334139;">You can start tonight. Day 1 is one action: keep water visible where you work or relax. That's it.</td></tr>
                  <tr><td style="padding:0 0 14px;font-size:15px;line-height:1.6;color:#334139;">Then tick the seven quick checks on page 4. It isn't a test. A score is feedback, not a grade.</td></tr>
                  ${followupReady ? '<tr><td style="padding:0 0 14px;font-size:15px;line-height:1.6;color:#334139;">Tomorrow I’ll send you the one meal rule I use every day.</td></tr>' : ''}
                  <tr><td style="padding:0 0 8px;font-size:15px;line-height:1.6;color:#334139;">To your health, Fitness World</td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px 10px;text-align:center;">
                <a href="${trackedDownload('email_1_button_download')}" style="display:inline-block;background:#23241f;color:#ffffff;text-decoration:none;font-size:14px;font-weight:800;padding:15px 26px;border-radius:999px;">OPEN THE FULL FREE PREVIEW</a>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 32px 24px;text-align:center;">
                <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#526158;"><strong>${attachmentReady ? "The PDF is attached to this email." : "Open the PDF using the button above."}</strong></p>
                <p style="margin:0 0 6px;font-size:12px;line-height:1.5;color:#6a746d;">Educational wellness information only. Not medical advice.</p>
                <p style="margin:0;font-size:12px;line-height:1.5;color:#6a746d;">Need help? <a href="mailto:support@fitnessworld.pro" style="color:#2f6b3d;">support@fitnessworld.pro</a></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
        })(),
        text:
          "Start with Day 1 tonight. It takes 2 minutes.\n\nHi there,\n\n" +
          `Here's your free preview of The 30-Day Natural Wellness Reset: ${trackedDownload('email_1_preview_download')}\n\n` +
          "Inside you'll find how the Reset works, the 4-Part Meal Method, and your first 3 challenge days.\n\n" +
          "You can start tonight. Day 1 is one action: keep water visible where you work or relax. That's it.\n\n" +
          "Then tick the seven quick checks on page 4. It isn't a test. A score is feedback, not a grade.\n\n" +
          (followupReady ? "Tomorrow I'll send you the one meal rule I use every day.\n\n" : "") +
          "To your health, Fitness World\n\n" +
          `${attachmentReady ? "The 5-page PDF is attached to this email.\n\n" : ""}` +
          "Educational wellness information only. Not medical advice.\nNeed help? support@fitnessworld.pro",
        ...(attachments.length ? { attachments } : {})      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("Free guide email failed:", response.status, data?.message || data?.error || "Resend error");
      return json(503, { sent: false, error: "Email delivery is not configured or unavailable" });
    }

    // Queue the requested four-part series after the provider accepts delivery; preserve the separate newsletter checkbox.
    // Enrollment failure must never change a successfully delivered PDF into an error.
    try { await lifecycle.queuePreview({email,consent:body.marketing_consent,consentVersion:body.consent_version,deliveryId:data.id,source:body.source}); }
    catch (_) { console.error('[Fitness World] confirmed preview enrollment could not be queued'); }
    return json(200, { sent: true, id: data.id || null });
  } catch (error) {
    console.error("Free guide email failed:", error);
    return json(503, { sent: false, error: "Email delivery is not configured or unavailable" });
  }
}
