import {packager} from '@electron/packager';
import {mkdir,cp,writeFile,readFile,rm} from 'node:fs/promises';
const staging='.desktop-stage';await rm(staging,{recursive:true,force:true});await mkdir(staging,{recursive:true});
for(const file of ['main.cjs','preload.cjs','legacy-path.json'])await cp('desktop-build/'+file,staging+'/'+file);
await cp('dist',staging+'/dist',{recursive:true});
const pkg=JSON.parse(await readFile('package.json','utf8'));await writeFile(staging+'/package.json',JSON.stringify({name:'project-hub',productName:'Project Hub',version:pkg.version,main:'main.cjs'}));
const electronVersion=JSON.parse(await readFile('node_modules/electron/package.json','utf8')).version;
const results=await packager({electronVersion,...(process.env.ELECTRON_ZIP_DIR?{electronZipDir:process.env.ELECTRON_ZIP_DIR}:{}),dir:staging,out:process.env.HUB_RELEASE_DIR||'release',name:'Project Hub',platform:'darwin',arch:process.arch,overwrite:true,asar:true,icon:'assets/project-hub.icns',appBundleId:'local.projecthub.desktop',appCategoryType:'public.app-category.productivity',prune:false});
console.log('Готово:',results.join('\n'));await rm(staging,{recursive:true,force:true});
