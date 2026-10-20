import {XMLParser} from 'fast-xml-parser';
import {eventICS,updateEventICS,validateCalendarUpdate,type CalendarUpdate,parseCalendarEvents,calendarParticipants,type CalendarCreateResult,type CalendarDraft,type RemoteCalendar} from '../shared/calendar.ts';
const origin='https://caldav.yandex.ru';
const xml=new XMLParser({removeNSPrefix:true,ignoreAttributes:true,parseTagValue:false,trimValues:false});
const list=(v:any):any[]=>v===undefined?[]:Array.isArray(v)?v:[v];
export function davURL(path:string){const u=new URL(path.trim(),origin);if(u.origin!==origin||u.username||u.password||u.hash||u.search)throw Error('Недопустимый адрес календаря');return u.href;}
export function davResponses(text:string){if(/<!DOCTYPE|<!ENTITY/i.test(text))throw Error('Неподдерживаемый ответ календаря');const data=xml.parse(text);return list(data?.multistatus?.response).map(r=>({href:r.href,props:Object.assign({},...list(r.propstat).filter(p=>/\s200\s/.test(p.status||'')).map(p=>p.prop))}));}
const envelope=(props:string)=>'<?xml version="1.0" encoding="utf-8"?><d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop>'+props+'</d:prop></d:propfind>';
export class YandexDAV{
 constructor(private login:string,private password:string,private transport:typeof fetch=fetch){}
 private async request(path:string,method:string,body?:string,extra:Record<string,string>={}){
 let url=davURL(path);const signal=AbortSignal.timeout(20000);
 try{let r:Response|undefined;for(let hop=0;hop<4;hop++){
 r=await this.transport(url,{method,headers:{Authorization:'Basic '+Buffer.from(this.login+':'+this.password).toString('base64'),'Content-Type':method==='PUT'?'text/calendar; charset=utf-8':'application/xml; charset=utf-8',...extra},body,redirect:'manual',signal});
 if(![301,302,307,308].includes(r.status))break;
 const location=r.headers.get('location');await r.body?.cancel();if(!location)throw Error('Яндекс вернул перенаправление без адреса');if(hop===3)throw Error('Слишком много перенаправлений CalDAV');url=davURL(new URL(location,url).href);
 }
 if(!r)throw Error('Пустой ответ календаря');
 if(r.status===401)throw Error('Яндекс не принял логин или пароль приложения. Проверьте рабочую почту и пароль типа «Календарь».');
 if(r.status===403)throw Error('Нет доступа к этому календарю. Проверьте права и ограничения Яндекс 360.');if(r.status===412)return {status:412,text:'',etag:null as string|null};
 if(!r.ok)throw Error('Календарь ответил HTTP '+r.status+'. Попробуйте обновить позже.');
 let size=0;const chunks:Uint8Array[]=[];if(r.body){const reader=r.body.getReader();while(true){const {done,value:chunk}=await reader.read();if(done)break;size+=chunk.length;if(size>8*1024*1024){await reader.cancel();throw Error('Слишком большой ответ календаря. Сократите период.');}chunks.push(chunk);}}
 return {status:r.status,text:Buffer.concat(chunks).toString('utf8'),etag:r.headers.get('etag')};
 }catch(e){throw calendarNetworkError(e,signal.aborted);}
 }
 private async step<T>(name:string,run:()=>Promise<T>){try{return await run();}catch(e){throw Error(name+': '+(e instanceof Error?e.message:'ошибка подключения'));}}
 async calendars(){const principal='/principals/users/'+encodeURIComponent(this.login)+'/';const r=await this.step('Проверка аккаунта',()=>this.request(principal,'PROPFIND',envelope('<c:calendar-home-set/>'),{Depth:'0'}));const home=davResponses(r.text).map(p=>p.props['calendar-home-set']?.href).find(Boolean);if(typeof home!=='string')throw Error('Яндекс не вернул адрес календарей');
 const found=await this.step('Загрузка календарей',()=>this.request(davURL(home),'PROPFIND',envelope('<d:displayname/><d:resourcetype/><d:current-user-privilege-set/>'),{Depth:'1'}));const calendars:RemoteCalendar[]=davResponses(found.text).filter(r=>r.props.resourcetype&&Object.hasOwn(r.props.resourcetype,'calendar')).map(r=>{const privileges=list(r.props['current-user-privilege-set']?.privilege);return {url:davURL(r.href),name:typeof r.props.displayname==='string'?r.props.displayname.trim():'Календарь',writable:!privileges.length||privileges.some(p=>['write','all','bind'].some(k=>Object.hasOwn(p,k)))};});if(!calendars.length)throw Error('Нет доступных календарей');if(calendars.length>50)throw Error('Слишком много календарей в аккаунте');return calendars;}
 async events(calendar:RemoteCalendar,from:string,to:string){const stamp=(s:string)=>new Date(s).toISOString().replace(/[-:]/g,'').replace('.000','');const body='<?xml version="1.0"?><c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><c:calendar-data/><d:getetag/></d:prop><c:filter><c:comp-filter name="VCALENDAR"><c:comp-filter name="VEVENT"><c:time-range start="'+stamp(from)+'" end="'+stamp(to)+'"/></c:comp-filter></c:comp-filter></c:filter></c:calendar-query>';const r=await this.request(calendar.url,'REPORT',body,{Depth:'1'});const events=davResponses(r.text).flatMap(row=>{const data=row.props['calendar-data'];return typeof data==='string'?parseCalendarEvents(data,calendar,from,to).map(e=>({...e,resourceUrl:davURL(row.href),etag:typeof row.props.getetag==='string'?row.props.getetag:undefined,editable:calendar.writable&&(!e.organizer||e.organizer.toLowerCase()===this.login.toLowerCase())})):[];});return events.sort((a,b)=>a.start.localeCompare(b.start));}
 async update(input:CalendarUpdate):Promise<CalendarCreateResult>{validateCalendarUpdate(input);const {event,draft}=input;const path=davURL(event.resourceUrl!);const base=davURL(event.calendarUrl).replace(/\/?$/,'/');if(!path.startsWith(base)||path===base)throw Error('Недопустимый адрес события');const current=await this.request(path,'GET');if(!current.etag||current.etag!==event.etag)throw Error('Встреча изменена в другом приложении. Обновите календарь и повторите');const data=updateEventICS(current.text,event,draft,this.login);const result=await this.request(path,'PUT',data,{'If-Match':event.etag!});if(result.status===412)throw Error('Встреча изменена в другом приложении. Обновите календарь и повторите');return {uid:event.uid,videoUrl:event.videoUrl,warning:draft.attendees?.length?'Яндекс обработает изменения и уведомления участников. Проверьте их статусы после обновления.':undefined};}

