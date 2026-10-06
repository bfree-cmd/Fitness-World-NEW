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
        html:
          `<p>Thanks for requesting your free preview of The 30-Day Natural Wellness Reset.</p>` +
          `<p><a href="${guideUrl}">Open your free preview</a></p>` +
          `<p>Educational wellness information only. Not medical advice.</p>`,
        text:
          `Your free preview of The 30-Day Natural Wellness Reset: ${guideUrl}\n\n` +
          "Educational wellness information only. Not medical advice."
      })
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
