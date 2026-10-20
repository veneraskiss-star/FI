import {build} from 'esbuild';
import {mkdir,copyFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
await mkdir('desktop-build',{recursive:true});
await build({entryPoints:['desktop/main.ts'],outfile:'desktop-build/main.cjs',bundle:true,platform:'node',format:'cjs',target:'node24',external:['electron','vite'],logLevel:'info'});
await build({entryPoints:['desktop/preload.ts'],outfile:'desktop-build/preload.cjs',bundle:true,platform:'node',format:'cjs',target:'node24',external:['electron'],logLevel:'info'});
await writeFile('desktop-build/legacy-path.json',JSON.stringify({path:resolve('data/project-hub.sqlite')}));

await build({entryPoints:['desktop/notification-preload.ts'],outfile:'desktop-build/notification-preload.cjs',bundle:true,platform:'node',format:'cjs',target:'node24',external:['electron'],logLevel:'info'});
await import('./build-media-adapter.mjs');
