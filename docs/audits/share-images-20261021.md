# Public-page share-image alignment — 21 October 2026

Scope: all 200 URLs in sitemap.xml. Eight noindex checkout, delivery, redirect and success pages are excluded. This change is independent of email automation and sidebar layout work.

## Selection

- 146 article/review pages: exact displayed featured-image source.
- 13 pages: dedicated hero image.
- 13 hubs/listings: representative image already displayed on that page.
- 28 text-only pages: existing Fitness World icon, using a compact Twitter summary card.

The reviewed mapping is assets/data/share-image-map.json. No new photographs or artwork were selected. All 166 distinct image URLs returned accessible image data, with decoded dimensions and image MIME types. One partial WebP probe required a complete download and then passed.

## Changes

Normalize Open Graph and Twitter image references, HTTPS secure URL, actual dimensions, MIME type and alt text. Synchronize existing page/article/product image fields in head JSON-LD; preserve organization logos and other structured data. Add missing image metadata and remove obsolete image aliases. Preserve canonical URLs, titles, descriptions, body HTML, styles, tracking and video embeds.

193 pages needed a different or missing Open Graph image reference; 195 needed a different or missing Twitter image reference. Existing image references were missing on 21 and 23 pages respectively. Metadata normalization affects all 200 pages.

## Verification

- python scripts/sync-share-images.py: 200 pages pass; featured images agree with manifest; exactly one of each required image property; manifest matches sitemap; no noindex pages included.
- Second synchronization produces zero changes.
- Compared every modified page body against the base commit: all 200 are byte-for-byte unchanged.
- git diff --check passes.
- Full static QA output matches the base commit exactly. Both runs encounter the same locally absent image files because this is a sparse checkout; this is not a passing full-site static QA claim.

## Publication and platform caches

This is a branch-only metadata fix. Production requires a separate merge/deploy. After deployment, Facebook may retain previously scraped previews; use its Sharing Debugger to request another scrape for affected URLs. Existing posts may retain their original previews. Platform-specific crops can differ even when they use the same source image. Actual Facebook-rendered previews have not been verified for this unpublished branch.

For future featured-image changes, review the matching manifest entry and run python scripts/sync-share-images.py --write, then run the checker without --write.
