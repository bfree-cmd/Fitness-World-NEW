import lifecycle from './lib/reset-email-lifecycle.js';
export async function handler(){
 try{return {statusCode:200,body:JSON.stringify(await lifecycle.processOutbox())};}
 catch(_){return {statusCode:503,body:JSON.stringify({error:'Email automation processing unavailable'})};}
}
