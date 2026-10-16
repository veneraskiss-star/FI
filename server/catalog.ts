import {existsSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {createHash} from 'node:crypto';import type {DatabaseSync} from 'node:sqlite';import type {Express} from 'express';
import {defaultCatalog,validateCatalog,catalogLabels,type Catalog} from '../shared/catalog.ts';
export class CatalogStore{
 private catalog:Catalog;
 constructor(private path:string,private db:DatabaseSync){
 const stored=existsSync(path);this.catalog=stored?validateCatalog(JSON.parse(readFileSync(path,'utf8'))):structuredClone(defaultCatalog);
 // Existing free-text values become options on the first upgrade, without editing client records.
 if(!stored){const used=this.used();for(const key of Object.keys(used) as (keyof Catalog)[])this.catalog[key]=[...new Set([...this.catalog[key],...used[key]])];this.write(this.catalog);}
 }
 private used(){const values=(table:string,field:string)=>this.db.prepare(`SELECT DISTINCT ${field} value FROM ${table} WHERE ${field}<>'' ORDER BY ${field}`).all().map(r=>String(r.value));return {stages:values('Client','stage'),types:values('Client','type'),analysts:values('Client','analyst'),owners:values('Task','owner'),activityTypes:values('Activity','type')};}
 get(){return structuredClone(this.catalog);}
 version(){return createHash('sha256').update(JSON.stringify(this.catalog)).digest('hex');}
 private write(value:Catalog){const tmp=this.path+'.tmp';writeFileSync(tmp,JSON.stringify(value,null,2)+'\n',{mode:0o600});renameSync(tmp,this.path);}
 update(value:unknown,version:string){if(version!==this.version())throw Error('Варианты изменились. Закройте настройки и откройте снова.');const next=validateCatalog(value);const used=this.used();for(const key of Object.keys(used) as (keyof Catalog)[])for(const item of used[key])if(!next[key].includes(item))throw Error('В «'+catalogLabels[key]+'» вариант «'+item+'» уже используется. Сначала замените его в записях.');this.write(next);this.catalog=next;return {catalog:this.get(),version:this.version()};}
}
export function installCatalogRoutes(app:Express,store:CatalogStore){app.get('/api/options',(_req,res)=>res.json({catalog:store.get(),version:store.version()}));app.post('/api/options',(req,res,next)=>{try{res.json(store.update(req.body.catalog,req.body.version));}catch(e){next(e);}});}
