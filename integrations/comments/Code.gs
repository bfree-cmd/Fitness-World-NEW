// Deploy in a SEPARATE Apps Script project. Do not paste into tracking's project.
const COMMENTS_SPREADSHEET_ID = '1lskc1YkQZdBdqaoueBUzmNs5gtbAd42zXWphAbBosRM';
const COMMENT_HEADERS = ['ID','Parent ID','Article Path','Display Name','Email (Private)','Comment','Notify Replies','Status','Is Editorial','Created At','Admin Notes'];
const REPORT_HEADERS = ['Report ID','Comment ID','Article Path','Reason','Created At','Status'];
function commentsBook_(){return SpreadsheetApp.openById(COMMENTS_SPREADSHEET_ID);}
function commentsJson_(b){return ContentService.createTextOutput(JSON.stringify(b)).setMimeType(ContentService.MimeType.JSON);}
function setupCommentsSheet(){
  const ss=commentsBook_();
  [['Comments',COMMENT_HEADERS,8,['pending','approved','rejected','spam']],['Reports',REPORT_HEADERS,6,['open','reviewed','dismissed']]].forEach(([name,headers,col,statuses])=>{
    let sh=ss.getSheetByName(name);
    if(!sh){sh=ss.insertSheet(name);sh.appendRow(headers);}
    const existing=sh.getRange(1,1,1,headers.length).getValues()[0];
    if(existing.some((v,i)=>v!==headers[i]))throw new Error(name+' headers differ; existing sheet was not overwritten.');
    sh.setFrozenRows(1);sh.getRange(1,1,1,headers.length).setFontWeight('bold');
    sh.getRange(2,col,Math.max(sh.getMaxRows()-1,1),1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(statuses,true).setAllowInvalid(false).build());
  });
}
function doGet(){return commentsJson_({success:true,service:'Fitness World Comments'});}
function doPost(e){
  try{
    const b=JSON.parse(e.postData.contents);
    const secret=PropertiesService.getScriptProperties().getProperty('FW_COMMENTS_SECRET');
    if(!secret||b.comments_secret!==secret)return commentsJson_({success:false,error:'Unauthorized'});
    const article=String(b.article_path||'');
    if(!/^\/[a-z0-9-]+\/[a-z0-9-]+\/$/.test(article))return commentsJson_({success:false,error:'Invalid article'});
    const sh=commentsBook_().getSheetByName('Comments');
    if(!sh)throw new Error('Run setup first');
    if(b.action==='list')return commentsJson_({success:true,comments:sh.getDataRange().getValues().slice(1).filter(r=>r[2]===article&&String(r[7]).trim().toLowerCase()==='approved').map(r=>({id:String(r[0]),parent_id:String(r[1]),display_name:String(r[3]),body:String(r[5]),is_editorial:r[8]===true||String(r[8]).toLowerCase()==='yes',created_at:r[9] instanceof Date?r[9].toISOString():String(r[9])}))});
    const literal=v=>{const s=String(v||'');return /^[=+@-]/.test(s)?"'"+s:s;};
    if(b.action==='submit'){
      const name=String(b.display_name||'').trim(),email=String(b.email||'').trim(),body=String(b.body||'').trim();
      if(name.length<2||name.length>80||email.length>160||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||body.length<3||body.length>2000)return commentsJson_({success:false,error:'Please enter a name, valid email and comment (maximum 2000 characters).'});
      if(b.website)return commentsJson_({success:true,status:'received'});
      const lock=LockService.getScriptLock();lock.waitLock(10000);
      try{
        const key=Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,email.toLowerCase()+'|'+article));
        const cache=CacheService.getScriptCache();if(cache.get(key))return commentsJson_({success:false,error:'Please wait a minute before posting again.'});
        sh.appendRow([Utilities.getUuid(),'',article,literal(name),literal(email),literal(body),b.notify_replies===true?'Yes':'No','pending','No',new Date(),'Awaiting manual approval']);cache.put(key,'1',60);
      }finally{lock.releaseLock();}
      return commentsJson_({success:true,status:'pending',published:false});
    }
    if(b.action==='report'){
      const exists=sh.getDataRange().getValues().slice(1).some(r=>r[0]===b.comment_id&&r[2]===article&&r[7]==='approved');
      if(!exists)return commentsJson_({success:false,error:'Comment not found'});
      const lock=LockService.getScriptLock();lock.waitLock(10000);
      try{commentsBook_().getSheetByName('Reports').appendRow([Utilities.getUuid(),b.comment_id,article,literal(String(b.reason||'Reader report').slice(0,500)),new Date(),'open']);}finally{lock.releaseLock();}
      return commentsJson_({success:true});
    }
    return commentsJson_({success:false,error:'Invalid action'});
  }catch(err){console.error('Comments request failed');return commentsJson_({success:false,error:'Comments are temporarily unavailable.'});}
}
