# Separate comments integration

The existing tracking Apps Script, deployment, Event Log, Subscribers, affiliate clicks, sales and payment code are unchanged.

1. Create a separate standalone Apps Script project and paste Code.gs. The target spreadsheet ID is configured for the supplied Full Tracking System file.
2. Add script property FW_COMMENTS_SECRET using a new comments-only secret.
3. Run setupCommentsSheet once. It creates only Comments and Reports; it refuses to overwrite differing existing headers.
4. Deploy as a web app, executing as the owner, accessible to anyone. Authentication is enforced by the secret through the server bridge.
5. Set Netlify FW_COMMENTS_SHEET_ENDPOINT to that deployment's /exec URL and FW_COMMENTS_SHEET_SECRET to the same comments secret. Redeploy.
6. Test a comment: it must enter pending, stay invisible until approved, and disappear after rejected or row deletion on the next page refresh. Test an editorial reply using Parent ID. Emails must never appear in the public response.

All reader comments require manual approval. Existing comment records remain in the old spreadsheet; this code does not migrate or delete them. Copy real records with their IDs into the new Comments tab if needed; exclude sample rows.

Reply preferences are recorded, but reply emails are not implemented by either the supplied original script or this replacement. Do not claim notification delivery until a separate delivery integration is implemented and tested.

This commit does not create tabs in Google or deploy Apps Script or configure Netlify. Do not modify the current tracking project's doPost or secret.
