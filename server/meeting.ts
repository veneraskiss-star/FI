import type {Express} from 'express';
import type {DatabaseSync} from 'node:sqlite';
import {randomUUID,createHash} from 'node:crypto';
import {validDate,choices,fieldKinds,proposalLabels,type Proposal} from '../shared/meeting.ts';
import {taskStatuses} from '../shared/catalog.ts';
import type {CatalogStore} from './catalog.ts';
export function meetingContext(db:DatabaseSync,id:string,store:CatalogStore){
 const c=db.prepare('SELECT * FROM Client WHERE id=? AND archived=0').get(id) as any;if(!c)throw Error('Активный клиент не найден');
 return {clientId:c.id,name:c.name,state:c.state,risks:c.risks,stage:c.stage,type:c.type,analyst:c.analyst,health:c.health,updatedAt:c.updatedAt,catalog:store.get(),tasks:db.prepare('SELECT id,title,owner,deadline,status,updatedAt FROM Task WHERE clientId=? ORDER BY id').all(id),activities:db.prepare('SELECT id,date,type,title,body,updatedAt FROM Activity WHERE clientId=? ORDER BY date DESC,id').all(id)};
}
export function contextVersion(context:unknown){return createHash('sha256').update(JSON.stringify(context)).digest('hex');}
export function installMeetingRoutes(app:Express,db:DatabaseSync,store:CatalogStore){
 app.get('/api/meeting/context/:id',(req,res,next)=>{try{const context=meetingContext(db,String(req.params.id),store);res.json({context,version:contextVersion(context)});}catch(e){next(e);}});
 app.post('/api/meeting/apply',(req,res,next)=>{try{
 const {clientId,proposals,version,requestId}=req.body;
 if(typeof clientId!=='string'||typeof requestId!=='string'||!/^[a-f0-9-]{36}$/i.test(requestId)||!Array.isArray(proposals)||!proposals.length||proposals.length>80)throw Error('Проверьте выбранные предложения');
 if(db.prepare("SELECT id FROM ChangeLog WHERE entity='meeting' AND entityId=? AND clientId=?").get(requestId,clientId))return res.json({ok:true,alreadySaved:true});
 db.exec('BEGIN IMMEDIATE');try{
 const context=meetingContext(db,clientId,store);if(contextVersion(context)!==version)throw Error('Карточка, история, задачи или варианты полей изменились после анализа. Повторите анализ с актуальными данными.');
 const catalog=store.get();const seen=new Set();const now=new Date().toISOString();
 for(const p of proposals as Proposal[]){
 if(!p||!Object.keys(proposalLabels).includes(p.kind)||['title','body','owner','deadline','source'].some(f=>typeof (p as any)[f]!=='string'||(p as any)[f].length>20000)||!p.title.trim()||(p.deadline&&!validDate(p.deadline)))throw Error('Некорректное предложение');
 if(fieldKinds.includes(p.kind)){if(seen.has(p.kind))throw Error('Повторяющееся изменение поля');seen.add(p.kind);}
 if(p.kind==='task'){const status=p.status??'Запланировано';if(!taskStatuses.includes(status)||(p.owner&&!catalog.owners.includes(p.owner)))throw Error('Выберите статус и ответственного из вариантов');db.prepare('INSERT INTO Task(id,clientId,title,owner,deadline,status,createdAt,updatedAt,completedAt) VALUES(?,?,?,?,?,?,?,?,?)').run(randomUUID(),clientId,p.title,p.owner,p.deadline,status,now,now,status==='Выполнено'?now:null);}
 else if(p.kind==='activity'){const date=p.date??'';const type=p.activityType??catalog.activityTypes[0];if(typeof date!=='string'||(date&&!validDate(date))||!catalog.activityTypes.includes(type))throw Error('Проверьте дату и тип события');db.prepare('INSERT INTO Activity(id,clientId,type,date,title,body,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?)').run(randomUUID(),clientId,type,date,p.title,p.body,now,now);}
 else{const field=p.kind;const value=p.body.trim();if(!value)throw Error('Укажите новое значение поля');const allowed=choices(field,catalog);if(['stage','type','analyst','health'].includes(field)&&!allowed.includes(value))throw Error('Выберите значение из настроенных вариантов');const old=db.prepare(`SELECT ${field} value FROM Client WHERE id=?`).get(clientId) as any;db.prepare('INSERT INTO ChangeLog VALUES(?,?,?,?,?,?,?,?)').run(randomUUID(),clientId,'clients',clientId,field,old.value,value,now);db.prepare(`UPDATE Client SET ${field}=?,updatedAt=? WHERE id=?`).run(value,now,clientId);}
 }
 db.prepare('INSERT INTO ChangeLog VALUES(?,?,?,?,?,?,?,?)').run(randomUUID(),clientId,'meeting',requestId,'applied','',String(proposals.length),now);db.exec('COMMIT');res.json({ok:true});
 }catch(e){db.exec('ROLLBACK');throw e;}
 }catch(e){next(e);}});
}
