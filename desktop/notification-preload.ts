import {contextBridge,ipcRenderer} from 'electron';
contextBridge.exposeInMainWorld('hubToast',{
 open:()=>ipcRenderer.send('mail:toast-open'),
 close:()=>ipcRenderer.send('mail:toast-close'),
 interactive:(enabled:boolean)=>{if(typeof enabled==='boolean')ipcRenderer.send('mail:toast-interactive',enabled);},
 onShow:(listener:()=>void)=>{const handler=()=>listener();ipcRenderer.on('mail:toast-show',handler);return()=>ipcRenderer.removeListener('mail:toast-show',handler);}
});
