import type {Express} from 'express';
import type {DatabaseSync} from 'node:sqlite';
import {randomUUID,createHash} from 'node:crypto';
import {validDate,type Proposal} from '../shared/meeting.ts';
export function meetingContext(db:DatabaseSync,id:string){
 const c=db.prepare('SELECT * FROM Client WHERE id=? AND archived=0').get(id) as any;if(!c)throw Error('Активный клиент не найден');
 return {clientId:c.id,name:c.name,state:c.state,risks:c.risks,updatedAt:c.updatedAt,tasks:db.prepare('SELECT id,title,owner,deadline,status,updatedAt FROM Task WHERE clientId=? ORDER BY id').all(id)};
}
export function contextVersion(context:unknown){return createHash('sha256').update(JSON.stringify(context)).digest('hex');}
export function installMeetingRoutes(app:Express,db:DatabaseSync){
 app.get('/api/meeting/context/:id',(req,res,next)=>{try{const context=meetingContext(db,String(req.params.id));res.json({context,version:contextVersion(context)});}catch(e){next(e);}});
 app.post('/api/meeting/apply',(req,res,next)=>{try{
 const {clientId,date,proposals,version,requestId}=req.body;
 if(typeof clientId!=='string'||typeof date!=='string'||!validDate(date)||typeof requestId!=='string'||!/^[a-f0-9-]{36}$/i.test(requestId)||!Array.isArray(proposals)||!proposals.length||proposals.length>40)throw Error('Проверьте выбранные предложения и дату встречи');
 // The request marker lives in the existing log and makes retrying safe after a lost response.
 if(db.prepare("SELECT id FROM ChangeLog WHERE entity='meeting' AND entityId=?").get(requestId))return res.json({ok:true,alreadySaved:true});
 db.exec('BEGIN IMMEDIATE');try{
 const context=meetingContext(db,clientId);if(contextVersion(context)!==version)throw Error('Карточка или задачи изменились после анализа. Повторите анализ с актуальными данными.');
 const seen=new Set();const now=new Date().toISOString();
 for(const p of proposals as Proposal[]){
 if(!p||!['activity','task','state','risks'].includes(p.kind)||['title','body','owner','deadline','source'].some(f=>typeof (p as any)[f]!=='string'||(p as any)[f].length>20000)||!p.title.trim()||(p.deadline&&!validDate(p.deadline)))throw Error('Некорректное предложение');
 if(p.kind!=='task'){if(seen.has(p.kind))throw Error('Повторяющееся предложение');seen.add(p.kind);}
 if(p.kind==='task'){db.prepare('INSERT INTO Task(id,clientId,title,owner,deadline,status,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?)').run(randomUUID(),clientId,p.title,p.owner,p.deadline,'Запланировано',now,now);}
 else if(p.kind==='activity'){db.prepare('INSERT INTO Activity(id,clientId,type,date,title,body,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?)').run(randomUUID(),clientId,'Встреча',date,p.title,p.body,now,now);}
 else{const field=p.kind;const old=db.prepare(`SELECT ${field} value FROM Client WHERE id=?`).get(clientId) as any;const value=p.body.trim();if(!value)throw Error('Текущее состояние и риски не могут быть пустыми');db.prepare('INSERT INTO ChangeLog VALUES(?,?,?,?,?,?,?,?)').run(randomUUID(),clientId,'clients',clientId,field,old.value,value,now);db.prepare(`UPDATE Client SET ${field}=?,updatedAt=? WHERE id=?`).run(value,now,clientId);}
 }
 db.prepare('INSERT INTO ChangeLog VALUES(?,?,?,?,?,?,?,?)').run(randomUUID(),clientId,'meeting',requestId,'applied','',String(proposals.length),now);db.exec('COMMIT');res.json({ok:true});
 }catch(e){db.exec('ROLLBACK');throw e;}
 }catch(e){next(e);}});
}
