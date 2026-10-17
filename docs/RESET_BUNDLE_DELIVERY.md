# Reset bundle delivery — review build

Production has not been changed by this branch. The updated five-page free preview is already live from commit 4617d2f. The frozen 79-page Reset is neither edited nor uploaded by this change. Price, PayPal order creation/capture, attribution and purchase event IDs remain unchanged.

## Release source

`assets/data/reset-bundle.json` lists names, descriptions and release flags. The download server and email renderer import this JSON; the sales-page list and success popup fetch the same JSON without cache. The review branch stages the Reset, tracker and cheat sheet as released; the standalone library remains false. Do not merge before the private assets and hosted sandbox checks below pass. Later, upload the reviewed library with complete Sources & References before enabling its flag.

The current book's embedded library remains part of its unchanged contents. An embedded section is distinct from a newly delivered standalone bonus.

The sales-page design and URL stay unchanged except for one What you get section. The two bonus descriptions now explain convenience problems they solve. No money-back guarantee was added: a refund period and conditions must be supplied before making that promise.

## Routes and access

- `/.netlify/functions/reset-downloads?token=...`: server-rendered download page, using the existing HMAC token and 24-hour lifetime. Missing, malformed, tampered or expired tokens show a resend form without exposing files.
- `/.netlify/functions/download-reset-file?file=reset|tracker|cheatsheet|library&token=...`: checks the release flag, signature, expiry, order record and checkout email on every request; an unreleased ID returns 404. Missing authentication returns 403. Files come only from the existing `fw-private-assets` Blobs store; there is no new public asset directory or static fallback.
- `/.netlify/functions/resend-download-link`: POST form or JSON, matching the original checkout email to the payment ledger. A newly signed token lasts 24 hours; recovery never creates a payment or purchase event. Existing paid records are found via a compatibility scan and indexed on recovery. Unpaid intents alone grant nothing.

All new responses use private/no-store, noindex/nofollow and no-referrer headers. HTML includes the robots meta tag; binary PDFs cannot contain an HTML meta tag and use X-Robots-Tag instead. No robots.txt block is added. The download page has no third-party scripts, analytics or external styles/fonts. A restrictive CSP prevents scripts and external resources. Existing single-file download links continue working with the same expiry and privacy headers.

Persistent compare-and-set limits: 10 requests/IP/hour, 3/email/hour. IP and email keys are HMAC hashes. A honeypot rejects automated fills. Replies use the same status/message for matched, unknown, blocked and failed-send requests, with a minimum 1.5-second response duration. Slow external services or legacy ledger scans can exceed that floor; timing cannot be perfectly identical. Failed resends do not consume a purchase or invalidate previously issued links.

## Private asset staging

The source PDFs remain in their existing private user files, not in this public repository. The two reviewed hashes are locked in `scripts/upload-reset-bonuses.mjs`.

Run:

```
node scripts/upload-reset-bonuses.mjs --source-dir=/absolute/private/source/directory
```

This checks exact bytes without uploading. For the intended isolated sandbox/staging site, configure NETLIFY_SITE_ID and NETLIFY_BLOBS_TOKEN, then add `--upload`. The script writes only the two bonuses into fw-private-assets and verifies the saved bytes. The existing Reset key is untouched. Do not commit credentials or the PDFs. Stage the existing Reset separately in the isolated sandbox store through the existing private-asset process.

## Validation

Local commands:

```
node scripts/test-reset-bundle.mjs
node scripts/test-preview-delivery.mjs
npm run qa:static
npm run qa:functions
```

The bundle test uses mocked sandbox PayPal/Resend endpoints and an in-memory store. It exercises the actual create/capture handlers, exact $9.99 amount, shared email/popup URL, binary responses, privacy headers, tampering/expiry, unreleased-file 404, unknown/legacy/unpaid recovery, persistent IP/email limits and CAS contention. To verify actual reviewed bonus bytes locally, set FW_BONUS_TEST_DIR to their private source directory. This is not a real hosted PayPal sandbox transaction.

Before production publishing:

1. Configure an isolated staging site with PayPal sandbox, a separate download secret, test Resend settings and private assets. Do not test payments or send recovery emails using live credentials.
2. Make a real sandbox purchase; confirm the popup and test email open the same page and each approved file has the expected bytes. Verify library routes return 404, including with a valid token.
3. Check HEAD responses with curl for noindex, private/no-store and no-referrer. Check expired/missing/tampered tokens and recovery with matched, unmatched and throttled emails.
4. Visually check the download page, recovery form, What you get section and success popup on desktop and mobile.
5. Upload both reviewed bonuses to production private storage, merge this branch, and verify the production manifest/page/email list together. Do not run an unapproved live purchase.

Remaining external verification: hosted sandbox checkout, real test-email receipt, real private Blob uploads, and desktop/mobile preview. Local mocks do not substitute for these release checks.
