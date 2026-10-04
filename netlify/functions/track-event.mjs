const ALLOWED_FIELDS = [
  "event_type","email","product_offer","source_page","source_form","referrer_url",
  "utm_source","utm_medium","utm_campaign","utm_content","utm_term","device",
  "order_id","transaction_id","payment_provider","gross_amount","currency",
  "payment_status","coupon","marketing_consent","capture_source",
  "visitor_session_id","notes"
];

const reply = (status, data) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });

export default async (request, context) => {
  if (request.method !== "POST") {
    return reply(405, { success: false, error: "Method not allowed" });
  }

  const scriptUrl = process.env.FW_TRACKING_SCRIPT_URL;
  const secret = process.env.FW_TRACKING_SECRET;

  if (!scriptUrl || !secret) {
    return reply(503, { success: false, error: "Tracking service not configured" });
  }

  let incoming;
  try {
    incoming = await request.json();
  } catch {
    return reply(400, { success: false, error: "Invalid JSON" });
  }

  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
    return reply(400, { success: false, error: "Invalid payload" });
  }

  const payload = {};
  for (const key of ALLOWED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(incoming, key)) {
      payload[key] = incoming[key];
    }
  }

  payload.country = context?.geo?.country?.code || "";
  payload.region = context?.geo?.subdivision?.code || "";
  payload.tracking_secret = secret;

  try {
    const upstream = await fetch(scriptUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      redirect: "follow"
    });

    const text = await upstream.text();
    let result = {};
    try { result = text ? JSON.parse(text) : {}; } catch {}

    if (!upstream.ok || result.success === false) {
      return reply(502, { success: false, error: "Tracking relay failed" });
    }

    return reply(200, {
      success: true,
      row: result.row || null,
      event_type: result.event_type || payload.event_type || "",
      country: payload.country,
      region: payload.region
    });
  } catch {
    return reply(502, { success: false, error: "Tracking request failed" });
  }
};
