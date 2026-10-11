# Fitness World shop and quality checks — 11 October 2026

## Delivered

- `/shop/`: mockup 3 layout, six cards, existing free/paid PDF covers and product images.
- Supplement CTAs say **Check product** and use the existing `/go/` routes with `src=shop`. Payment integration and the paid PDF are unchanged.
- Shop navigation is available in the Tools & Guides dropdown and footer on pages using the shared shell.
- Separate **Shop Clicks** tab in the existing tracking workbook: automatically displays Shop CTA Click events from Event Log. No Apps Script or secret changes were needed. Existing affiliate router events continue separately.
- A live Free Reset Preview shop click was verified in Shop Clicks with its product, button, destination, device, country and source page.

## Browser verification

GitHub Actions run 38126181680 rendered **204 repository pages at 390px and 1440px**: 408 renderings, zero horizontal document overflow. The four affiliate redirect pages are excluded from local rendering to avoid external navigation; ordinary standalone HTML files are covered by static QA rather than this index-page sweep.

Six interaction checks passed: explicit Yes/No marketing consent at both widths, and Shop CTA delivery to the tracking relay at both widths. During these tests API responses were mocked and external resources blocked; no leads, comments, email or payment transactions were created.

Shop, Reset, contact, preview, testosterone and Nitric Boost review screenshots were produced at both sizes. Shop cover/heading overrides and the reused footer dropdown styles were corrected after screenshot inspection. This is automated rendering plus representative visual inspection, not a claim that every element of every page was manually inspected.

## Site Quality failure

The previous Lighthouse failure was `NO_NAVSTART`: Chrome's page-load trace could not be recorded. Lighthouse was updated from 12.2.1 to 13.5.0. Checks now target the existing Netlify deployment while the domain migration remains deferred. DNS and domain settings were not changed.

Home, Reset, articles and evidence-projects Lighthouse jobs passed in run 38125968350 and again in run 38126181680. Reset scores in the first run: Performance 74, Accessibility 96, Best Practices 96, SEO 100. A successful audit is not a guarantee of perfect performance. Shop was added to the audit matrix as well.

## Email checks and fix

Resend confirmed delivery of existing preview emails and an existing Reset purchase email. The sender domain is verified and sending is enabled. The failed recent deliveries were to test addresses. An old purchase download returned HTTP 403 with an invalid-or-expired message.

The delivered preview email's custom-domain PDF link returned 502 from this environment. The preview sender now attaches the exact bundled five-page PDF and actual cover. It validates the configured download URL with a bounded HEAD request and uses the active Netlify PDF URL if that URL is unavailable. It checks the PDF signature before attaching remotely downloaded bytes. The custom-domain migration, purchase sender and paid document were not edited.

A local mock-provider regression check verifies invalid-email rejection, honeypot rejection, exact bundled attachment bytes and the working-site URL fallback. No live test message was sent for this change. The next real preview request should still be checked in the recipient's inbox to confirm the deployed attachment and button.

Marketing consent is optional and defaults unchecked. Both checkbox values are recorded correctly. The Subscribers sheet is a contact/lead summary; it is not proof of enrollment in an external newsletter. A complete newsletter opt-in/unsubscribe lifecycle remains outside these verified checks and must be confirmed before marketing campaigns begin.

## External analytics limits

Shop emits a GA4 `shop_product_click` event through the existing tag. The responsive audit includes a single live collector-response check while internal tracking/form relays are intercepted. Collector acceptance does not prove that the GA4 reporting dashboard or purchase attribution is correct. Meta Pixel ID is empty in the existing configuration; no ID was invented or enabled. External reporting-dashboard verification remains pending.
