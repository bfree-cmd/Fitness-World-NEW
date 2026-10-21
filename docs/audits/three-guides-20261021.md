# Creatine/protein guide improvements and saved layout fixes

21 October 2026. Based on main after PR #73.

## Article changes

- Creatine vs Protein Powder: direct opening answer, comparison table, practical decision sequence and contextual links to the other two guides and relevant calculators.
- Creatine for Women: concise evidence/limitations table and next-step links. Existing menopause, hair, bloating, dose and safety sections remain intact.
- Protein Powder vs Food: direct opening answer, comparison table, cost-per-equivalent-protein method and practical planning links. The shopping example is not a suggested intake target or a live price claim.

Tables use captions, column/row headers, keyboard-focusable overflow regions, scoped responsive styling and print rules. Horizontal table scrolling is contained within the article column. All three article dates now reflect this edit.

Corrected the two comparison pages' mislabeled protein meta-analysis source: PMID 29497353 is a per-meal protein review; Morton et al.'s resistance-training meta-analysis is PMID 28698222. Added the existing ISSN creatine position stand to the comparison reference list and NIH ODS guidance to the food comparison. Visible reference counts match 3, 7 and 5 entries.

Sources checked for these additions: NIH ODS exercise/performance fact sheet; Morton et al., doi:10.1136/bjsports-2017-097608; ISSN creatine position stand, doi:10.1186/s12970-017-0173-z; Texas A&M's record of the 2026 postmenopausal-women meta-analysis; the existing hair-outcome trial. PubMed/PMC direct retrieval was limited on some pages; indexed abstracts and publisher/institutional records were used where available. Existing numerical claims were not rewritten.

## Saved layout fixes

- Shop: the primary button occupies the same grid row in every product card, with a consistent row below for review links. Prices, destinations, tracking and card content are unchanged.
- Creatine calculator: center the result vertically against the taller input panel above 800px. Keep the existing stacked phone layout and sticky positioning.

The article-sidebar Shorts mockup is separate and is not implemented by this change.

## Checks

- All 200 public-page share-image checks pass, with zero pending sync changes.
- Three article canonicals, sharing images, existing video figures and verdict cards match the base (apart from the review month).
- Three valid comparison tables, no duplicate IDs, matching source counts, valid JSON-LD and working local link targets.
- Shop/calculator body HTML matches the base exactly; only a scoped stylesheet link is added.
- Static QA has no new findings compared with the base. Existing missing-image errors remain in this sparse checkout; this is not a full static-QA pass.
- git diff --check passes.

The inline preview showed the actual added article sections, not a full-site browser render. Browser viewport verification remains pending. No production deployment is included.
