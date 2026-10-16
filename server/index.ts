import {CatalogStore,installCatalogRoutes} from './catalog.ts';
import {validDate} from '../shared/meeting.ts';
import {installMeetingRoutes} from './meeting.ts';
import express from 'express';
import {randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
import {openDatabase} from './db.ts';
export async function startServer(options:{dbPath?:string;port?:number;distPath?:string;secret?:string;production?:boolean}={}) {
const dbPath=options.dbPath||process.env.DB_PATH||resolve('data/project-hub.sqlite');
const db=openDatabase(dbPath);const catalogStore=new CatalogStore(dbPath+'.options.json',db);
let allowedHost='';
const app=express();
app.use((_req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');if(options.production??process.env.NODE_ENV==='production')res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");next();});
app.use(express.json({limit:'1mb'}));
app.use('/api',(req,res,next)=>{ const origin=req.headers.origin;if(req.headers.host!==allowedHost || (origin && origin!==`http://${allowedHost}`) || req.headers['sec-fetch-site']==='cross-site')return res.status(403).json({error:'Недопустимый источник запроса'});if(options.secret&&!req.headers.cookie?.split(';').some(c=>c.trim()===`hub_session=${options.secret}`))return res.status(403).json({error:'Откройте приложение Project Hub'});next(); });
const fields={clients:['name','analyst','type','stage','health','state','risks','archived'],tasks:['clientId','title','owner','start','deadline','status'],activities:['clientId','type','date','title','body']} as const;
const tables={clients:'Client',tasks:'Task',activities:'Activity'};
installCatalogRoutes(app,catalogStore);
app.get('/api/data',(_req,res)=>res.json({clients:db.prepare('SELECT * FROM Client ORDER BY createdAt DESC').all(),tasks:db.prepare('SELECT * FROM Task ORDER BY deadline').all(),activities:db.prepare('SELECT * FROM Activity ORDER BY date DESC,createdAt DESC').all()}));
for(const kind of ['clients','tasks','activities'] as const){
 const table=tables[kind];
 app.post(`/api/${kind}`, (req,res,next)=>{try{
 const b={...(kind==='clients'?{type:catalogStore.get().types[0],stage:catalogStore.get().stages[0],health:'По плану'}:kind==='tasks'?{status:'Запланировано'}:{type:catalogStore.get().activityTypes[0]}),...req.body};validate(kind,b);const now=new Date().toISOString();const id=randomUUID();
 const defaults=kind==='clients'?{name:'',analyst:'',type:'Другое',stage:'Знакомство',health:'По плану',state:'',risks:'',archived:0}:kind==='tasks'?{clientId:'',title:'',owner:'',start:'',deadline:'',status:'Запланировано'}:{clientId:'',type:'Заметка',date:'',title:'',body:''};
 const data:Record<string,any>={...defaults,...Object.fromEntries(fields[kind].filter(f=>b[f]!==undefined).map(f=>[f,b[f]])),id,createdAt:now,updatedAt:now};if(kind==='tasks')data.completedAt=data.status==='Выполнено'?now:null;
 db.prepare(`INSERT INTO ${table} (${Object.keys(data).join(',')}) VALUES (${Object.keys(data).map(()=>'?').join(',')})`).run(...Object.values(data));res.status(201).json({id});
 }catch(e){next(e);}});
 app.patch(`/api/${kind}/:id`,(req,res,next)=>{try{
 const old=db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(req.params.id) as Record<string,any>|undefined;if(!old)return res.status(404).json({error:'Запись не найдена'});
 const b=req.body;validate(kind,{...old,...b});const now=new Date().toISOString();const entries=fields[kind].filter(f=>b[f]!==undefined && f!=='clientId').map(f=>[f,b[f]] as [string,any]);
 db.exec('BEGIN');try{for(const [field,value] of entries){if(old[field]!==value)db.prepare('INSERT INTO ChangeLog VALUES (?,?,?,?,?,?,?,?)').run(randomUUID(),kind==='clients'?old.id:old.clientId,kind,old.id,field,String(old[field]??''),String(value),now);}
 const data=Object.fromEntries(entries);data.updatedAt=now;if(kind==='tasks' && b.status!==undefined)data.completedAt=b.status==='Выполнено'?(old.completedAt||now):null;
 db.prepare(`UPDATE ${table} SET ${Object.keys(data).map(f=>`${f}=?`).join(',')} WHERE id=?`).run(...Object.values(data),req.params.id);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}res.json({ok:true});
 }catch(e){next(e);}});
 if(kind!=='clients')app.delete(`/api/${kind}/:id`,(req,res,next)=>{try{const old=db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(req.params.id) as any;if(!old)return res.status(404).json({error:'Запись не найдена'});db.exec('BEGIN');try{db.prepare('INSERT INTO ChangeLog VALUES (?,?,?,?,?,?,?,?)').run(randomUUID(),old.clientId,kind,old.id,'deleted',JSON.stringify(old),'',new Date().toISOString());db.prepare(`DELETE FROM ${table} WHERE id=?`).run(req.params.id);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}res.json({ok:true});}catch(e){next(e);}});
}
function validate(kind:keyof typeof fields,b:any){
 for(const f of fields[kind])if(b[f]!==undefined && (f==='archived'?![0,1].includes(b[f]):typeof b[f]!=='string'||b[f].length>20000))throw Error('Некорректное поле: '+f);
 if(!(kind==='clients'?b.name:b.title)?.trim())throw Error('Укажите название');
 if(kind!=='clients'&&!db.prepare('SELECT id FROM Client WHERE id=? AND archived=0').get(b.clientId))throw Error('Выберите активного клиента');
 if(kind==='clients'&&(!['По плану','Есть риски','Проблемы'].includes(b.health)||!catalogStore.get().types.includes(b.type)))throw Error('Некорректное состояние или тип');
 if(kind==='tasks'&&!['Запланировано','В работе','Ожидание','Выполнено'].includes(b.status))throw Error('Некорректный статус');
 if(kind==='activities'&&!catalogStore.get().activityTypes.includes(b.type))throw Error('Некорректный тип записи');
 for(const f of ['date','start','deadline'])if(b[f]&&!validDate(b[f]))throw Error('Некорректная дата');
 if(kind==='clients'&&(!catalogStore.get().stages.includes(b.stage)||(b.analyst&&!catalogStore.get().analysts.includes(b.analyst))))throw Error('Выберите этап и аналитика из ваших вариантов');if(kind==='tasks'&&b.owner&&!catalogStore.get().owners.includes(b.owner))throw Error('Выберите ответственного из ваших вариантов');if(b.start&&b.deadline&&b.start>b.deadline)throw Error('Начало позже срока');
}
installMeetingRoutes(app,db,catalogStore);
app.use('/api',(_req,res)=>res.status(404).json({error:'Маршрут не найден'}));
app.use((err:any,_req:any,res:any,_next:any)=>res.status(400).json({error:err.message||'Не удалось сохранить данные'}));
if(options.production??process.env.NODE_ENV==='production'){const root=options.distPath||resolve('dist');app.use(express.static(root));app.get('/{*path}',(_req,res)=>res.sendFile(resolve(root,'index.html')));}else{const {createServer}=await import('vite');const vite=await createServer({server:{middlewareMode:true},appType:'spa'});app.use(vite.middlewares);}
const server=await new Promise<import('node:http').Server>((accept,reject)=>{const s=app.listen(options.port??Number(process.env.PORT||3000),'127.0.0.1',()=>accept(s));s.once('error',reject);});
const port=(server.address() as import('node:net').AddressInfo).port;allowedHost=`127.0.0.1:${port}`;
return {url:`http://${allowedHost}`,close:()=>new Promise<void>((accept,reject)=>{server.close(e=>{db.close();e?reject(e):accept();});server.closeAllConnections();})};
}
