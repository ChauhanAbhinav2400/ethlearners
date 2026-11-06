import { config,configured } from './config';
import { connectDatabase } from './models';
import { createApp } from './app';
import { startWorker } from './workerService';
if(config.COOKIE_SAME_SITE==='none'&&config.NODE_ENV!=='production')throw new Error('Cross-site cookies require production HTTPS.');
if(configured(config)){
  try{await connectDatabase(config.MONGODB_URI);}catch{console.error('Database unavailable. Check Atlas connectivity and replica-set configuration.');}
}else console.warn('BLOCKED — EXTERNAL CONFIGURATION REQUIRED: MongoDB and private server secrets.');
const server=createApp().listen(config.PORT,'0.0.0.0',()=>console.info(`Web3MadEazy API listening on port ${config.PORT}`));
const stop=config.REWARD_WORKER_ENABLED==='true'?startWorker(config):()=>{};
process.on('SIGTERM',()=>{stop();server.close();});
