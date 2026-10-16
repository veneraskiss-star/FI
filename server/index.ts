import express from 'express';
import {randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
import {openDatabase} from './db.ts';
const db=openDatabase(process.env.DB_PATH||resolve('data/project-hub.sqlite'));
const app=express(); app.use(express.json({limit:'1mb'}));
app.use('/api',(req,res,next)=>{ const origin=req.headers.origin;if(origin && origin!==`http://127.0.0.1:${process.env.PORT||3000}` && origin!==`http://localhost:${process.env.PORT||3000}`)return res.status(403).json({error:'Недопустимый источник запроса'});next(); });
const fields={clients:['name','analyst','type','stage','health','state','risks','archived'],tasks:['clientId','title','owner','start','deadline','status'],activities:['clientId','type','date','title','body']} as const;
const tables={clients:'Client',tasks:'Task',activities:'Activity'};
app.get('/api/data',(_req,res)=>res.json({clients:db.prepare('SELECT * FROM Client ORDER BY createdAt DESC').all(),tasks:db.prepare('SELECT * FROM Task ORDER BY deadline').all(),activities:db.prepare('SELECT * FROM Activity ORDER BY date DESC,createdAt DESC').all()}));
for(const kind of ['clients','tasks','activities'] as const){
 const table=tables[kind];
 app.post(`/api/${kind}`, (req,res,next)=>{try{
 const b=req.body;validate(kind,b);const now=new Date().toISOString();const id=randomUUID();
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
 if(kind==='clients'&&(!['По плану','Есть риски','Проблемы'].includes(b.health)||!['Presale','Upsale','Другое'].includes(b.type)))throw Error('Некорректное состояние или тип');
 if(kind==='tasks'&&!['Запланировано','В работе','Ожидание','Выполнено'].includes(b.status))throw Error('Некорректный статус');
 if(kind==='activities'&&!['Встреча','Звонок','Переписка','Изменение','Заметка'].includes(b.type))throw Error('Некорректный тип записи');
 for(const f of ['date','start','deadline'])if(b[f]&&(!/^\d{4}-\d{2}-\d{2}$/.test(b[f])||Number.isNaN(Date.parse(b[f]))))throw Error('Некорректная дата');
 if(kind==='activities'&&!b.date)throw Error('Укажите дату');if(b.start&&b.deadline&&b.start>b.deadline)throw Error('Начало позже срока');
}
app.use('/api',(_req,res)=>res.status(404).json({error:'Маршрут не найден'}));
app.use((err:any,_req:any,res:any,_next:any)=>res.status(400).json({error:err.message||'Не удалось сохранить данные'}));
if(process.env.NODE_ENV==='production'){app.use(express.static(resolve('dist')));app.get('/{*path}',(_req,res)=>res.sendFile(resolve('dist/index.html')));}else{const {createServer}=await import('vite');const vite=await createServer({server:{middlewareMode:true},appType:'spa'});app.use(vite.middlewares);}
app.listen(Number(process.env.PORT||3000),'127.0.0.1',()=>console.log(`Project Hub: http://127.0.0.1:${process.env.PORT||3000}`));
