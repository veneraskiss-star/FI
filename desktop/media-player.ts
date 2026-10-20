import {execFile} from 'node:child_process';
import {join} from 'node:path';
import type {NowPlaying} from '../shared/personal.ts';
import {iconMime} from './work-link-icons.ts';
export type MediaRequest={kind:'read'}|{kind:'command';command:2|4|5};
export type MediaRunner=(request:MediaRequest)=>Promise<string>;
export function adapterRunner(directory:string,artwork:(data:Buffer)=>string):MediaRunner{
 return request=>new Promise((resolve,reject)=>{
  const args=[join(directory,'mediaremote-adapter.pl'),join(directory,'MediaRemoteAdapter.framework'),...(request.kind==='read'?['get','--now']:['send',String(request.command)])];
  execFile('/usr/bin/perl',args,{timeout:8000,maxBuffer:8*1024*1024},(error,stdout)=>{if(error){reject(Error(request.kind==='read'?'Системный плеер недоступен. Повторите после запуска музыки.':'Источник не выполнил команду. Попробуйте ещё раз.'));return;}if(request.kind==='command'){resolve('null');return;}try{const v=JSON.parse(stdout.trim());if(!v){resolve('null');return;}let image='';if(typeof v.artworkData==='string'&&v.artworkData.length<6*1024*1024){const bytes=Buffer.from(v.artworkData,'base64');if(iconMime(bytes))try{image=artwork(bytes);}catch{}}
  resolve(JSON.stringify({source:v.parentApplicationBundleIdentifier||v.bundleIdentifier||'system',sourceName:v.parentApplicationBundleIdentifier||v.bundleIdentifier||'Сейчас играет',title:v.title||'',artist:v.artist||'',playing:v.playing===true,position:Number(v.elapsedTimeNow??v.elapsedTime??0),duration:Number(v.duration??0),artwork:image||undefined}));}catch{reject(Error('Не удалось прочитать системный плеер'));}});
 });
}
export function parseTrack(raw:string):NowPlaying|undefined{const v=JSON.parse(raw);if(v===null)return;if(!v||typeof v.source!=='string'||typeof v.sourceName!=='string'||typeof v.title!=='string'||typeof v.artist!=='string'||typeof v.playing!=='boolean'||!Number.isFinite(v.position)||!Number.isFinite(v.duration))throw Error('Не удалось прочитать плеер');return {source:v.source.slice(0,200),sourceName:v.sourceName.slice(0,100),title:v.title.slice(0,500),artist:v.artist.slice(0,500),playing:v.playing,position:Math.max(0,v.duration>0?Math.min(v.position,v.duration):v.position),duration:Math.max(0,v.duration),artwork:typeof v.artwork==='string'&&v.artwork.length<2*1024*1024&&/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v.artwork)?v.artwork:undefined};}
export class MediaPlayer{
 private current?:NowPlaying;private pending?:Promise<NowPlaying|undefined>;private last=0;private commandBusy=false;private covers=new Map<string,string>();
 constructor(private run:MediaRunner){}
 read(force=false){if(this.commandBusy&&!force)return Promise.resolve(this.current);if(this.pending)return this.pending;if(!force&&Date.now()-this.last<1500)return Promise.resolve(this.current);this.pending=this.run({kind:'read'}).then(raw=>{const next=parseTrack(raw);if(next){const key=[next.source,next.title,next.artist].join('\n');if(next.artwork){this.covers.set(key,next.artwork);while(this.covers.size>20)this.covers.delete(this.covers.keys().next().value!);}else next.artwork=this.covers.get(key);}this.current=next;this.last=Date.now();return this.current;}).finally(()=>this.pending=undefined);return this.pending;}
 async action(action:unknown){if(action!=='toggle'&&action!=='previous'&&action!=='next')throw Error('Неизвестная команда плеера');if(this.commandBusy)throw Error('Дождитесь выполнения команды');if(this.pending)await this.pending;const before=this.current;if(!before)return;this.commandBusy=true;try{await this.run({kind:'command',command:({toggle:2,previous:5,next:4} as const)[action]});this.last=0;let after:NowPlaying|undefined;for(let attempt=0;attempt<5;attempt++){await new Promise(resolve=>setTimeout(resolve,attempt?350:180));after=await this.read(true);if(action!=='toggle'||after&&after.source===before.source&&after.playing!==before.playing)break;}if(action==='toggle'&&after&&after.source===before.source&&after.playing===before.playing)throw Error('Источник не подтвердил смену воспроизведения. Повторите команду.');return after;}finally{this.commandBusy=false;}}
 clear(){this.current=undefined;this.covers.clear();this.last=0;}
}
