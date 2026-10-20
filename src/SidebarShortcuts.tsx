import {CalendarDays,Mail} from 'lucide-react';
import {SidebarClock} from './SidebarClock';
export function SidebarShortcuts({page,unread,onNavigate}:{page:string;unread?:number;onNavigate:(page:string)=>void}){
 const mailLabel='Почта'+(unread!==undefined?' · непрочитанных: '+unread.toLocaleString('ru-RU'):'');
 return <div className="sidebar-shortcuts"><SidebarClock/><button className={'sidebar-shortcut sidebar-shortcut-calendar '+(page==='Календарь'?'selected':'')} aria-label="Календарь" title="Календарь" aria-current={page==='Календарь'?'page':undefined} onClick={()=>onNavigate('Календарь')}><CalendarDays size={17} strokeWidth={1.6}/></button><button className={'sidebar-shortcut '+(page==='Почта'?'selected':'')} aria-label={mailLabel} title={mailLabel} aria-current={page==='Почта'?'page':undefined} onClick={()=>onNavigate('Почта')}><Mail size={18} strokeWidth={1.6}/>{!!unread&&<span className="sidebar-mail-dot" aria-hidden="true"/>}</button></div>;
}
