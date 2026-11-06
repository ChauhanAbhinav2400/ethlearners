import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const backendRoot=path.dirname(fileURLToPath(import.meta.url));
await build({absWorkingDir:backendRoot,entryPoints:[path.join(backendRoot,'src/server.ts'),path.join(backendRoot,'src/worker.ts')],outdir:path.join(backendRoot,'dist'),bundle:true,packages:'external',platform:'node',format:'esm',outExtension:{'.js':'.mjs'},target:'node22'});
