// Internal link audit: links in/out for every page, plus the interlinking minimums.
// Usage: node scripts/audit-internal-links.mjs [--report] [--json out.json]
// Fails (exit 1) when a content page has fewer than 4 article links inside its article body,
// a money page has fewer than 5 incoming links, or any internal href points to a missing page.
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const skip = new Set(['.git', '.netlify', 'node_modules']);
const pages = new Map(); // route -> html

(function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (ent.name === 'index.html') {
      const rel = path.relative(root, path.dirname(p)).split(path.sep).join('/');
      pages.set(rel ? `/${rel}/` : '/', fs.readFileSync(p, 'utf8'));
    }
  }
})(root);

const MONEY = [
  '/worth-it/prodentim-review/', '/worth-it/prostavive-review/', '/worth-it/spartamax-review/', '/worth-it/nitric-boost-ultra-review/', '/worth-it/',
  '/the-30-day-natural-wellness-reset/', '/checkout/', '/free-guide/',
  '/tools/creatine-guide-calculator/', '/tools/protein-target-calculator/', '/tools/protein-meal-planner/', '/tools/evidence-finder/',
  '/tools/sleep-schedule-planner/', '/tools/hydration-estimate/', '/tools/strength-progress-tracker/', '/tools/supplement-stack-organizer/',
  '/mens-health/', '/womens-health/', '/healthy-aging/', '/sleep-recovery/', '/stay-strong/', '/natural-wellness/', '/glp1-nutrition-muscle/',
  '/supplement-evidence/', '/what-actually-works/', '/choose-smarter/', '/evidence-index/', '/live-healthier/', '/understand-your-data/',
];
// Money pages that are deliberately not linked from content (documented in the PR).
const MONEY_EXCEPTIONS = { '/checkout/': 'noindex payment step; buyers reach checkout inside the Reset page (#nw-checkout)' };

function norm(href) {
  if (!href) return null;
  href = href.replace(/&amp;/g, '&');
  if (href.startsWith('https://fitnessworld.pro/')) href = href.slice('https://fitnessworld.pro'.length);
  if (!href.startsWith('/') || href.startsWith('//') || href.startsWith('/.netlify/')) return null;
  let p = href.split('#')[0].split('?')[0];
  if (!p) return null;
  if (!p.endsWith('/') && !path.extname(p)) p += '/';
  return p;
}
function exists(p) {
  const f = path.join(root, p);
  return fs.existsSync(f) && (fs.statSync(f).isFile() || fs.existsSync(path.join(f, 'index.html')));
}
function stripChrome(html) {
  return html.replace(/<header class="topbar"[\s\S]*?<\/header>/, '').replace(/<footer[\s\S]*?<\/footer>/g, '');
}
function articleBody(html) {
  const m = /<main\b[\s\S]*?(<article\b[^>]*class="[^"]*article-prose[^"]*"[^>]*>)/.exec(html);
  if (!m) return '';
  const start = m.index + m[0].length - m[1].length;
  const re = /<(\/?)article\b[^>]*>/g; re.lastIndex = start; let depth = 0, mm;
  while ((mm = re.exec(html))) { depth += mm[1] ? -1 : 1; if (depth === 0) return html.slice(start, mm.index); }
  return html.slice(start);
}
const hrefs = s => [...s.matchAll(/<a\b[^>]*\shref="([^"]+)"/g)].map(m => m[1]);

const family = new Map(), out = new Map(), inArticle = new Map(), broken = [];
for (const [route, html] of pages) {
  family.set(route, (/data-fw-page-family="([a-z-]+)"/.exec(html) || [])[1] || '');
  const links = new Set();
  for (const h of hrefs(stripChrome(html))) {
    const p = norm(h); if (!p) continue;
    if (!exists(p)) broken.push(`${route} -> ${h}`);
    if (p !== route) links.add(p);
  }
  out.set(route, links);
  inArticle.set(route, new Set(hrefs(articleBody(html)).map(norm).filter(p => p && p !== route)));
}
const content = [...pages.keys()].filter(r => ['article', 'review'].includes(family.get(r))).sort();
const contentSet = new Set(content);
const incoming = new Map();
for (const [route, links] of out) for (const l of links) { if (!incoming.has(l)) incoming.set(l, new Set()); incoming.get(l).add(route); }
const cnt = (set, filter) => [...(set || [])].filter(filter).length;

const rows = [...pages.keys()].sort().map(route => ({
  page: route, family: family.get(route),
  out_internal: out.get(route).size,
  out_articles: cnt(out.get(route), p => contentSet.has(p)),
  article_body_article_links: cnt(inArticle.get(route), p => contentSet.has(p)),
  in_internal: (incoming.get(route) || new Set()).size,
  in_from_content: cnt(incoming.get(route), p => contentSet.has(p)),
}));
const byPage = Object.fromEntries(rows.map(r => [r.page, r]));
const failures = [];
for (const r of content.map(p => byPage[p])) {
  if (r.out_articles < 4) failures.push(`${r.page}: only ${r.out_articles} outgoing article links`);
  if (r.article_body_article_links < 4) failures.push(`${r.page}: only ${r.article_body_article_links} article links inside the article body`);
}
const warnings = [];
for (const m of MONEY) {
  const n = byPage[m]?.in_internal ?? 0;
  if (n >= 5) continue;
  if (MONEY_EXCEPTIONS[m]) warnings.push(`${m}: ${n} incoming (${MONEY_EXCEPTIONS[m]})`);
  else failures.push(`${m}: only ${n} incoming internal links`);
}
for (const b of broken) failures.push(`broken internal href ${b}`);

if (process.argv.includes('--report')) {
  console.log('page\tfamily\tout_internal\tout_articles\tarticle_body_article_links\tin_internal\tin_from_content');
  for (const r of rows) console.log(Object.values(r).join('\t'));
  console.log('\nMoney pages (incoming internal links):');
  for (const m of MONEY) console.log(`  ${m}\t${byPage[m]?.in_internal ?? 0}`);
}
const ji = process.argv.indexOf('--json');
if (ji > 0) fs.writeFileSync(process.argv[ji + 1], JSON.stringify({ rows, money: MONEY.map(m => byPage[m]) }, null, 1));
console.log(`Link audit: ${pages.size} pages, ${content.length} content pages, ${broken.length} broken internal hrefs.`);
for (const w of warnings) console.log('  warning: ' + w);
if (failures.length) { console.error(`Failures (${failures.length}):`); for (const f of failures.slice(0, 200)) console.error('  - ' + f); process.exit(1); }
console.log('Link audit passed.');
