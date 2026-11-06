import { config } from './config';
import { connectDatabase } from './models';
import { startWorker } from './workerService';
await connectDatabase(config.MONGODB_URI);
const stop=startWorker(config);process.on('SIGTERM',()=>{stop();process.exit(0);});
