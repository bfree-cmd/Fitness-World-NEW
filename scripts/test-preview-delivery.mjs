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
assert.ok(sent.attachments.some(x=>x.content_id==='fw-free-preview'));
console.log('Preview delivery: invalid email/spam blocked; exact bundled PDF and cover attached; active download fallback verified. No email sent.');
