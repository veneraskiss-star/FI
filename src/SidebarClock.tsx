import {useEffect,useState} from 'react';
export function SidebarClock(){
 const [now,setNow]=useState(()=>new Date());
 useEffect(()=>{let timer:ReturnType<typeof setTimeout>;const update=()=>{setNow(new Date());clearTimeout(timer);timer=setTimeout(update,60000-Date.now()%60000+30);};const visible=()=>{if(document.visibilityState==='visible')update();};update();document.addEventListener('visibilitychange',visible);window.addEventListener('focus',update);return()=>{clearTimeout(timer);document.removeEventListener('visibilitychange',visible);window.removeEventListener('focus',update);};},[]);
 const value=now.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit',hour12:false});
 return <time className="sidebar-clock" dateTime={now.toISOString()} aria-label={'Текущее время '+value} title={now.toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'})} aria-live="off">{value}</time>;
}
