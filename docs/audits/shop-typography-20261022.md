# Shop layout and shared wordmark — 2026-10-22

The shop now separates Fitness World guides from supplement reviews. The two guide cards use the existing covers; four review cards use the existing product images. Review links are primary, with the original sponsored seller links below. Seller destinations, tracking product keys and link security attributes are preserved. Review buttons now use the existing shop click tracking too.

The shared header reads FITNESS WORLD on desktop and Fitness World on mobile, in the existing self-hosted Source Serif 4 font, without the former tagline. Body copy and controls use the existing Inter font. The shared font rules include heading levels 5 and 6. Every HTML document using site.css receives the new cache version; all 205 documents with the shared wordmark use the same title-case source text and responsive casing. Redirect-only pages keep their existing behavior.

Validation:

- Chromium rendered eight representative page types at 390, 768, 1115, 1280 and 1440 px (40 combinations): shop, homepage, creatine article, men's health article, calculator, tools hub, Reset sales page and affiliate review.
- No document horizontal overflow, wordmark overflow or header-control intersections in those checks. Both fonts loaded successfully.
- All six shop images decoded successfully; guide buttons and review buttons align within each desktop row.
- Mobile navigation opens with aria-expanded=true.
- All 208 non-shop HTML edits match the original documents after accounting for only the shared stylesheet version, wordmark text and tagline removal. Article text, sources, metadata and forms are untouched.
- Internal link audit passes: 208 pages, zero broken internal hrefs. Unchanged preview assets were restored into the sparse local checkout to run this check.
- Share-image verification and git diff --check pass.

The image mockup is an illustrative reference. The implementation retains real product images, including any seller artwork already embedded in them. No replacement AI product artwork is shipped.
