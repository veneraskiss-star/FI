import {telegramUsername} from '../shared/telegram.ts';
import type {Express} from 'express';
import type {DatabaseSync} from 'node:sqlite';
import {createHash,randomUUID} from 'node:crypto';
export function contactTelegramNames(db:DatabaseSync){return (db.prepare("SELECT DISTINCT telegram FROM ClientContact JOIN Client ON Client.id=ClientContact.clientId WHERE Client.archived=0 AND telegram<>''").all() as {telegram:string}[]).map(p=>p.telegram);}
export function installContactRoutes(app:Express,db:DatabaseSync){
 const rows=(id:string)=>db.prepare('SELECT id,name,role,phone,email,notes,telegram FROM ClientContact WHERE clientId=? ORDER BY name,id').all(id);
 const version=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
 app.get('/api/clients/:id/contacts',(req,res,next)=>{try{if(!db.prepare('SELECT id FROM Client WHERE id=?').get(req.params.id))throw Error('Клиент не найден');const contacts=rows(String(req.params.id));res.json({contacts,version:version(contacts)});}catch(e){next(e);}});
 app.post('/api/clients/:id/contacts',(req,res,next)=>{try{
 const id=String(req.params.id);if(!db.prepare('SELECT id FROM Client WHERE id=? AND archived=0').get(id))throw Error('Выберите активного клиента');
 const contacts=req.body.contacts;if(!Array.isArray(contacts)||contacts.length>100)throw Error('Проверьте контакты');
 const ids=new Set<string>();for(const c of contacts){if(!c||typeof c.id!=='string'||!c.id||c.id.length>100||ids.has(c.id))throw Error('Некорректный контакт');ids.add(c.id);for(const f of ['name','role','phone','email','notes'])if(typeof c[f]!=='string'||c[f].length>(f==='notes'?2000:200))throw Error('Проверьте поля контакта');if(!c.name.trim()||(c.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)))throw Error('Укажите имя и корректную почту');c.telegram=telegramUsername(c.telegram??'');}
 db.exec('BEGIN IMMEDIATE');try{const before=rows(id);if(req.body.version!==version(before))throw Error('Контакты изменились. Обновите страницу и повторите.');
 for(const c of contacts){const existing=db.prepare('SELECT clientId FROM ClientContact WHERE id=?').get(c.id);if(existing&&existing.clientId!==id)throw Error('Контакт принадлежит другому клиенту');}
 const now=new Date().toISOString();db.prepare('DELETE FROM ClientContact WHERE clientId=?').run(id);for(const c of contacts)db.prepare('INSERT INTO ClientContact(id,clientId,name,role,phone,email,notes,telegram) VALUES(?,?,?,?,?,?,?,?)').run(c.id,id,c.name.trim(),c.role.trim(),c.phone.trim(),c.email.trim(),c.notes.trim(),c.telegram);
 const after=rows(id);if(JSON.stringify(before)!==JSON.stringify(after))db.prepare('INSERT INTO ChangeLog VALUES(?,?,?,?,?,?,?,?)').run(randomUUID(),id,'contacts',id,'contacts',JSON.stringify(before),JSON.stringify(after),now);
 db.exec('COMMIT');res.json({contacts:after,version:version(after)});
 }catch(e){db.exec('ROLLBACK');throw e;}
 }catch(e){next(e);}});
}
