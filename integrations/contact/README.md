# Contact messages to Google Sheets

Netlify invokes `submission-created.js` for verified form submissions. Only the
`contact` form is forwarded. Netlify keeps its original submission and the visitor
redirect does not wait for Google Sheets.

Uses the existing FW_COMMENTS_SHEET_ENDPOINT and FW_COMMENTS_SHEET_SECRET.
The combined Apps Script must include the authenticated `contact` action and
`fwContactSubmit_` helper. Install the complete updated tracking script, then
update the existing web-app deployment to a new version; keep its URL and secret.
Contact Messages headers: ID, Received At, Name, Email, Subject, Message, Status,
Admin Notes. Duplicate Netlify submission IDs are ignored under a script lock.

No subscriber, event, email, affiliate or payment code is changed.
