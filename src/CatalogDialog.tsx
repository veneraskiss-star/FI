import {useEffect,useState} from 'react';
import * as Dialog from './components/ui/dialog';
import {Plus,Trash2,X} from 'lucide-react';
import {Button} from './components/ui/button';
import {catalogLabels,type Catalog} from '../shared/catalog';
const settingsKeys=['stages','types','activityTypes'] as const;
export function CatalogDialog({onClose,onSaved}:{onClose:()=>void;onSaved:()=>Promise<void>}){
 const [catalog,setCatalog]=useState<Catalog>();
 const [version,setVersion]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 const endpoint='options';
 useEffect(()=>{fetch('/api/'+endpoint).then(async r=>{if(!r.ok)throw Error('Не удалось загрузить настройки');const data=await r.json();setVersion(data.version);setCatalog(data.catalog);}).catch(e=>setError(e.message));},[endpoint]);
 async function save(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{
 const body={catalog,version};
 const r=await fetch('/api/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw Error(data.error);await onSaved();onClose();
 }catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}}
 return <Dialog.Root open onOpenChange={o=>{if(!o&&!busy)onClose();}}><Dialog.Portal><Dialog.Overlay className="dialog-overlay"/><Dialog.Content className="dialog-content catalog-dialog" aria-describedby="catalog-description">
 <Dialog.Title className="dialog-title">Настройки работы</Dialog.Title>
 <Dialog.Description id="catalog-description" className="dialog-description">Настройте этапы работы с клиентами, их типы и виды записей в истории. Они общие для всего рабочего места.</Dialog.Description>
 <Dialog.Close className="dialog-close" aria-label="Закрыть" disabled={busy}><X size={20}/></Dialog.Close>
 <form onSubmit={save}><fieldset disabled={busy||!version} className="directory-fields">
 {catalog&&settingsKeys.map(key=><section className="catalog-section" key={key}><h2>{catalogLabels[key]}</h2><div className="catalog-items">{catalog[key].map((value,i)=><div className="catalog-item" key={i}><input aria-label={catalogLabels[key]+' '+(i+1)} required maxLength={200} value={value} onChange={e=>setCatalog(c=>c&&({...c,[key]:c[key].map((v,j)=>i===j?e.target.value:v)}))}/><button type="button" className="icon-button" aria-label={'Убрать '+value} onClick={()=>setCatalog(c=>c&&({...c,[key]:c[key].filter((_,j)=>i!==j)}))}><Trash2 size={15}/></button></div>)}</div><button type="button" className="text-button" onClick={()=>setCatalog(c=>c&&({...c,[key]:[...c[key],'']}))}><Plus size={14}/>Добавить</button></section>)}
 </fieldset>{<p className="helper">Используемый этап или тип можно удалить после замены в соответствующих записях.</p>}{error&&<p className="error" role="alert">{error}</p>}<div className="form-actions"><Button variant="outline" type="button" disabled={busy} onClick={onClose}>Отмена</Button><Button disabled={busy||!version}>{busy?'Сохраняем…':'Сохранить'}</Button></div></form>
 </Dialog.Content></Dialog.Portal></Dialog.Root>;
}
