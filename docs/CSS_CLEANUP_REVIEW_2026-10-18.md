# CSS cleanup review

Draft only. No production merge before visual review.

PurgeCSS scans 209 HTML documents and the site's JavaScript and JSON. Lightning CSS recovers from four existing parser warnings before the purge; no hand deletion of legacy rules was performed. Variables, keyframes and font-face rules remain. Runtime state selectors and data/ARIA selectors are safelisted.

Five supplementary stylesheets are consolidated into site.css: pdf-previews, connect, discussion-compact, spacing-polish and visual-audit-polish. Each rule has a zero-specificity :where predicate matching a marker on the pages that previously loaded that sheet. This avoids activating article or PDF styles across unrelated templates. Other component styles remain separate.

Original main: 773,693 bytes. Original five polish files: 23,252 bytes. Consolidated candidate: 697,066 bytes. Combined reduction: about 12.5%, rather than an assumed reduction to a small fraction.

Reproduce in an isolated worktree using `npm ci`, then `node scripts/build-css-review.mjs ba850324420733a211f7291a3edff312906672b4`. This rebuild replaces HTML from the specified base; do not run over unrelated uncommitted edits.

`compare-css-review.mjs BASELINE_DIRECTORY CANDIDATE_DIRECTORY` captures ten full pages at 390 and 1440 pixels. API calls are mocked, external frames are blocked, and external images use identical placeholders to remove network variability. It checks image pixels, document size and heading/body/control geometry, and fails on any difference. The workflow retains before/after screenshots for review. Real third-party image and YouTube rendering still needs a deploy-preview spot check.

Key pages: home, free preview, Reset, Creatine for Women, creatine hair loss, Women's Health, Live Healthier, Evidence Index, protein calculator and ProDentim review.

The existing full responsive audit also renders all 204 canonical index pages at desktop and mobile sizes. See PR checks for completed results.

This branch starts from the current production baseline independently of the homepage/font branch. Rebuild and rerun comparisons after other typography or stylesheet changes merge; do not overwrite them with this baseline's CSS.
