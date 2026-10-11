
// Contact messages are separate from subscribers and tracking events.
function fwContactSubmit_(request) {
  const id = String(request.contact_id || '').trim();
  const name = String(request.name || '').trim();
  const email = String(request.email || '').trim();
  const subject = String(request.subject || '').trim();
  const message = String(request.message || '').trim();
  if (!id || id.length > 200 || !name || name.length > 300 ||
      email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !message || message.length > 20000 || subject.length > 500) {
    return commentsJson_({success:false,error:'Invalid contact message'});
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = commentsBook_().getSheetByName('Contact Messages');
    if (!sheet) throw new Error('Contact Messages tab is missing');
    const headers = ['ID','Received At','Name','Email','Subject','Message','Status','Admin Notes'];
    const existing = sheet.getRange(1,1,1,headers.length).getValues()[0];
    if (existing.some((value,index)=>value!==headers[index])) throw new Error('Contact headers differ');
    const count = sheet.getLastRow();
    if (count > 1 && sheet.getRange(2,1,count-1,1).getValues().some(row=>String(row[0])===id)) {
      return commentsJson_({success:true,status:'already_saved'});
    }
    const literal = value => { const text=String(value||''); return /^[=+@-]/.test(text)?"'"+text:text; };
    const received = new Date(request.received_at || Date.now());
    sheet.appendRow([literal(id),isNaN(received.getTime())?new Date():received,
      literal(name),literal(email),literal(subject),literal(message),'new','']);
    return commentsJson_({success:true,status:'saved'});
  } finally { lock.releaseLock(); }
}
