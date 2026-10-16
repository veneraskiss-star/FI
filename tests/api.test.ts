import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {openDatabase} from '../server/db.ts';
test('Клиент, задачи, история, журнал и сохранение после перезапуска',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'hub-test-'));const path=join(dir,'test.sqlite');let child:ReturnType<typeof spawn>|undefined;
 const start=async()=>{child=spawn(process.execPath,['--import','tsx','server/index.ts'],{env:{...process.env,DB_PATH:path,PORT:'3098',NODE_ENV:'production'},stdio:'pipe'});await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Сервер не запустился')),15000);child!.stdout!.on('data',b=>{if(String(b).includes('Project Hub:')){clearTimeout(timer);resolve();}});child!.on('exit',code=>{clearTimeout(timer);reject(Error('Сервер завершился: '+code));});});};
 const stop=async()=>{if(child){const p=child;await new Promise<void>(resolve=>{p.once('exit',()=>resolve());p.kill();});child=undefined;}};
 const call=async(path:string,body?:any,method='POST')=>{const r=await fetch('http://127.0.0.1:3098/api/'+path,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
 try{await start();let r=await call('clients',{name:'Тестовая компания',health:'По плану',type:'Presale'});assert.equal(r.status,201);const id=r.data.id;
 r=await call('tasks',{clientId:id,title:'Тестовая задача',status:'Запланировано',deadline:'2026-10-01'});assert.equal(r.status,201);const taskId=r.data.id;
 assert.equal((await call('tasks/'+taskId,{status:'Выполнено'},'PATCH')).status,200);
 assert.equal((await call('clients/'+id,{state:'Проводится тестирование',health:'Есть риски'},'PATCH')).status,200);
 r=await call('activities',{clientId:id,title:'Тестовая встреча',type:'Встреча',date:'2026-10-16',body:'Проверка истории'});assert.equal(r.status,201);const entryId=r.data.id;
 assert.equal((await call('tasks',{clientId:id,title:'Неверные даты',status:'В работе',start:'2026-11-01',deadline:'2026-10-01'})).status,400);
 await stop();await start();r=await call('data',undefined,'GET');assert.equal(r.data.clients[0].state,'Проводится тестирование');assert.equal(r.data.tasks[0].status,'Выполнено');assert.ok(r.data.tasks[0].completedAt);assert.equal(r.data.activities[0].date,'2026-10-16');
 assert.equal((await call('tasks/'+taskId,{},'DELETE')).status,200);assert.equal((await call('activities/'+entryId,{},'DELETE')).status,200);
 assert.equal((await call('clients/'+id,{archived:1},'PATCH')).status,200);await stop();
 const db=openDatabase(path);assert.equal((db.prepare('SELECT archived FROM Client').get() as any).archived,1);assert.ok((db.prepare('SELECT count(*) n FROM ChangeLog').get() as any).n>=6);db.close();
 }finally{await stop();rmSync(dir,{recursive:true,force:true});}
});
