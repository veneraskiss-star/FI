import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {chmodSync} from 'node:fs';
import type {MailSummary,MailMessage,MailQuery,MailList} from '../shared/mail.ts';
export type MailSnapshot={messages:MailSummary[];unread?:number;lastSync:string;validity:string;highWater:number;total:number;notifications:boolean;sound:boolean};
const empty=():MailSnapshot=>({messages:[],lastSync:'',validity:'',highWater:0,total:0,notifications:true,sound:true});
export class MailCache{
 private db:DatabaseSync;
 constructor(directory:string,private encrypt:(s:string)=>Buffer,private decrypt:(b:Buffer)=>string){const path=join(directory,'mail-cache.sqlite');this.db=new DatabaseSync(path);chmodSync(path,0o600);this.db.exec('PRAGMA journal_mode=WAL; PRAGMA secure_delete=ON; CREATE TABLE IF NOT EXISTS State(owner TEXT PRIMARY KEY,data BLOB NOT NULL); CREATE TABLE IF NOT EXISTS Bodies(owner TEXT NOT NULL,ref TEXT NOT NULL,detail BLOB NOT NULL,source BLOB NOT NULL,bytes INTEGER NOT NULL,used INTEGER NOT NULL,PRIMARY KEY(owner,ref)); PRAGMA user_version=1;');}
 private owner(login:string){return createHash('sha256').update(login.toLowerCase()).digest('hex');}
 snapshot(login:string):MailSnapshot{const row=this.db.prepare('SELECT data FROM State WHERE owner=?').get(this.owner(login)) as {data:Uint8Array}|undefined;if(!row)return empty();try{return {...empty(),...JSON.parse(this.decrypt(Buffer.from(row.data)))};}catch{return empty();}}
 save(login:string,value:MailSnapshot){this.db.prepare('INSERT OR REPLACE INTO State(owner,data) VALUES (?,?)').run(this.owner(login),this.encrypt(JSON.stringify({...value,messages:value.messages.slice(0,1000)})));}
 list(login:string,q:MailQuery):MailList&{lastSync:string}|undefined{if(q.query)return;const state=this.snapshot(login);if(!state.lastSync)return;const all=state.messages.filter(m=>(!q.unread||m.unread)&&(q.before===undefined||m.uid<q.before));const limit=q.limit||50;return {messages:all.slice(0,limit),hasMore:all.length>limit||state.total>state.messages.length,lastSync:state.lastSync};}
 storeMessage(login:string,message:MailMessage,source:Buffer){const data=this.encrypt(source.toString('base64'));this.db.prepare('INSERT OR REPLACE INTO Bodies(owner,ref,detail,source,bytes,used) VALUES (?,?,?,?,?,?)').run(this.owner(login),message.validity+':'+message.uid,this.encrypt(JSON.stringify(message)),data,data.length,Date.now());const rows=this.db.prepare('SELECT owner,ref,bytes FROM Bodies ORDER BY used DESC').all() as {owner:string;ref:string;bytes:number}[];let total=0;for(let i=0;i<rows.length;i++){total+=rows[i].bytes;if(i>=100||total>64*1024*1024)this.db.prepare('DELETE FROM Bodies WHERE owner=? AND ref=?').run(rows[i].owner,rows[i].ref);}this.db.exec('PRAGMA wal_checkpoint(PASSIVE)');}
 message(login:string,validity:string,uid:number){const row=this.db.prepare('SELECT detail FROM Bodies WHERE owner=? AND ref=?').get(this.owner(login),validity+':'+uid) as {detail:Uint8Array}|undefined;try{return row?JSON.parse(this.decrypt(Buffer.from(row.detail))) as MailMessage:undefined;}catch{return;}}
 source(login:string,validity:string,uid:number){const row=this.db.prepare('SELECT source FROM Bodies WHERE owner=? AND ref=?').get(this.owner(login),validity+':'+uid) as {source:Uint8Array}|undefined;try{return row?Buffer.from(this.decrypt(Buffer.from(row.source)),'base64'):undefined;}catch{return;}}
 flags(login:string,validity:string,uid:number,unread:boolean){const s=this.snapshot(login);s.messages=s.messages.map(m=>m.validity===validity&&m.uid===uid?{...m,unread}:m);this.save(login,s);const message=this.message(login,validity,uid);if(message)this.db.prepare('UPDATE Bodies SET detail=? WHERE owner=? AND ref=?').run(this.encrypt(JSON.stringify({...message,unread})),this.owner(login),validity+':'+uid);}
 close(){this.db.close();}
}
