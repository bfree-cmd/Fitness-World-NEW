// Netlify invokes this event function only for verified form submissions.
exports.handler = async event => {
  const { payload = {} } = JSON.parse(event.body || '{}');
  if (payload.form_name !== 'contact') return { statusCode: 200, body: 'Ignored' };
  const endpoint = process.env.FW_COMMENTS_SHEET_ENDPOINT;
  const secret = process.env.FW_COMMENTS_SHEET_SECRET;
  if (!endpoint || !secret) throw new Error('Contact sheet configuration missing');
  const data = payload.data || {};
  const response = await fetch(endpoint, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'contact', comments_secret: secret,
      contact_id: payload.id, received_at: payload.created_at,
      name: data.name, email: data.email, subject: data.subject, message: data.message }),
    signal: AbortSignal.timeout(25000)
  });
  if (!response.ok) throw new Error('Contact sheet request failed');
  const result = await response.json();
  if (result.success !== true) throw new Error('Contact sheet rejected submission');
  console.log('[FW contact] Saved to Contact Messages');
  return { statusCode: 200, body: 'Saved' };
};
