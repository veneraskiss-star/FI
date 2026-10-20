import {execFileSync} from 'node:child_process';
import {mkdir,readdir,writeFile,copyFile} from 'node:fs/promises';
import {resolve} from 'node:path';
if(process.platform==='darwin'){
 const source=resolve('desktop/vendor/mediaremote-adapter');const out=resolve('desktop-build/media-adapter');const framework=out+'/MediaRemoteAdapter.framework';await mkdir(framework,{recursive:true});
 const files=[];for(const sub of ['adapter','private','utility'])for(const name of await readdir(source+'/src/'+sub))if(name.endsWith('.m'))files.push(source+'/src/'+sub+'/'+name);
 execFileSync('/usr/bin/xcrun',['clang','-dynamiclib','-fobjc-arc','-fblocks','-fvisibility=default','-mmacosx-version-min=12.0','-I'+source+'/include','-I'+source+'/src',...files,'-framework','Foundation','-framework','AppKit','-framework','UniformTypeIdentifiers','-install_name','@rpath/MediaRemoteAdapter.framework/MediaRemoteAdapter','-o',framework+'/MediaRemoteAdapter'],{stdio:'inherit'});
 await writeFile(framework+'/Info.plist','<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>CFBundleExecutable</key><string>MediaRemoteAdapter</string><key>CFBundleIdentifier</key><string>local.projecthub.media-adapter</string><key>CFBundlePackageType</key><string>FMWK</string><key>CFBundleVersion</key><string>1</string></dict></plist>');
 await copyFile(source+'/bin/mediaremote-adapter.pl',out+'/mediaremote-adapter.pl');await copyFile(source+'/LICENSE',out+'/LICENSE');await copyFile(source+'/VENDORED.md',out+'/VENDORED.md');
}
