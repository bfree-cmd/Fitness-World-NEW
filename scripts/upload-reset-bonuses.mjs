// Dry-run by default. Run outside CI with a private source directory and explicit --upload.
// Never put paid files in the publish directory or commit them to this repository.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const folder=process.argv.find(a=>a.startsWith('--source-dir='))?.slice('--source-dir='.length);
if(!folder)throw Error('Pass --source-dir=/absolute/private/source/directory. Dry-run is the default.');
const expected={
 'FW_Bonus_30-Day_Printable_Tracker.pdf':'6fc7b3bf60ee724a2482bad471743208c8ea84c48a08cd4116d3b22ea6beefb7',
 'FW_Bonus_4-Part_Meal_Method_Cheat_Sheet.pdf':'56e1430a6e4f7f94ba8d5b778792ec31ad10a060df4aa3a3648498657f547a9c'
};
const assets=[];
for(const [name,hash] of Object.entries(expected)){
 const data=await readFile(path.resolve(folder,name));
 if(data.subarray(0,5).toString()!=='%PDF-'||createHash('sha256').update(data).digest('hex')!==hash)throw Error('File differs from reviewed preview: '+name);
 assets.push({name,data});console.log('Verified reviewed PDF:',name,'('+data.length+' bytes)');
}
if(process.argv.includes('--upload')){
 const siteID=process.env.NETLIFY_SITE_ID,token=process.env.NETLIFY_BLOBS_TOKEN;
 if(!siteID||!token)throw Error('Set NETLIFY_SITE_ID and NETLIFY_BLOBS_TOKEN for the intended test or production site.');
 const {getStore}=await import('@netlify/blobs');
 const store=getStore({name:'fw-private-assets',siteID,token,consistency:'strong'});
 for(const {name,data} of assets){
  await store.set(name,data);
  const saved=Buffer.from(await store.get(name,{type:'arrayBuffer',consistency:'strong'}));
  if(!data.equals(saved))throw Error('Stored bytes do not match: '+name);
  console.log('Uploaded and byte-verified private asset:',name);
 }
}else console.log('Dry-run complete. No files uploaded.');
