import type {MailSummary} from './mail.ts';
export function mergeMailRefresh(current:MailSummary[],incoming:MailSummary[]){
 if(!incoming.length)return {messages:[],pending:[] as MailSummary[],reset:false};
 if(!current.length)return {messages:incoming,pending:[] as MailSummary[],reset:false};
 if(incoming.length&&incoming[0].validity!==current[0].validity)return {messages:incoming,pending:[] as MailSummary[],reset:true};
 const byId=new Map(incoming.map(m=>[m.uid,m]));const known=new Set(current.map(m=>m.uid));
 const oldest=incoming.length?Math.min(...incoming.map(m=>m.uid)):Infinity;
 return {messages:current.filter(m=>m.uid<oldest||byId.has(m.uid)).map(m=>byId.get(m.uid)||m),pending:incoming.filter(m=>!known.has(m.uid)),reset:false};
}
