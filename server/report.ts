import type {Express} from 'express';import type {DatabaseSync} from 'node:sqlite';import {createHash} from 'node:crypto';
import {validDate} from '../shared/meeting.ts';import {reportRevision,type ReportSelection,type ReportContext} from '../shared/report.ts';
export function reportContext(db:DatabaseSync,selection:ReportSelection,today=new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Moscow'})){
 if(!selection||!Array.isArray(selection.clientIds)||!selection.clientIds.length||selection.clientIds.length>30||selection.clientIds.some(id=>typeof id!=='string')||!validDate(selection.from)||!validDate(selection.to)||selection.from>selection.to)throw Error('Выберите клиентов и корректный период');
 const ids=[...new Set(selection.clientIds)].sort();const {from,to}=selection;
 const clients=ids.map(id=>{const client=db.prepare('SELECT id,name,about,state,risks,stage,type,health FROM Client WHERE id=? AND archived=0').get(id);if(!client)throw Error('Выберите активных клиентов');
 const tasks=db.prepare("SELECT title,owner,deadline,status,completedAt FROM Task WHERE clientId=? AND (status<>'Выполнено' OR date(completedAt,'+3 hours') BETWEEN ? AND ?) ORDER BY id").all(id,from,to);
 const activities=db.prepare("SELECT date,type,title,body FROM Activity WHERE clientId=? AND date BETWEEN ? AND ? ORDER BY date,id").all(id,from,to);
 const undated=db.prepare("SELECT type,title,body FROM Activity WHERE clientId=? AND date='' AND date(createdAt,'+3 hours') BETWEEN ? AND ? ORDER BY id").all(id,from,to);
 const clientChanges=db.prepare("SELECT field,oldValue,newValue,createdAt FROM ChangeLog WHERE clientId=? AND entity='clients' AND field IN ('about','state','risks','stage','health','type') AND date(createdAt,'+3 hours') BETWEEN ? AND ? ORDER BY createdAt,id").all(id,from,to);
 return {...client,tasks,activities,undatedEventsAddedDuringPeriod:undated,clientChanges};});
 const context:ReportContext={from,to,asOf:today,clients};const json=JSON.stringify(context);if(json.length>100000)throw Error('Слишком много данных для одного отчёта. Выберите меньше клиентов или сократите период.');
 const hash=createHash('sha256').update(reportRevision+json).digest('hex');return {context,hash,characters:json.length};
}
export function installReportRoutes(app:Express,db:DatabaseSync){
 app.get('/api/report/history',(_req,res)=>res.json(db.prepare('SELECT hash,model,text,createdAt,metadata FROM ReportCache ORDER BY createdAt DESC LIMIT 20').all().map(r=>({...r,metadata:JSON.parse(String(r.metadata))}))));
 app.post('/api/report/context',(req,res,next)=>{try{res.json(reportContext(db,req.body));}catch(e){next(e);}});
 app.post('/api/report/cache',(req,res,next)=>{try{const {selection,model,hash,text}=req.body;if(typeof model!=='string'||!model||model.length>200)throw Error('Выберите модель');const fresh=reportContext(db,selection);if(fresh.hash!==hash)throw Error('Данные изменились. Подготовьте отчёт заново.');
 if(text!==undefined){if(typeof text!=='string'||!text.trim()||text.length>60000)throw Error('Некорректный текст отчёта');db.prepare('INSERT OR REPLACE INTO ReportCache(hash,model,text,createdAt,metadata) VALUES(?,?,?,?,?)').run(hash,model,text,new Date().toISOString(),JSON.stringify({from:fresh.context.from,to:fresh.context.to,clients:fresh.context.clients.map(c=>({id:c.id,name:c.name}))}));}
 res.json({report:db.prepare('SELECT text,createdAt FROM ReportCache WHERE hash=? AND model=?').get(hash,model)||null});
 }catch(e){next(e);}});
}
