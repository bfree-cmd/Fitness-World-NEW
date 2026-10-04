// deploy-trigger: 2026-10-04 tracking healthcheck
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

const cleanScriptUrl = (value) => {
  const raw = String(value || "").trim();
  const match = raw.match(/https:\/\/script\.google\.com\/macros\/s\/[^\s\]\)]+\/exec/i);
  return match ? match[0] : raw;
};

export default async (request, context) => {
  const scriptUrl = cleanScriptUrl(process.env.FW_TRACKING_SCRIPT_URL);
  const secret = process.env.FW_TRACKING_SECRET || "";

  if (request.method === "GET") {
    return reply(200, {
      success: true,
      service: "Fitness World Event Relay",
      status: "online",
      configured: Boolean(scriptUrl && secret)
    });
  }

  if (request.method !== "POST") {
    return reply(405, { success: false, error: "Method not allowed" });
  }

  if (!scriptUrl || !secret) {
    console.error("Fitness World tracking configuration missing");
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
    try {
      result = text ? JSON.parse(text) : {};
    } catch {
      console.error("Fitness World Apps Script returned non-JSON", text.slice(0, 200));
    }

    if (!upstream.ok || result.success === false) {
      console.error("Fitness World tracking relay failed", upstream.status, result);
      return reply(502, { success: false, error: "Tracking relay failed" });
    }

    return reply(200, {
      success: true,
      row: result.row || null,
      event_type: result.event_type || payload.event_type || "",
      country: payload.country,
      region: payload.region
    });
  } catch (error) {
    console.error("Fitness World tracking request failed", error);
    return reply(502, { success: false, error: "Tracking request failed" });
  }
};
