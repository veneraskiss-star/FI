import {existsSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {createHash} from 'node:crypto';
import type {Express} from 'express';
import {validateWorkLinks,type WorkLinks} from '../shared/work-links.ts';
export class WorkLinksStore{
 private value:WorkLinks={groups:[],links:[]};
 constructor(private path:string){if(existsSync(path))this.value=validateWorkLinks(JSON.parse(readFileSync(path,'utf8')));}
 get(){return {...structuredClone(this.value),version:this.version()};}
 private version(){return createHash('sha256').update(JSON.stringify(this.value)).digest('hex');}
 update(value:WorkLinks,version:unknown){if(version!==this.version())throw Error('Ссылки изменились. Обновите список и повторите.');const next=validateWorkLinks(value);writeFileSync(this.path+'.tmp',JSON.stringify(next,null,2)+'\n',{mode:0o600});renameSync(this.path+'.tmp',this.path);this.value=next;return this.get();}
}
export function installWorkLinks(app:Express,path:string){let store:WorkLinksStore|undefined;const get=()=>store??=new WorkLinksStore(path);app.get('/api/work-links',(_req,res,next)=>{try{res.json(get().get());}catch(e){next(e);}});app.post('/api/work-links',(req,res,next)=>{try{res.json(get().update(req.body,req.body.version));}catch(e){next(e);}});}
