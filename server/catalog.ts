import {telegramUsername} from '../shared/telegram.ts';
import {existsSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {createHash} from 'node:crypto';import type {DatabaseSync} from 'node:sqlite';import type {Express} from 'express';
import {defaultCatalog,validateCatalog,catalogLabels,type Catalog} from '../shared/catalog.ts';
export class CatalogStore{
 private catalog:Catalog;
 private employeeContacts:Record<string,{phone:string;email:string;telegram?:string}>=Object.create(null);
 private employeeRoles:Record<string,string>=Object.create(null);
 constructor(private path:string,private db:DatabaseSync){
 const stored=existsSync(path);const raw=stored?JSON.parse(readFileSync(path,'utf8')):null;this.catalog=stored?validateCatalog(raw):structuredClone(defaultCatalog);
 if(raw?.employeeRoles&&typeof raw.employeeRoles==='object')for(const name of this.catalog.owners)if(typeof raw.employeeRoles[name]==='string')this.employeeRoles[name]=raw.employeeRoles[name];
 if(raw?.employeeContacts&&typeof raw.employeeContacts==='object')for(const name of this.catalog.owners){const c=raw.employeeContacts[name];if(c&&typeof c.phone==='string'&&typeof c.email==='string')this.employeeContacts[name]={phone:c.phone,email:c.email,telegram:telegramUsername(c.telegram||'')};}
 // Existing free-text values become options on the first upgrade, without editing client records.
 if(!stored){const used=this.used();for(const key of Object.keys(used) as (keyof Catalog)[])this.catalog[key]=[...new Set([...this.catalog[key],...used[key]])];this.write(this.catalog);}
 }
 private used(){const values=(table:string,field:string)=>this.db.prepare(`SELECT DISTINCT ${field} value FROM ${table} WHERE ${field}<>'' ORDER BY ${field}`).all().map(r=>String(r.value));return {stages:values('Client','stage'),types:values('Client','type'),analysts:values('Client','analyst').filter(v=>v!=='Я'),owners:values('Task','owner'),activityTypes:values('Activity','type')};}
 employees(){return this.catalog.owners.map(name=>({name,role:this.employeeRoles[name]||'',phone:this.employeeContacts[name]?.phone||'',email:this.employeeContacts[name]?.email||'',...(this.employeeContacts[name]?.telegram?{telegram:this.employeeContacts[name].telegram}:{})}));}
 updateEmployees(value:unknown,version:string){
 if(version!==this.version())throw Error('Сотрудники изменились. Откройте справочник снова.');
 if(!Array.isArray(value)||value.length>100||value.some(e=>!e||typeof e.name!=='string'||typeof e.role!=='string'||e.role.length>200))throw Error('Проверьте имена и должности сотрудников');
 for(const e of value)if((e.phone!==undefined&&(typeof e.phone!=='string'||e.phone.length>200))||(e.email!==undefined&&(typeof e.email!=='string'||e.email.length>200||(e.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.email)))))throw Error('Проверьте телефон и почту сотрудника');
 const next=validateCatalog({...this.catalog,owners:value.map(e=>e.name)});
 for(const name of this.used().owners)if(!next.owners.includes(name))throw Error('Сотрудник «'+name+'» назначен на задачи. Сначала переназначьте их.');
 for(const e of value)telegramUsername(e.telegram||'');const roles=Object.fromEntries(value.map(e=>[e.name,e.role.trim()]));const old=this.employeeRoles;const oldContacts=this.employeeContacts;this.employeeRoles=roles;this.employeeContacts=Object.fromEntries(value.map(e=>[e.name,{phone:(e.phone??oldContacts[e.name]?.phone??'').trim(),email:(e.email??oldContacts[e.name]?.email??'').trim(),telegram:telegramUsername(e.telegram??oldContacts[e.name]?.telegram??'')}]));
 try{this.write(next);}catch(e){this.employeeRoles=old;this.employeeContacts=oldContacts;throw e;}this.catalog=next;return {employees:this.employees(),version:this.version()};
 }
 addEmployee(value:unknown){const e=value as {name:string;role:string;phone:string;email:string};if(!e||typeof e.name!=='string'||typeof e.email!=='string')throw Error('Укажите имя и почту');const email=e.email.trim().toLowerCase();const existing=email?this.employees().find(p=>p.email.trim().toLowerCase()===email):undefined;if(existing)return {employee:existing,existing:true};if(this.employees().some(p=>p.name.toLocaleLowerCase('ru')===e.name.trim().toLocaleLowerCase('ru')))throw Error('Сотрудник с таким именем уже есть. Уточните имя.');const result=this.updateEmployees([...this.employees(),{...e,name:e.name.trim(),email:e.email.trim()}],this.version());return {employee:result.employees.find(p=>p.name===e.name.trim())!,existing:false};}
 get(){return structuredClone(this.catalog);}
 version(){return createHash('sha256').update(JSON.stringify({catalog:this.catalog,employeeRoles:this.employeeRoles,employeeContacts:this.employeeContacts})).digest('hex');}
 private write(value:Catalog){const tmp=this.path+'.tmp';writeFileSync(tmp,JSON.stringify({...value,employeeRoles:this.employeeRoles,employeeContacts:this.employeeContacts},null,2)+'\n',{mode:0o600});renameSync(tmp,this.path);}
 update(value:unknown,version:string){if(version!==this.version())throw Error('Варианты изменились. Закройте настройки и откройте снова.');const next=validateCatalog(value);const used=this.used();for(const key of Object.keys(used) as (keyof Catalog)[])for(const item of used[key])if(!next[key].includes(item))throw Error('В «'+catalogLabels[key]+'» вариант «'+item+'» уже используется. Сначала замените его в записях.');this.write(next);this.catalog=next;return {catalog:this.get(),version:this.version()};}
}
export function installCatalogRoutes(app:Express,store:CatalogStore){app.get('/api/employees',(_req,res)=>res.json({employees:store.employees(),version:store.version()}));app.post('/api/employees',(req,res,next)=>{try{res.json(store.updateEmployees(req.body.employees,req.body.version));}catch(e){next(e);}});app.post('/api/employees/from-calendar',(req,res,next)=>{try{res.json(store.addEmployee(req.body));}catch(e){next(e);}});app.get('/api/options',(_req,res)=>res.json({catalog:store.get(),version:store.version()}));app.post('/api/options',(req,res,next)=>{try{res.json(store.update(req.body.catalog,req.body.version));}catch(e){next(e);}});}
