import {mkdirSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {join} from 'node:path';
import type {Express} from 'express';
import {telegramUsername} from '../shared/telegram.ts';
const MAX=1024*1024;
async function bounded(response:Response,limit:number){if(!response.ok||!response.body)throw Error('Telegram не ответил. Попробуйте позже.');const reader=response.body.getReader();const chunks:Uint8Array[]=[];let size=0;try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit)throw Error('Фотография слишком большая');chunks.push(value);}return Buffer.concat(chunks);}finally{await reader.cancel().catch(()=>{});}}
export function photoURL(html:string){const tags=html.match(/<meta\b[^>]*>/gi)||[];for(const tag of tags){const attrs=Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map(m=>[m[1].toLowerCase(),m[2]]));if(attrs.property!=='og:image')continue;const u=new URL(attrs.content.replace(/&amp;/g,'&'));if(u.protocol!=='https:'||u.port||u.username||u.password||!/^cdn\d+\.telesco\.pe$/.test(u.hostname))throw Error('Публичная фотография недоступна');return u.href;}throw Error('Публичная фотография недоступна');}
export async function fetchTelegramPhoto(username:string,fetcher:typeof fetch=fetch){const name=telegramUsername(username);if(!name)throw Error('Сначала укажите Telegram');const signal=AbortSignal.timeout(8000);const page=await fetcher('https://t.me/'+name,{signal,redirect:'error'});const html=(await bounded(page,512*1024)).toString('utf8');const response=await fetcher(photoURL(html),{signal,redirect:'error'});const bytes=await bounded(response,MAX);let type='';if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)type='image/jpeg';else if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))type='image/png';else if(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP')type='image/webp';if(!type)throw Error('Публичная фотография недоступна');return {bytes,type};}
export const PHOTO_DAY=24*60*60*1000;
export class TelegramPhotos {
 private pending=new Map<string,Promise<void>>();private syncing=false;private stopped=false;revision=Date.now();
 constructor(private path:string,private load=fetchTelegramPhoto,private now=Date.now){}
 private file(name:string){return join(this.path,telegramUsername(name).toLowerCase()+'.json');}
 read(name:string):{type:string;data:string;attemptedAt?:number}|undefined{try{return JSON.parse(readFileSync(this.file(name),'utf8'));}catch{return undefined;}}
 async refresh(username:string){const name=telegramUsername(username).toLowerCase();if(!name)throw Error('Сначала укажите Telegram');const existing=this.pending.get(name);if(existing)return existing;if(this.pending.size>=3)throw Error('Дождитесь загрузки фотографий');
 const job=(async()=>{const old=this.read(name);const attemptedAt=this.now();let value;let failure:unknown;try{const photo=await this.load(name);value={type:photo.type,data:photo.bytes.toString('base64'),attemptedAt};}catch(e){failure=e;value={...old,attemptedAt};}
 mkdirSync(this.path,{recursive:true,mode:0o700});const target=this.file(name);writeFileSync(target+'.tmp',JSON.stringify(value),{mode:0o600});renameSync(target+'.tmp',target);if(!failure)this.revision++;else throw failure;
 })();this.pending.set(name,job);try{await job;}finally{this.pending.delete(name);}}
 stop(){this.stopped=true;}
 async refreshDue(usernames:string[]){if(this.syncing||this.stopped)return;this.syncing=true;try{for(const raw of new Set(usernames.map(n=>n.toLowerCase()))){if(this.stopped)break;let name;try{name=telegramUsername(raw);}catch{continue;}if(!name)continue;const last=this.read(name)?.attemptedAt;if(last!==undefined&&this.now()-last<PHOTO_DAY)continue;try{await this.refresh(name);}catch{/* Keep the last photo and wait until the next daily attempt. */}}}finally{this.syncing=false;}}
}
export function installTelegramPhotos(app:Express,path:string){const photos=new TelegramPhotos(path);
 app.get('/api/telegram/photo-revision',(_req,res)=>res.json({revision:photos.revision}));
 app.get('/api/telegram/photos/:username',(req,res)=>{try{const value=photos.read(String(req.params.username));if(!value?.data){res.status(404).end();return;}res.set({'Content-Type':value.type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).send(Buffer.from(value.data,'base64'));}catch{res.status(404).end();}});
 app.post('/api/telegram/photos/:username',async(req,res)=>{try{await photos.refresh(String(req.params.username));res.json({ok:true});}catch(e){res.status(400).json({error:e instanceof Error&&e.name==='TimeoutError'?'Telegram не ответил за 8 секунд. Попробуйте позже.':e instanceof TypeError?'Не удалось связаться с Telegram. Проверьте подключение и повторите.':e instanceof Error?e.message:'Не удалось загрузить фото'});}});return photos;
}
