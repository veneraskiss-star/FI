import type {Note} from '../shared/notes';
export type NoteDraft={note:Note;dirty:boolean;error:string;conflict:boolean;job?:Promise<void>;timer?:ReturnType<typeof setTimeout>};
const drafts=new Map<string,NoteDraft>();const listeners=new Set<()=>void>();
const emit=()=>listeners.forEach(fn=>fn());
export function listenNoteDrafts(fn:()=>void){listeners.add(fn);return()=>{listeners.delete(fn);};}
export function getNoteDraft(id:string){return drafts.get(id);}
export function noteDrafts(){return [...drafts.values()];}
export function putNote(note:Note){const old=drafts.get(note.id);if(!old||!old.dirty&&!old.job){drafts.set(note.id,{note,dirty:false,error:'',conflict:false});emit();}return drafts.get(note.id)!;}
export function editNote(id:string,patch:Partial<Pick<Note,'title'|'body'|'clientId'|'meeting'|'folder'>>){const d=drafts.get(id)!;d.note={...d.note,...patch};d.dirty=true;d.error='';clearTimeout(d.timer);if(!d.conflict)d.timer=setTimeout(()=>{void persistNote(id).catch(()=>{});},650);emit();}
export async function noteRequest(path:string,init?:RequestInit){const r=await fetch('/api/notes'+path,{...init,headers:{'Content-Type':'application/json'}});const data=await r.json();if(!r.ok)throw Object.assign(Error(data.error||'Не удалось сохранить заметку'),{conflict:r.status===409});return data;}
export function persistNote(id:string):Promise<void>{const d=drafts.get(id);if(!d)return Promise.resolve();clearTimeout(d.timer);if(d.job)return d.job;if(!d.dirty)return Promise.resolve();if(d.conflict)return Promise.reject(Error(d.error));d.job=(async()=>{try{while(d.dirty){const sent={...d.note};d.dirty=false;emit();try{const saved:Note=await noteRequest('/'+id,{method:'PATCH',body:JSON.stringify({title:sent.title,body:sent.body,folder:sent.folder,clientId:sent.clientId,meeting:sent.meeting,revision:sent.revision})});d.note={...d.note,revision:saved.revision,updatedAt:saved.updatedAt};d.error='';}catch(e){d.dirty=true;d.error=(e as Error).message;d.conflict=!!(e as any).conflict;throw e;}}}finally{d.job=undefined;emit();}})();emit();return d.job;}
export async function flushNoteDrafts(){await Promise.all([...drafts.keys()].map(persistNote));}
export function discardNoteDraft(id:string){const d=drafts.get(id);if(d){clearTimeout(d.timer);drafts.delete(id);emit();}}
