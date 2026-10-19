# Reset welcome sequence — prepared, not active

## Current status

- Production source baseline: `4c17eeed8bc034311f32008b7c74360f2e6180ce`.
- The four follow-up email drafts are saved in the connected Resend account.
- The sending domain `fitnessworld.pro` is verified.
- No contacts were imported, enrolled, or emailed in this setup task.
- No Resend automation exists yet. Creation rejected unpublished templates; publishing the editable draft returned `Template HTML is required` even though composing its editor content succeeded. Resolve the editor rendering/publication issue before creating the workflow.
- This branch is prepared for review only. Do not enable the feature flag before all activation checks below pass.

## Sequence

The existing preview email remains the only day-zero delivery email. It now accurately lists the Daily Wellness Score and includes one useful Meal Method action. It does not promise marketing follow-ups to non-subscribers.

The four marketing messages run on days 1, 3, 6 and 9 after enrollment. New enrollment waits for the next ten-minute outbox run, so timing is approximate. Their body copy, subjects, tracked links, template IDs and intended disabled workflow are in `reset-welcome-v1.json`.

The existing verified-payment purchase email continues to issue its secure 24-hour download link. There is no self-service resend page in production; expired links still direct buyers to support with their order ID. Never replace that with an invented resend URL.

Only explicit boolean consent under `reset-welcome-v1` is eligible. Legacy signups are not backfilled. Requesting the free PDF remains independent of marketing consent. The optional checkbox now describes four tips/offers over nine days followed by occasional evidence updates and offers.

## Website integration

- Forms forward explicit consent, consent-copy version and placement to `send-free-guide`.
- Only provider-accepted preview deliveries can create a durable enrollment record.
- An email/sequence hash prevents enrollment from restarting after duplicate submissions.
- Verified PayPal delivery records a buyer exclusion before returning to the buyer, then tries to synchronize the contact's purchaser field. Failed provider updates remain queued for retry.
- The scheduled outbox synchronizes buyer exclusions before enrollments, checks subscription and purchase status, and then emits `fw.preview.delivered.v1`.
- Never set an existing unsubscribed contact back to subscribed automatically.
- The native workflow must recheck consent, live unsubscribe status and purchaser properties before each follow-up. Those field paths and native unsubscribe-link behavior require a real controlled test before activation.
- If an Events API dispatch times out, its status is `uncertain` and is not replayed automatically. Check native automation runs manually before retrying; the provider does not document event idempotency.
- Buyer exclusion updates may be delayed by a provider outage. Already in-flight email cannot be recalled. Test buyer exclusions both before enrollment and during the sequence.

## Activation requirements

1. Obtain the business postal address that may appear in marketing footers.
2. Resolve template rendering; remove address placeholder fallback values; render and publish all four templates. The current editable templates are drafts, not sendable emails. Their address variables have no placeholder fallback.
3. Create the workflow from the JSON with status **disabled**, then inspect it in Resend.
4. Verify reply-to `support@fitnessworld.pro` is monitored. Copy says “reply to us,” without promising every reply is read personally.
5. Backfill buyer exclusions from verified paid orders before enrollment is enabled, so earlier purchasers are excluded too. Do not treat a purchase as marketing consent.
6. Verify the configured server API key can access Contacts and Events. Do not replace or broaden credentials silently.
7. On a controlled test workflow and explicit test recipient, verify: no opt-in → delivery only; opt-in → one enrollment; unsubscribe → no next follow-up; purchase → no next sales email; complaint/bounce → suppressed; valid footer and unsubscribe link; expected days and UTM links. Do not enroll the existing list for testing.
8. Deploy the reviewed branch. Then set production-only `FW_RESET_POSTAL_ADDRESS` and `FW_RESET_EMAIL_AUTOMATION_ENABLED=true`, and enable the tested native workflow. Never enable either in a deploy preview or sandbox.
9. Confirm a new opt-in enrolls and a non-opt-in does not, using provider logs and automation run details. Monitor queued, failed and uncertain records.

## Not implemented in this branch

- Weekly article newsletter and periodic re-offer campaigns: these need an editorial schedule and their own subscriber selection.
- A 48-hour checkout-help email after a link click: click tracking is currently disabled on the sending domain. A click is not proof of checkout trouble, and scanners can generate clicks. Build and test a separate consent-based workflow if desired.
- A new self-service paid-download resend page: the previously held download changes remain outside this branch.
- Importing historical addresses: needs inspection of each saved opt-in record, existing unsubscribe state and relevant consent wording before any enrollment.

## Local verification

- `node scripts/test-reset-email-lifecycle.mjs`: mocked provider requests only; consent, environments, address guard, duplicate enrollment, unsubscribe, purchaser exclusion and ambiguous-dispatch behavior.
- `node scripts/test-preview-delivery.mjs`: exact preview attachment and current cover; no real email.
- `node scripts/test-meta-tracking.mjs`: all Meta/email/analytics calls intercepted.
- `node scripts/qa-site.mjs`: website references and structure.