 async create(draft:CalendarDraft):Promise<CalendarCreateResult>{
 const path=davURL(draft.calendarUrl.replace(/\/?$/,'/')+draft.uid+'.ics');const data=eventICS(draft,this.login);const r=await this.request(path,'PUT',data,{'If-None-Match':'*'});
 try{const existing=await this.request(path,'GET');const events=parseCalendarEvents(existing.text,{url:draft.calendarUrl,name:'',writable:true},draft.start,draft.end);const event=events.find(e=>e.uid===draft.uid);
 const desired=calendarParticipants(draft.attendees).filter(p=>p.email!==this.login.toLowerCase());const actual=[...new Set((event?.attendees||[]).map(p=>p.email.toLowerCase()).filter(email=>email!==this.login.toLowerCase()))];
 if(r.status===412&&(!event||event.title!==draft.title.trim()||Date.parse(event.start)!==Date.parse(draft.start)||Date.parse(event.end)!==Date.parse(draft.end)||event.location!==draft.location||!(event.description===draft.description||(draft.videoConference&&event.description.endsWith(draft.description)))||desired.length!==actual.length||desired.some(p=>!actual.includes(p.email))))throw Error('Встреча с этим идентификатором уже существует с другими данными. Обновите календарь.');
 const warnings:string[]=[];if(event?.invitationIssues)warnings.push('Яндекс сообщил об ошибке доставки приглашений. Проверьте адреса и статусы участников в календаре.');if(draft.videoConference&&!event?.videoUrl)warnings.push('Встреча создана, но Яндекс пока не вернул ссылку Телемоста. Обновите календарь и проверьте видеовстречу в Яндексе.');if(desired.some(p=>!actual.includes(p.email)))warnings.push('Яндекс не подтвердил сохранение всех участников. Проверьте список участников в Яндекс Календаре.');return {uid:draft.uid,videoUrl:event?.videoUrl,warning:warnings.join(' ')||undefined};
 }catch(e){if(r.status===412)throw e;return {uid:draft.uid,warning:'Встреча создана, но не удалось проверить ссылку и участников. Обновите календарь; повторно создавать встречу не нужно.'};}
 }

}

export function calendarNetworkError(error:unknown,aborted=false):Error{
 const e=error as {name?:string;message?:string;cause?:{code?:unknown}};
 if(aborted||e?.name==='TimeoutError'||e?.name==='AbortError')return Error('Яндекс не ответил за 20 секунд. Проверьте VPN или прокси и повторите подключение.');
 const raw=typeof e?.cause?.code==='string'?e.cause.code:'';const chrome=e?.message?.match(/net::(ERR_[A-Z_]+)/)?.[1];const code=chrome||(/^[A-Z0-9_]{2,60}$/.test(raw)?raw:'');
 if(code||e?.name==='TypeError'){
 const hint=/NAME_NOT_RESOLVED|ENOTFOUND|EAI_AGAIN/.test(code)?'Не удалось найти сервер Яндекса (DNS).':/CERT|TLS|SSL/.test(code)?'Не удалось установить защищённое соединение с Яндексом.':/PROXY|TUNNEL/.test(code)?'Не удалось подключиться через системный прокси.':'Не удалось установить соединение с Яндекс Календарём.';
 return Error(hint+(code?' Код: '+code+'.':'')+' Проверьте VPN, прокси и доступность календаря в браузере.');}
 return error instanceof Error?error:Error('Ошибка подключения к календарю');
}
