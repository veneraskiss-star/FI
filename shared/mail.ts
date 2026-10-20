export type MailStatus={connected:boolean;login?:string;error?:string;unread?:number;lastSync?:string;syncVersion?:number;notifications?:boolean;sound?:boolean};
export type MailRef={uid:number;validity:string};
export type MailSummary=MailRef&{messageId?:string;inReplyTo?:string;references?:string[];subject:string;from:string;date:string;unread:boolean;size:number};
export type MailQuery={unread:boolean;query:string;field:'all'|'from'|'subject'|'body';before?:number;limit?:number};
export type MailList={messages:MailSummary[];hasMore:boolean;lastSync?:string};
export type MailAttachment={index:number;name:string;size:number;type:string;preview:boolean;canOpen:boolean};
export type MailMessage=MailSummary&{to:string;cc:string;text:string;truncated:boolean;attachments:MailAttachment[]};
export function validateMailQuery(v:MailQuery){if(!v||typeof v.unread!=='boolean'||typeof v.query!=='string'||v.query.length>200||/[\r\n\0]/.test(v.query)||!['all','from','subject','body'].includes(v.field)||(v.limit!==undefined&&(!Number.isInteger(v.limit)||v.limit<50||v.limit>500))||(v.before!==undefined&&(!Number.isSafeInteger(v.before)||v.before<1)))throw Error('Проверьте параметры поиска');return {...v,query:v.query.trim()};}
export function validateMailRef(v:MailRef){if(!v||!Number.isSafeInteger(v.uid)||v.uid<1||typeof v.validity!=='string'||!/^\d{1,30}$/.test(v.validity))throw Error('Обновите список писем и выберите письмо снова');}
export function attachmentName(name:string){return name.replace(/[\\/\x00-\x1f\x7f:]/g,'_').replace(/^\.+/,'').slice(0,160).trim()||'Вложение';}
export function canOpenAttachment(name:string,type:string){const ext=name.toLowerCase().split('.').pop();return ({pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',txt:'text/plain'} as Record<string,string>)[ext||'']===type;}
export type MailDraft={id:string;to:string;cc:string;bcc:string;subject:string;text:string;attachments:{id:string;name:string;size:number}[];updatedAt:string;state:'draft'|'sending'|'sent'|'uncertain';delivery?:string};
export type MailDraftPatch=Pick<MailDraft,'id'|'to'|'cc'|'bcc'|'subject'|'text'>;
export type MailComposeMode='new'|'reply'|'replyAll'|'forward';
export function mailAddresses(value:string){if(typeof value!=='string'||value.length>5000||/[\r\n\0]/.test(value))throw Error('Проверьте адреса получателей');const result=value.split(/[;,]/).map(s=>s.trim()).filter(Boolean);if(result.length>50||result.some(a=>!/^\S+@[^\s@<>]+\.[^\s@<>]+$/.test(a)||/[<>]/.test(a)))throw Error('Укажите адреса через запятую, например name@company.ru');return [...new Set(result.map(a=>a.toLowerCase()))];}
