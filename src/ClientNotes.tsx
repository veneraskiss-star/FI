import {useEffect,useState} from 'react';
import {FileText,Plus,ChevronRight} from 'lucide-react';
import {noteName,type Note,type NoteSummary} from '../shared/notes';
import {noteRequest,putNote} from './note-drafts';
export function ClientNotes({clientId,archived,onOpen}:{clientId:string;archived:boolean;onOpen:(id:string)=>void}){
 const [notes,setNotes]=useState<NoteSummary[]>();const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 useEffect(()=>{let live=true;setNotes(undefined);setError('');noteRequest('?clientId='+encodeURIComponent(clientId)).then(rows=>{if(live)setNotes(rows);}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[clientId]);
 async function create(){setBusy(true);setError('');try{const note:Note=await noteRequest('',{method:'POST',body:JSON.stringify({clientId})});putNote(note);onOpen(note.id);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <section className="panel full client-notes" aria-label="Заметки клиента"><div className="section-title"><h2>Заметки{notes&&notes.length>0&&<small className="client-notes-count">{notes.length}</small>}</h2><button className="icon-button" disabled={archived||busy} aria-label="Новая заметка клиента" title="Новая заметка" onClick={()=>void create()}><Plus size={18}/></button></div>{error?<p className="error" role="alert">{error}</p>:!notes?<p className="muted" role="status">Загружаем…</p>:!notes.length?<p className="muted">Пока нет заметок</p>:<div className="client-notes-list">{notes.map(note=><button key={note.id} className="client-note-row" onClick={()=>onOpen(note.id)}><FileText size={16}/><span><strong>{noteName(note.title)}</strong><small>{note.preview.replace(/[#*_`>\[\]]/g,'').replace(/\s+/g,' ').trim()||'Пустая заметка'}</small></span><time dateTime={note.updatedAt}>{new Date(note.updatedAt).toLocaleDateString('ru-RU',{day:'numeric',month:'short'})}</time><ChevronRight size={15}/></button>)}</div>}</section>;
}
