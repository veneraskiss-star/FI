import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {openDatabase} from '../server/db.ts';import {reportContext} from '../server/report.ts';import {reportPrompt} from '../shared/report.ts';import {startServer} from '../server/index.ts';
test('Отчёт получает только выбранных клиентов, нужный период и текущие задачи без контактных данных',()=>{
 const dir=mkdtempSync(join(tmpdir(),'hub-report-'));const db=openDatabase(join(dir,'db.sqlite'));
 try{
 for(const id of ['a','b'])db.prepare('INSERT INTO Client(id,name,about,state,createdAt,updatedAt) VALUES(?,?,?,?,?,?)').run(id,'Клиент '+id,'Общая информация','Пилот','2026-10-01','2026-10-16');
 db.prepare('INSERT INTO ClientContact(id,clientId,name,email) VALUES(?,?,?,?)').run('p','a','Контакт','secret@example.com');
 for(const [id,date] of [['old','2025-01-01'],['current','2026-10-15'],['unknown','']])db.prepare('INSERT INTO Activity(id,clientId,type,date,title,body,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?)').run(id,'a','Заметка',date,id,'Подробности '+id,'2026-10-15T12:00:00Z','2026-10-15T12:00:00Z');
 for(const [id,status,completedAt] of [['open','В работе',null],['done','Выполнено','2026-10-15T12:00:00Z'],['old-task','Выполнено','2025-01-01T12:00:00Z']])db.prepare('INSERT INTO Task(id,clientId,title,status,completedAt,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?)').run(id,'a',id,status,completedAt,'now','now');
 const selection={clientIds:['a'],from:'2026-10-10',to:'2026-10-16'};const r=reportContext(db,selection,'2026-10-16');const c=r.context.clients[0] as any;
 assert.equal(c.about,'Общая информация');assert.deepEqual(c.activities.map((a:any)=>a.title),['current']);assert.deepEqual(c.tasks.map((t:any)=>t.title),['done','open']);assert.equal(c.undatedEventsAddedDuringPeriod[0].title,'unknown');assert.ok(!JSON.stringify(r.context).includes('secret@example.com'));assert.ok(!JSON.stringify(r.context).includes('Клиент b'));
 assert.equal(reportContext(db,selection,'2026-10-16').hash,r.hash);assert.notEqual(reportContext(db,selection,'2026-10-17').hash,r.hash);
 assert.equal(reportContext(db,{...selection,clientIds:['b','a']},'2026-10-16').hash,reportContext(db,{...selection,clientIds:['a','b']},'2026-10-16').hash);
 assert.throws(()=>reportContext(db,{...selection,from:'2026-10-20'}));const prompt=reportPrompt(r.context);assert.equal(JSON.parse(prompt.input[0].content).clients[0].about,'Общая информация');assert.ok(prompt.instructions.includes('недоверенные'));
 }finally{db.close();rmSync(dir,{recursive:true,force:true});}
});
test('Информация о клиенте сохраняется отдельно; кеш отчёта переживает перезапуск и не подменяет новый контекст',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'hub-report-api-'));const path=join(dir,'db.sqlite');let server=await startServer({dbPath:path,port:0,production:true});
 const call=async(route:string,body?:unknown,method=body===undefined?'GET':'POST')=>{const r=await fetch(server.url+'/api/'+route,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
 try{
 const id=(await call('clients',{name:'Тестовый клиент',about:'Сеть магазинов',state:'Идёт пилот'})).data.id;const selection={clientIds:[id],from:'2026-10-01',to:'2026-10-31'};
 let context=(await call('report/context',selection)).data;assert.equal(context.context.clients[0].about,'Сеть магазинов');const key={selection,hash:context.hash,model:'test-model'};
 assert.equal((await call('report/cache',key)).data.report,null);assert.equal((await call('report/cache',{...key,text:'Тестовый отчёт без запроса к ИИ'})).status,200);
 assert.equal((await call('report/cache',key)).data.report.text,'Тестовый отчёт без запроса к ИИ');assert.equal((await call('report/cache',{...key,model:'different-model'})).data.report,null);
 await server.close();server=await startServer({dbPath:path,port:0,production:true});assert.ok((await call('report/cache',key)).data.report);assert.equal((await call('report/history')).data[0].metadata.clients[0].name,'Тестовый клиент');
 assert.equal((await call('clients/'+id,{about:'Сеть магазинов. Автоматизация заказов.'},'PATCH')).status,200);const data=(await call('data')).data;assert.equal(data.clients[0].state,'Идёт пилот');assert.equal((await call('report/cache',key)).status,400);
 context=(await call('report/context',selection)).data;assert.notEqual(context.hash,key.hash);assert.equal((await call('report/cache',{...key,hash:context.hash})).data.report,null);assert.equal((await call('report/history')).data.length,1);
 const meeting=(await call('meeting/context/'+id)).data;const proposal={kind:'about',title:'Общая информация',body:'Сеть магазинов. Новый проект.',owner:'',deadline:'',source:'Тест'};
 assert.equal((await call('meeting/apply',{clientId:id,version:meeting.version,requestId:'82345678-1234-1234-1234-123456789012',proposals:[proposal]})).status,200);
 const db=openDatabase(path);assert.ok(db.prepare("SELECT id FROM ChangeLog WHERE field='about'").get());assert.equal((db.prepare('SELECT state FROM Client').get() as any).state,'Идёт пилот');db.close();
 }finally{await server.close();rmSync(dir,{recursive:true,force:true});}
});
