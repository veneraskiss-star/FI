export type Note={id:string;title:string;body:string;folder?:string;clientId?:string|null;meeting?:string;revision:number;deleted:number;createdAt:string;updatedAt:string};
export type NoteSummary=Omit<Note,'body'>&{preview:string};
export function noteText(value:unknown,max:number){if(typeof value!=='string'||value.length>max||value.includes('\0'))throw Error('Проверьте текст заметки');return value;}
export const noteName=(title:string)=>title.trim()||'Без названия';
export function noteFilename(title:string){return noteName(title).replace(/[\\/:*?"<>|\x00-\x1f]/g,'-').slice(0,100)+'.md';}

export type NoteMeeting={uid:string;calendarUrl:string;start:string;title:string};
export function noteMeeting(value:unknown):NoteMeeting|null{if(!value)return null;try{const v=typeof value==='string'?JSON.parse(value):value;if(!v||typeof v!=='object'||['uid','calendarUrl','start','title'].some(k=>typeof v[k]!=='string')||!v.uid||v.uid.length>1000||!v.title.trim()||v.title.length>1000||v.calendarUrl.length>4000||!Number.isFinite(Date.parse(v.start)))return null;const u=new URL(v.calendarUrl);if(u.protocol!=='https:'||u.username||u.password)return null;return {uid:v.uid,calendarUrl:v.calendarUrl,start:v.start,title:v.title};}catch{return null;}}

export function appendNoteText(original:string,addition:string){noteText(addition,12000);if(!addition.trim())throw Error('Добавьте текст');return noteText(original+(original?'\n\n':'')+addition,100000);}

export function noteFolder(value:unknown){const path=noteText(value,200).trim();if(!path||path.split('/').some(part=>!part.trim()||part!==part.trim()||part==='.'||part==='..')||/[\\\x00-\x1f]/.test(path))throw Error('Укажите название папки; подпапки разделяются /');return path;}
