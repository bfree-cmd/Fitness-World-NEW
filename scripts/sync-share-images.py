#!/usr/bin/env python3
"""Keep server-rendered sharing metadata aligned with reviewed page images.

Run without flags to check; --write applies the reviewed image manifest.
No body HTML, text, links, layout, or organization logos are modified.
"""
import argparse
import html
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.parse import urljoin
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'assets/data/share-image-map.json'
IMAGE_KEYS = {'og:image', 'og:image:url', 'og:image:secure_url', 'og:image:type',
              'og:image:width', 'og:image:height', 'og:image:alt',
              'twitter:image', 'twitter:image:src', 'twitter:image:alt', 'twitter:card'}
PAGE_TYPES = {'Article', 'BlogPosting', 'NewsArticle', 'Review', 'WebPage',
              'MedicalWebPage', 'CollectionPage', 'Product'}

class Tags(HTMLParser):
    def __init__(self):
        super().__init__()
        self.meta = {}
        self.featured = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'meta':
            key = attrs.get('property', attrs.get('name', '')).lower()
            self.meta.setdefault(key, []).append(attrs.get('content', ''))
        if tag == 'img' and 'article-feature-img-fixed' in attrs.get('class', '').split():
            self.featured.append(urljoin('https://fitnessworld.pro', attrs['src']))

def image_schema(value, url):
    if isinstance(value, str):
        return url
    if isinstance(value, list):
        return [image_schema(v, url) for v in value]
    if isinstance(value, dict):
        result = dict(value)
        for key in ('url', 'contentUrl', '@id'):
            if key in result:
                result[key] = url
        # Existing dimensions/captions might describe the obsolete image.
        for key in ('width', 'height', 'caption'):
            result.pop(key, None)
        return result
    return value

def schema_images(data, row):
    if isinstance(data, list):
        return [schema_images(v, row) for v in data]
    if not isinstance(data, dict):
        return data
    result = dict(data)
    types = result.get('@type', [])
    types = [types] if isinstance(types, str) else types
    if set(types) & PAGE_TYPES:
        for key in ('image', 'primaryImageOfPage'):
            if key in result:
                result[key] = image_schema(result[key], row['image'])
    if '@graph' in result:
        result['@graph'] = schema_images(result['@graph'], row)
    return result

def update(source, row):
    head, body = source.split('</head>', 1)
    def remove_image_tag(match):
        tags = Tags()
        tags.feed(match.group())
        return '' if set(tags.meta) & IMAGE_KEYS else match.group()
    head = re.sub(r'<meta\b[^>]*>', remove_image_tag, head, flags=re.I)
    def update_schema(match):
        data = json.loads(match.group(2))
        changed = schema_images(data, row)
        if changed == data:
            return match.group()
        return match.group(1) + json.dumps(changed, ensure_ascii=False, separators=(',', ':')) + match.group(3)
    head = re.sub(r'(<script\b[^>]*type=["\']application/ld\+json["\'][^>]*>)(.*?)(</script>)',
                  update_schema, head, flags=re.S | re.I)
    esc = lambda value: html.escape(str(value), quote=True)
    values = {'og:image': row['image'], 'og:image:secure_url': row['image'],
              'og:image:type': row['type'], 'og:image:width': row['width'],
              'og:image:height': row['height'], 'og:image:alt': row['alt'],
              'twitter:card': 'summary' if row['selection'] == 'brand-fallback' else 'summary_large_image',
              'twitter:image': row['image'], 'twitter:image:alt': row['alt']}
    block = '\n'.join(f'<meta {"property" if key.startswith("og:") else "name"}="{key}" content="{esc(value)}"/>' for key, value in values.items())
    # Use one stable insertion point, making repeated synchronization idempotent.
    head = re.sub(r'\n{3,}', '\n\n', head).rstrip() + '\n' + block + '\n'
    return head + '</head>' + body

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true')
    args = parser.parse_args()
    rows = json.loads(MANIFEST.read_text())
    routes = {row['route'] for row in rows}
    sitemap = {url.removeprefix('https://fitnessworld.pro') for url in ET.parse(ROOT / 'sitemap.xml').getroot().itertext() if url.startswith('https://fitnessworld.pro')}
    assert routes == sitemap, f'Manifest/sitemap mismatch: {routes ^ sitemap}'
    errors = []
    changed = 0
    for row in rows:
        path = ROOT / row['path']
        original = path.read_text()
        tags = Tags()
        tags.feed(original)
        assert not any('noindex' in v for v in tags.meta.get('robots', [])), row['route']
        if row['selection'] == 'featured':
            assert tags.featured == [row['image']], f'Featured image changed: {row["route"]}; review manifest'
        assert row['image'].startswith('https://') and row['width'] > 0 and row['height'] > 0
        result = update(original, row)
        assert original.split('</head>', 1)[1] == result.split('</head>', 1)[1], row['route']
        if result != original:
            changed += 1
            if args.write:
                path.write_text(result)
            else:
                errors.append(row['route'])
        checked = Tags()
        checked.feed(result)
        for key in IMAGE_KEYS - {'og:image:url', 'twitter:image:src'}:
            assert len(checked.meta.get(key, [])) == 1, (row['route'], key)
        assert checked.meta['og:image'] == checked.meta['twitter:image'] == [row['image']]
    if errors:
        raise SystemExit(f'{len(errors)} pages need synchronization; run python scripts/sync-share-images.py --write')
    print(f'PASS: {len(rows)} public pages; {changed} updated; body HTML preserved; sharing images match manifest')

if __name__ == '__main__':
    main()
