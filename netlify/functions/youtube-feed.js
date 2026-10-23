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
// YouTube occasionally returns 404 for an otherwise valid channel RSS feed.
// Read the public Shorts tab in its default newest-first order in that case.
function parseShorts(html) {
  const match = html.match(/var ytInitialData = ([\s\S]*?);<\/script>/);
  if (!match) return [];
  const data = JSON.parse(match[1]);
  const videos = [];
  const seen = new Set();
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    const short = node.shortsLockupViewModel;
    const legacy = node.reelItemRenderer;
    const id = short?.onTap?.innertubeCommand?.reelWatchEndpoint?.videoId || legacy?.videoId;
    const title = short?.overlayMetadata?.primaryText?.content || legacy?.headline?.simpleText;
    if (/^[\w-]{11}$/.test(id || '') && typeof title === 'string' && title.trim() && !seen.has(id)) {
      seen.add(id);
      videos.push({id, title, published: null});
    }
    Object.values(node).forEach(visit);
  }
  // Only parse the channel's selected tab, never recommendations elsewhere.
  const tabs = data.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
  const tab = tabs.find(item => item.tabRenderer?.selected)?.tabRenderer;
  if (tab) visit(tab.content);
  return videos.slice(0, 3);
}
exports.parseFeed = parseFeed;
exports.parseShorts = parseShorts;
exports.handler = async event => {
  const headers = {'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'public, max-age=300, s-maxage=900', 'X-Content-Type-Options':'nosniff'};
  if (event.httpMethod && event.httpMethod !== 'GET') return {statusCode:405,headers:{...headers,Allow:'GET'},body:JSON.stringify({videos:[]})};
  const channel = String(process.env.YOUTUBE_CHANNEL_ID || DEFAULT_CHANNEL_ID).trim();
  if (!/^UC[\w-]{20,22}$/.test(channel)) return {statusCode:200,headers,body:JSON.stringify({videos:[],available:false})};
  const sources = [
    {url: `https://www.youtube.com/feeds/videos.xml?channel_id=${channel}`, parse: parseFeed, source: 'rss', timeout: 4000},
    {url: `https://www.youtube.com/channel/${channel}/shorts`, parse: parseShorts, source: 'shorts', timeout: 6000}
  ];
  for (const source of sources) {
    try {
      const response = await fetch(source.url, {signal:AbortSignal.timeout(source.timeout)});
      if (!response.ok) continue;
      const videos = source.parse(await response.text());
      if (videos.length) return {statusCode:200,headers,body:JSON.stringify({videos,available:true,source:source.source})};
    } catch {
      // Try the second public source; clients retain their verified snapshot.
    }
  }
  return {statusCode:200,headers:{...headers,'Cache-Control':'public, max-age=60'},body:JSON.stringify({videos:[],available:false})};
};
