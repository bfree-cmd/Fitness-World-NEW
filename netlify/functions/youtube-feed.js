// Public uploads feed: no browser API key or channel login required.
// Set YOUTUBE_CHANNEL_ID to the verified channel ID in Netlify.
const DEFAULT_CHANNEL_ID = 'UCnsZpFWbcmjJs238LdJ421g';
function decode(value) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (entity, code) => {
      const point = code[0].toLowerCase() === 'x' ? parseInt(code.slice(1),16) : Number(code);
      return point <= 0x10ffff ? String.fromCodePoint(point) : entity;
    }).replace(/&(amp|lt|gt|quot|apos);/g, (_, key) => ({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[key]));
}
function parseFeed(xml) {
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([,entry]) => {
    const tag = name => entry.match(new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`))?.[1] || '';
    return { id: tag('yt:videoId'), title: decode(tag('title')), published: tag('published') };
  }).filter(video => /^[\w-]{11}$/.test(video.id))
    .sort((a,b) => new Date(b.published) - new Date(a.published)).slice(0,3);
}
exports.parseFeed = parseFeed;
exports.handler = async event => {
  const headers = {'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'public, max-age=300, s-maxage=900', 'X-Content-Type-Options':'nosniff'};
  if (event.httpMethod && event.httpMethod !== 'GET') return {statusCode:405,headers:{...headers,Allow:'GET'},body:JSON.stringify({videos:[]})};
  const channel = String(process.env.YOUTUBE_CHANNEL_ID || DEFAULT_CHANNEL_ID).trim();
  if (!/^UC[\w-]{20,22}$/.test(channel)) return {statusCode:200,headers,body:JSON.stringify({videos:[],available:false})};
  try {
    const response = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channel}`, {signal:AbortSignal.timeout(8000)});
    if (!response.ok) throw new Error('Feed unavailable');
    return {statusCode:200,headers,body:JSON.stringify({videos:parseFeed(await response.text()),available:true})};
  } catch {
    return {statusCode:200,headers:{...headers,'Cache-Control':'public, max-age=60'},body:JSON.stringify({videos:[],available:false})};
  }
};
