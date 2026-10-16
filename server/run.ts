import {startServer} from './index.ts';
try{const server=await startServer();console.log(`Project Hub: ${server.url}`);let stopping=false;const stop=()=>{if(!stopping){stopping=true;server.close().finally(()=>process.exit());}};process.on('SIGINT',stop);process.on('SIGTERM',stop);}catch(e){console.error(e instanceof Error?e.message:e);process.exit(1);}
