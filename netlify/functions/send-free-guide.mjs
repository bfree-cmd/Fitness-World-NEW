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

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json(405, { sent: false, error: "Method not allowed" }, { Allow: "POST" });
  }

  let body = {};
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { sent: false, error: "Invalid JSON" });
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

  const guideUrl = String(
    process.env.FW_FREE_GUIDE_URL || `${siteUrl()}/fitness-world-30-day-reset-free-preview.pdf`
  ).trim();

  const previewImageUrl = `${siteUrl()}/assets/images/og-free-preview-v188.jpg`;
  let inlinePreviewReady = false;

  let attachments = [];
  let attachmentReady = false;
  try {
    const pdfResponse = await fetch(guideUrl, { cache: "no-store" });
    if (pdfResponse.ok) {
      const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
      if (pdfBuffer.length > 0 && pdfBuffer.length < 35 * 1024 * 1024) {
        attachments = [{
          filename: "Fitness-World-30-Day-Natural-Wellness-Reset-Free-Preview.pdf",
          content: pdfBuffer.toString("base64")
        }];
        attachmentReady = true;
      }
    }
  } catch (error) {
    console.warn("Free guide attachment fetch failed:", error);
  }

  try {
    const imageResponse = await fetch(previewImageUrl, { cache: "no-store" });
    if (imageResponse.ok) {
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      if (imageBuffer.length > 0 && imageBuffer.length < 5 * 1024 * 1024) {
        attachments.push({
          filename: "fitness-world-free-preview.jpg",
          content: imageBuffer.toString("base64"),
          content_id: "fw-free-preview"
        });
        inlinePreviewReady = true;
      }
    }
  } catch (error) {
    console.warn("Free guide inline image fetch failed:", error);
  }

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
        subject: "Your free preview: The 30-Day Natural Wellness Reset",
        html: (() => {
          return `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f1e8;font-family:Arial,Helvetica,sans-serif;color:#172019;">
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
                <p style="margin:0 auto;max-width:520px;font-size:16px;line-height:1.6;color:#55625a;">${attachmentReady ? "Your 5-page Free Preview is attached to this email, and you can also open it online anytime." : "Your 5-page Free Preview is ready, and you can open it online anytime."}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px 10px;text-align:center;">
                <a href="${guideUrl}" style="display:block;text-decoration:none;">
                  ${inlinePreviewReady
                    ? '<img src="cid:fw-free-preview" width="520" height="273" alt="The 30-Day Natural Wellness Reset Free Preview" style="display:block;width:100%;max-width:520px;height:auto;margin:0 auto;border:1px solid #e2e6df;border-radius:12px;">'
                    : '<div style="max-width:520px;margin:0 auto;padding:34px 22px;border-radius:12px;background:#155f50;color:#ffffff;font-size:24px;font-weight:800;line-height:1.15;">THE 30-DAY<br>NATURAL WELLNESS RESET<div style="margin-top:12px;font-size:13px;font-weight:600;opacity:.86;">FREE PREVIEW</div></div>'}
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 32px 6px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr><td style="padding:0 0 8px;font-size:15px;line-height:1.55;color:#334139;font-weight:700;">Inside the preview:</td></tr>
                  <tr><td style="padding:3px 0;font-size:14px;line-height:1.5;color:#4d5a52;">• The 4-Part Meal Method</td></tr>
                  <tr><td style="padding:3px 0;font-size:14px;line-height:1.5;color:#4d5a52;">• Your first 3 challenge days</td></tr>
                  <tr><td style="padding:3px 0;font-size:14px;line-height:1.5;color:#4d5a52;">• A look inside the full 79-page program</td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px 10px;text-align:center;">
                <a href="${guideUrl}" style="display:inline-block;background:#23241f;color:#ffffff;text-decoration:none;font-size:14px;font-weight:800;padding:15px 26px;border-radius:999px;">OPEN THE FULL FREE PREVIEW</a>
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
          `Your free preview of The 30-Day Natural Wellness Reset is ready.\n\n` +
          `${attachmentReady ? "The 5-page PDF is attached to this email. " : ""}You can open it here: ${guideUrl}\n\n` +
          "Inside: The 4-Part Meal Method, your first 3 challenge days, and a look inside the full 79-page program.\n\n" +
          "Educational wellness information only. Not medical advice.\n" +
          "Need help? support@fitnessworld.pro",
        ...(attachments.length ? { attachments } : {})      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("Free guide email failed:", response.status, data?.message || data?.error || "Resend error");
      return json(503, { sent: false, error: "Email delivery is not configured or unavailable" });
    }

    return json(200, { sent: true, id: data.id || null });
  } catch (error) {
    console.error("Free guide email failed:", error);
    return json(503, { sent: false, error: "Email delivery is not configured or unavailable" });
  }
}
