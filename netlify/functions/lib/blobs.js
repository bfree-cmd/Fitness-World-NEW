// Netlify Blobs loader for the modern (.mjs) functions.
//
// Why this file exists: Netlify's function bundler leaves `@netlify/blobs` out of
// modern-function bundles (the deployed paypal-create-order.mjs kept it as an
// unbundled require and /var/task had no node_modules/@netlify/blobs, so
// `require('@netlify/blobs')` threw MODULE_NOT_FOUND). Loading it with a dynamic
// ESM import() instead of require() lets it resolve in that runtime. The import is
// lazy, so a load failure surfaces inside each handler's existing try/catch and log
// line instead of crashing the whole function at start-up.
let blobsModule=null;
function loadBlobs(){
  if(!blobsModule){
    blobsModule=import('@netlify/blobs').catch(error=>{blobsModule=null;throw error;});
  }
  return blobsModule;
}
async function getBlobsStore(options){
  const {getStore}=await loadBlobs();
  return getStore(options);
}
function __setBlobsModuleForTests(mod){blobsModule=Promise.resolve(mod);}
module.exports={getBlobsStore,__setBlobsModuleForTests};
