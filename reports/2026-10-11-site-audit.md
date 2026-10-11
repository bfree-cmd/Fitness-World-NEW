# Fitness World site audit — 11 October 2026

## Scope and completed checks

- All 208 repository HTML pages: 17,186 internal links, 1,989 image elements,
  393 JSON-LD blocks, titles, viewport tags and local CSS/JS references.
- JavaScript syntax: 262 standalone and inline scripts; no syntax errors.
- Live desktop DOM/layout inspection at a 1363px viewport: 204 repository routes,
  plus the redirected historical Healthy Aging Evidence Project route. The four
  `/go/` affiliate routing pages were inspected in source, without generating
  synthetic seller clicks. This is rendered geometry checking, not a manual
  screenshot review of every section on every page.
- No document-wide horizontal overflow found in those live desktop inspections.
- Loaded, visible images checked during navigation. This does not guarantee every
  lazy image far below the fold or every third-party image will load consistently.
- Homepage typeahead, header search and full search returned relevant creatine or
  magnesium results. Evidence Finder returned two magnesium claims.
- Default calculator results exercised for protein, creatine, hydration, sleep,
  strength tracking and protein meal distribution; no NaN result observed.
- Stack Organizer and Evidence Finder loaded their initial interfaces.
- Checkout redirected to the Natural page; contact success, thank-you and 404
  documents rendered. Existing live QA passed security headers, GA4 loader,
  tracking service health and live PayPal configuration. No purchase was made.

## Fixes in this commit

1. Reset sales-page heading: line-height 1.12, slightly lighter negative letter
   spacing, more space before the description. This changes webpage CSS only.
2. Scoped heading margins for Healthy Aging project callouts, protein affiliate
   boxes, growth strips, related review cards and sources. The baseline found
   60.9px heading margins inside these cards on 28 pages. The new shared stylesheet
   is included on 31 affected pages, including related templates and the sales page.
3. LDL cholesterol article hero: replaced a confirmed failing external Pexels
   image with an existing local meal photo and descriptive alternative text.
4. Protein, creatine and hydration calculators: reject missing/out-of-range body
   weights instead of silently clamping invalid inputs to a usable estimate.
   Bounds now follow kg/lb selection, and decimal body weights remain accepted.
   Hydration also checks exercise minutes; Sleep Planner rejects a blank wake time.
   Invalid inputs no longer flash the misleading UPDATED confirmation.
5. Static QA: fixed a false warning caused by assuming robots meta attributes
   always appeared in a particular order. Seven correctly noindexed pages no
   longer produce misleading missing-canonical warnings.

## Verification

- Static QA passed after edits. 246 legacy Pexels-cache references remain warnings;
  the site uses external fallbacks, so absence from the checkout does not by itself
  mean those images are broken on production.
- Four calculator regression checks passed: valid default results, rejected
  invalid inputs, unchanged previous output on validation failure, kg/lb bounds.
- Changed calculator JavaScript syntax passed.
- Baseline desktop observations are in `2026-10-11-desktop-audit.json`.

## Remaining verification and limitations

- Full mobile rendering is not verified. The local Chromium installer returned
  invalid/truncated download archives; the available cloud browser exposes a
  desktop viewport with no supported resize control. Do not describe this as a
  completed desktop-and-mobile visual audit.
- Every-page screenshots, all below-fold lazy images, print/share interactions,
  screen-reader traversal and performance profiling still need deeper inspection.
- Mail delivery, unsubscribe/consent, reply notification email, contact inbox
  notifications, external GA4/Meta receipt and ClickBank attribution were not
  end-to-end tested in this pass. Working Sheets was confirmed by the user.
- No domain settings, paid PDF, checkout/payment functions, contact/comment
  receiver, tracking implementation or Apps Script code changed in this commit.

## Production verification after commit 2102d81

- New stylesheet loaded on production. Reset heading measured 64.88px line height
  at 57.93px font size, with 20px below the heading.
- Rechecked all 28 previously flagged pages: zero remaining oversized margins in
  the targeted card/source headings.
- Repaired cholesterol hero loaded from the local asset with natural width 960px.
- Live protein calculator rejected 0 kg, retained the previous estimate and did
  not show UPDATED. Switching to lb changed limits to 77–550; 165 lb returned a
  valid 105–120 g estimate.
