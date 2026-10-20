import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { handler } from '../netlify/functions/send-free-guide.mjs';
process.env.RESEND_API_KEY='local-test-placeholder';
process.env.FW_SITE_URL='https://fitnessworld.pro';
let sent;
globalThis.fetch=async (url, options={})=>{
 if(url==='https://api.resend.com/emails'){
  sent=JSON.parse(options.body);
  return new Response(JSON.stringify({id:'mock-email-id'}),{status:200});
 }
 // Simulate the unavailable custom-domain download without making a network call.
 return new Response('Unavailable',{status:502});
};
const event=email=>({httpMethod:'POST',headers:{'x-forwarded-for':'192.0.2.1'},body:JSON.stringify({email})});
assert.equal((await handler(event('abc@'))).statusCode,400);
assert.equal(sent,undefined);
assert.equal((await handler({...event('audit@example.test'),body:JSON.stringify({email:'audit@example.test',website:'spam'})})).statusCode,200);
assert.equal(sent,undefined);
const response=await handler(event('audit@example.test'));
assert.equal(response.statusCode,200);
assert.equal(JSON.parse(response.body).sent,true);
assert.ok(sent.text.includes('https://comforting-marigold-ea2f43.netlify.app/fitness-world-30-day-reset-free-preview.pdf'));
const attachment=sent.attachments.find(x=>x.filename.endsWith('.pdf'));
assert.deepEqual(Buffer.from(attachment.content,'base64'),await readFile('fitness-world-30-day-reset-free-preview.pdf'));
assert.equal(sent.attachments.length,1);
assert.equal(sent.subject,'Your free Reset preview is here');
assert.ok(sent.text.includes('utm_campaign=reset_welcome_v2'));
assert.ok(sent.text.includes('utm_content=email_1_preview_download'));
assert.ok(sent.html.includes('utm_content=email_1_intro_download'));
assert.ok(sent.html.includes('utm_content=email_1_cover_download'));
assert.ok(sent.html.includes('utm_content=email_1_button_download'));
assert.ok(!sent.text.includes('Tomorrow')); // Sequence remains disabled in this delivery test.

assert.ok(sent.html.includes('src="https://fitnessworld.pro/assets/images/free-preview-email-cover-20261018.jpg"'));
assert.ok(!sent.html.includes('cid:'));
assert.ok(sent.html.includes('max-width:220px'));
const cover=await readFile('assets/images/free-preview-email-cover-20261018.jpg');
assert.equal(cover.subarray(0,3).toString('hex'),'ffd8ff');
assert.ok(cover.length<100000);
console.log('Preview delivery: exact PDF attached; compact hosted JPEG replaces CID image; invalid email/spam blocked; download fallback verified. No email sent.');
