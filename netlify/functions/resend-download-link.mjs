// Persistent rate-limit protections are implemented in the shared handler.
import {modernHandler} from './lib/modern-adapter.mjs';
import handlers from './lib/bundle-handlers.js';
export default modernHandler(handlers.resend);
