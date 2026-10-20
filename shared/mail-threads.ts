import type {MailSummary} from './mail.ts';
export function messageIds(value:unknown){if(typeof value!=='string')return [];return [...new Set(value.slice(0,16000).match(/<[^<>\s\x00-\x1f]{1,500}>/g)||[])].slice(-40);}
export type MailThread={latest:MailSummary;messages:MailSummary[];unread:boolean};
export function mailThreads(messages:MailSummary[]):MailThread[]{
 const parent=new Map<string,string>();const root=(id:string):string=>{const p=parent.get(id);if(!p){parent.set(id,id);return id;}if(p===id)return id;const r=root(p);parent.set(id,r);return r;};
 for(const m of messages){const own=m.validity+':uid:'+m.uid;const ids=[own,...[m.messageId,m.inReplyTo,...m.references||[]].flatMap(v=>messageIds(v)).map(id=>m.validity+':id:'+id)];for(const id of ids.slice(1))parent.set(root(id),root(own));}
 const grouped=new Map<string,MailSummary[]>();for(const m of messages){const key=root(m.validity+':uid:'+m.uid);const group=grouped.get(key)||[];if(!group.some(x=>x.uid===m.uid))group.push(m);grouped.set(key,group);}
 return [...grouped.values()].map(items=>{items.sort((a,b)=>b.uid-a.uid);return {latest:items[0],messages:items,unread:items.some(m=>m.unread)};}).sort((a,b)=>b.latest.uid-a.latest.uid);
}
