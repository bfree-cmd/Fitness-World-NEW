// Token validation and rate-limit protections are shared with the download page.
import {modernHandler} from './lib/modern-adapter.mjs';
import handlers from './lib/bundle-handlers.js';
export default modernHandler(handlers.downloadFile);
