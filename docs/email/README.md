# Reset welcome sequence — prepared, not active

## Current status

- Production source baseline: `4c17eeed8bc034311f32008b7c74360f2e6180ce`.
- The four follow-up templates have complete HTML/plain-text bodies, are published in Resend, and require `POSTAL_ADDRESS` at send time.
- The sending domain `fitnessworld.pro` is verified.
- Native automation `01a155a3-42d3-7303-b2fd-524f19f00bfb` exists and provider readback confirms **disabled**, with delays totaling days 1, 3, 6 and 9 and eligibility checks before every email.
- Segment `7b356bd3-1f18-4835-9156-687defd88b1e`, named **FW Reset · Free PDF signups · Awaiting activation**, contains 17 delivered free-preview recipients awaiting activation. It is not an active automation run.
- The requested audience was broadened to all delivered free-preview signups. Imported recipients were verified against Resend delivery history and suppression state; known bounced/complained addresses, the existing purchaser and the support test mailbox were excluded. Checkbox values remain accurate, including no.
- No enrollment event was emitted and no email was sent. The native workflow and website feature flag remain disabled.
- This branch remains a draft review. Activation requires the real footer address and controlled native unsubscribe/purchase tests below.

## Sequence

The existing preview email remains the only day-zero delivery email. It now accurately lists the Daily Wellness Score and includes one useful Meal Method action. It does not promise marketing follow-ups to non-subscribers.

The four marketing messages run on days 1, 3, 6 and 9 after enrollment. New enrollment waits for the next ten-minute outbox run, so timing is approximate. Their body copy, subjects, tracked links, template IDs and saved disabled workflow are in `reset-welcome-v1.json`.

The existing verified-payment purchase email continues to issue its secure 24-hour download link. There is no self-service resend page in production; expired links still direct buyers to support with their order ID. Never replace that with an invented resend URL.

Per the updated audience instruction, accepted free-preview deliveries are eligible regardless of the optional newsletter checkbox. The source checkbox remains recorded accurately and is never converted to yes for enrollment. Shared form scripts disclose the four included follow-ups; the optional checkbox covers later newsletters/offers. Seventeen historical delivered recipients are in the awaiting-activation segment; no event has been fired for any of them.

## Website integration

- Forms forward the actual newsletter checkbox, copy version and placement to `send-free-guide`.
- Only provider-accepted preview deliveries can create a durable enrollment record.
- An email/sequence hash prevents enrollment from restarting after duplicate submissions.
- Verified PayPal delivery records a buyer exclusion before returning to the buyer, then tries to synchronize the contact's purchaser field. Failed provider updates remain queued for retry.
- The scheduled outbox synchronizes buyer exclusions before enrollments, checks subscription and purchase status, and then emits `fw.preview.delivered.v1`.
- Never set an existing unsubscribed contact back to subscribed automatically.
- The native workflow must recheck live unsubscribe status and purchaser properties before each follow-up. Those field paths and native unsubscribe-link behavior require a real controlled test before activation.
- If an Events API dispatch times out, its status is `uncertain` and is not replayed automatically. Check native automation runs manually before retrying; the provider does not document event idempotency.
- Buyer exclusion updates may be delayed by a provider outage. Already in-flight email cannot be recalled. Test buyer exclusions both before enrollment and during the sequence.

## Activation requirements

1. Obtain the business postal address that may appear in marketing footers.
2. Supply the real address through the required POSTAL_ADDRESS binding on all four published templates. Verify the resolved address and native unsubscribe link in a controlled test before activation.
3. The workflow was created from the JSON and read back as **disabled**. Inspect it in Resend and keep it disabled until testing is complete.
4. Verify reply-to `support@fitnessworld.pro` is monitored. Copy says “reply to us,” without promising every reply is read personally.
5. Backfill buyer exclusions from verified paid orders before enrollment is enabled, so earlier purchasers are excluded too. Do not treat a purchase as marketing consent.
6. Verify the configured server API key can access Contacts and Events. Do not replace or broaden credentials silently.
7. On a controlled test workflow and explicit test recipient, verify: accepted preview → one enrollment regardless of newsletter checkbox; rejected/skipped preview → no enrollment; unsubscribe → no next follow-up; purchase → no next sales email; complaint/bounce → suppressed; valid footer and unsubscribe link; expected days and UTM links. Do not enroll the existing list for testing.
8. Deploy the reviewed branch. Then set production-only `FW_RESET_POSTAL_ADDRESS` and `FW_RESET_EMAIL_AUTOMATION_ENABLED=true`, and enable the tested native workflow. Never enable either in a deploy preview or sandbox.
9. Confirm an accepted preview enrolls once and an unsubscribed contact does not, using provider logs and automation run details. Monitor queued, failed and uncertain records.

## Not implemented in this branch

- Weekly article newsletter and periodic re-offer campaigns: these need an editorial schedule and their own subscriber selection.
- A 48-hour checkout-help email after a link click: click tracking is currently disabled on the sending domain. A click is not proof of checkout trouble, and scanners can generate clicks. Build and test a separate consent-based workflow if desired.
- A new self-service paid-download resend page: the previously held download changes remain outside this branch.
- Further historical imports: only delivered previews were imported in this task; failed deliveries, known bounced/complained addresses and the purchaser are excluded. No historical enrollment event was dispatched.

## Local verification

- `node scripts/test-reset-email-lifecycle.mjs`: mocked provider requests only; consent, environments, address guard, duplicate enrollment, unsubscribe, purchaser exclusion and ambiguous-dispatch behavior.
- `node scripts/test-preview-delivery.mjs`: exact preview attachment and current cover; no real email.
- `node scripts/test-meta-tracking.mjs`: all Meta/email/analytics calls intercepted.
- `node scripts/qa-site.mjs`: website references and structure.

## Preview repair

Run `node scripts/render-reset-email-drafts.mjs` to reproduce HTML and plain-text review copies in `docs/email/rendered`. These copies match the four published Resend templates, including the required POSTAL_ADDRESS variable. The production activation guard still requires a real address. No native automation was enabled and no email was sent.
