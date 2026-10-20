# Reset welcome sequence — revised copy, not active

## Current status

- Draft PR #69; production website remains unchanged. On October 20, Email 2 was explicitly authorized as a one-time broadcast to the 17-person checked audience. No native enrollment event was emitted.
- The internal test sent on October 20 used the earlier Day 1 copy. It is not the revised Email 1.
- New Email 1 delivery-review template: `5924a337-a2bc-45a4-bac3-62eb46c4b87d`, draft in Resend. It is for reviewing the immediate delivery copy; the website function still owns delivery and attaches the PDF. Do not add a duplicate native day-zero send.
- The four follow-up templates have been republished with the revised copy, and provider readback verified exact HTML matches. Publishing templates does not enable the disabled workflow.
- Native automation `01a155a3-42d3-7303-b2fd-524f19f00bfb` is disabled, updated to Days 1, 3, 5 and 7.
- Segment `7b356bd3-1f18-4835-9156-687defd88b1e`, **FW Reset · Free PDF signups · Awaiting activation**, contains 17 delivered preview recipients. They are saved contacts, not active runs. Original checkbox values are preserved.

## Sequence and tracking

| Email | Day | Subject | UTM content |
| --- | --- | --- | --- |
| 1 | 0 | Your free Reset preview is here | email_1_preview_download |
| 2 | 1 | Protein. Produce. Fiber. Fat. | email_2_meal_rule |
| 3 | 3 | "Natural" doesn't mean risk-free | email_3_hype_or_help |
| 4 | 5 | Everything in the Reset for $9.99 | email_4_whats_inside |
| 5 | 7 | Day 4 is waiting | email_5_day_4_waiting |

Website and PDF links use `utm_source=resend`, `utm_medium=email`, `utm_campaign=reset_welcome_v2`. Immediate-delivery intro, cover and button links have separate placement values. Mailto and provider-signed unsubscribe links are unchanged. UTMs identify arriving site traffic; they do not independently generate click events on a static PDF. Domain click tracking was disabled when last checked.

## Copy decisions

The supplied copy is the basis for the five messages. Hi there is used because forms do not capture names. The unconfirmed 30-day refund guarantee is omitted. Separate printable tracker and fridge-cheat-sheet bonuses are omitted because they are not in the current delivery; the 19-profile library remains included. The last email promises later tips only for subscribers who chose the separate newsletter option. The delivery function only promises tomorrow's message when the production sequence feature flag and address configuration are enabled.

## Integration and exclusions

Accepted preview deliveries are eligible regardless of the optional newsletter checkbox, per the requested audience. Shared form scripts disclose four follow-ups over seven days; later newsletters remain optional. Existing unsubscribed contacts are never resubscribed. Known bounced/complained addresses, the known purchaser and the support test mailbox were excluded from the historical segment. No recipient addresses are stored here.

Only provider-accepted delivery creates a durable enrollment record. Email/sequence hashes prevent duplicate enrollment. The outbox runs every ten minutes, synchronizes buyer exclusions before enrollments and checks current unsubscribe/purchase state. Purchaser properties accept both scalar and typed API values. Events API dispatch timeouts become uncertain and are not replayed automatically, avoiding duplicate native runs. Buyer updates may be delayed during outages and in-flight messages cannot be recalled.

## Before activation

1. Supply the valid business postal address for the follow-up footer binding. The October 20 one-time Email 2 broadcast omitted the postal address by explicit instruction; this did not change the address guard on the disabled automation.
2. Verify real native unsubscribe links, live purchaser condition paths, suppression behavior and inbox rendering using controlled test recipients. Never test by enrolling the whole saved audience.
3. Publish the reviewed follow-up revisions. Check support replies are monitored.
4. Backfill buyer exclusions from confirmed paid orders; purchase is not newsletter consent.
5. Verify server credential permissions for Contacts and Events; do not silently replace or broaden credentials.
6. Deploy the reviewed branch, set production-only `FW_RESET_POSTAL_ADDRESS` and `FW_RESET_EMAIL_AUTOMATION_ENABLED=true`, then enable the tested native workflow. Never activate in preview/sandbox.
7. Check one accepted preview enrolls once and unsubscribe/purchase prevents subsequent sales messages. Review failed and uncertain jobs before replaying anything.

## Verification

`node scripts/test-reset-email-lifecycle.mjs`: 47 mocked checks, including days 1/3/5/7, unchecked newsletter enrollment without fabricated consent, duplicate protection and purchaser/unsubscribe exclusions.

`node scripts/test-preview-delivery.mjs`: exact PDF attachment, cover, new delivery subject and placement-specific UTM links, download fallback, invalid/spam rejection, and no tomorrow promise while disabled. All provider calls mocked.

Run `node scripts/render-reset-email-drafts.mjs` to generate five review copies. Emails 2–5 retain the footer address binding. Weekly newsletters, click-trigger messages, periodic reoffers, separate printable-bonus delivery and a new self-service purchase resend page are outside this PR.

## One-time Email 2 launch, October 20

Broadcast `41635c93-eece-4f70-b900-71ecb43756ae` was created with the approved Email 2 HTML/plain text, no postal-address placeholder and the native unsubscribe variable. The sales CTA retains `utm_content=email_2_meal_rule`. Current contacts, live unsubscribe/purchaser properties, suppression list and confirmed Sales rows were refreshed before sending. All 17 segment members passed those checks. Original newsletter checkbox values were preserved.

Resend readback confirms **sent** at 2026-10-20 06:56:57 UTC (09:56:57 Asia/Jerusalem). This confirms broadcast processing, not individual inbox delivery. The broadcast dashboard is the source of truth for final processing/delivery. No repeated send or enrollment was attempted. No PDF was resent, no production website was deployed, and Emails 3–5 were not started.

**Duplicate prevention:** Do not trigger the existing welcome workflow for this historical segment: it starts with Email 2 and would repeat the broadcast. A continuation must start with Email 3 after rechecking buyer/unsubscribe status and final broadcast outcomes. Keep the current native workflow disabled until that continuation and fresh-signup enrollment are separated.
