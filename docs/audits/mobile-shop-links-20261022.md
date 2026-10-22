# Mobile preview, shop daylight and article link polish

- Restore the original bowl-and-water shop image in a bright introduction panel; stack above guides on phones.
- Simplify the homepage preview copy, reduce mobile heading size, remove the mobile search plus control and span the preview button across the card.
- Simplify both runtime sources of the mobile preview bar; retain its UTM and click hooks, exclude the homepage, hide near inline preview links/forms and preserve desktop exclusion.
- Remove decorative right arrows from shared related-reading, sidebar-link-card and article-tool sections in 164 HTML pages. Keep links underlined with consistent padding and focus styles. Navigation and carousel controls remain functional.
- Refresh references to the five modified shared styles/scripts to avoid stale browser caches.

Validation: 40 rendered combinations across shop, home, creatine for women, testosterone, creatine calculator, tools, Reset sales and ProstaVive review at 390, 768, 1115, 1280 and 1440 px: no document overflow, brand clipping or header overlap. Fonts loaded and all shop product images decoded. Related-link arrows absent in these rendered sections; homepage sticky absent. Mobile menu opens. Additional 350 px check and 390 px sticky check confirm the bar fits, appears away from inline previews and hides at the article form. Inspected actual desktop shop and mobile homepage/sticky screenshots. Local external requests were blocked during QA; locally absent non-shop assets and YouTube frames were not evaluated as live failures.

All original HTML anchor hrefs, rel and target attributes compare equal before/after across the changed pages. JavaScript syntax and git whitespace checks pass. No prices, sources, evidence verdicts, forms, email automations or seller destinations changed. No production deployment is part of this commit.
