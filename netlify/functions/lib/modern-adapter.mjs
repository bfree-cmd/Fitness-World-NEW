// Keep the site's existing Lambda-style handlers while using Netlify's modern
// runtime, which provides Blobs configuration to the active request.
export const modernHandler = handler => async request => {
  const url = new URL(request.url);
  const queryStringParameters = Object.fromEntries(url.searchParams);
  const event = {
    httpMethod: request.method,
    headers: Object.fromEntries(request.headers),
    body: request.method === 'GET' || request.method === 'HEAD' ? null : await request.text(),
    isBase64Encoded: false,
    path: url.pathname,
    queryStringParameters,
    rawUrl: request.url
  };
  const result = await handler(event);
  return new Response(result.body ?? '', {
    status: result.statusCode || 200,
    headers: result.headers || {}
  });
};
