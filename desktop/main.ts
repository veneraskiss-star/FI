import {app,BrowserWindow,ipcMain,shell,dialog,Menu} from 'electron';
import {existsSync,mkdirSync,readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
import {migrateDatabase} from './migrate.ts';
import {startServer} from '../server/index.ts';
import {ChatGPT} from './chatgpt.ts';
let window:BrowserWindow|null=null;let server:Awaited<ReturnType<typeof startServer>>;let chat:ChatGPT|undefined;let quitting=false;let chatError='';
const smoke=process.env.HUB_SMOKE_TEST==='1';
if(smoke){app.setPath('userData',process.env.HUB_TEST_DATA!);}
if(!app.requestSingleInstanceLock())app.quit();else{
 app.on('second-instance',()=>{if(window){if(window.isMinimized())window.restore();window.show();window.focus();}});
 app.whenReady().then(async()=>{
 app.setName('Project Hub');const directory=app.getPath('userData');mkdirSync(directory,{recursive:true});const dbPath=join(directory,'project-hub.sqlite');
 // Copy the old database using SQLite backup so pending WAL records are preserved.
 if(!existsSync(dbPath)&&!smoke){const metadata=join(app.getAppPath(),'legacy-path.json');const legacy=existsSync(metadata)?JSON.parse(readFileSync(metadata,'utf8')).path:resolve('data/project-hub.sqlite');if(typeof legacy==='string'&&existsSync(legacy)){await migrateDatabase(legacy,dbPath);}}
 try{chat=new ChatGPT(directory);}catch(e){chatError=e instanceof Error?e.message:'Не удалось открыть подключение ChatGPT';}
 const secret=randomBytes(32).toString('hex');cookieSecret=secret;server=await startServer({dbPath,port:0,production:true,distPath:join(app.getAppPath(),'dist'),secret});
 const allowed=(event:Electron.IpcMainInvokeEvent)=>{if(!window||event.sender!==window.webContents||event.senderFrame!==window.webContents.mainFrame||new URL(event.senderFrame.url).origin!==server.url)throw Error('Недопустимый запрос');};
 function handle(name:string,fn:(...args:any[])=>any){ipcMain.handle(name,async(event,...args)=>{allowed(event);try{return {ok:true,value:await fn(...args)};}catch(e){return {ok:false,error:e instanceof Error?e.message:'Не удалось выполнить действие'};}});}
 const requiredChat=()=>{if(!chat)throw Error(chatError||'ChatGPT недоступен');return chat;};
 handle('chat:status',()=>chat?chat.status():{available:false,accounts:[],activeId:null,busy:false,error:chatError});
 handle('chat:connect',(id?:string)=>requiredChat().connect(id));handle('chat:cancel',()=>chat?.cancel());handle('chat:select',(id:string)=>requiredChat().select(id));handle('chat:disconnect',()=>requiredChat().disconnect());handle('chat:models',()=>requiredChat().models());handle('chat:analyze',input=>requiredChat().analyze(input));
 handle('chat:usage',()=>shell.openExternal('https://chatgpt.com/#settings/Usage'));handle('app:data',()=>shell.openPath(directory));
 await openWindow();
 if(smoke){const contents=window!.webContents;console.log('HUB_SMOKE_READY '+JSON.stringify({url:server.url,sqlite:existsSync(dbPath),metrics:app.getAppMetrics().map(m=>({type:m.type,cpu:m.cpu.percentCPUUsage,memoryKB:m.memory.workingSetSize}))}));setTimeout(()=>app.quit(),2500);}
 }).catch(e=>{dialog.showErrorBox('Project Hub не запустился',e instanceof Error?e.message:String(e));app.exit(1);});
 async function openWindow(){window=new BrowserWindow({width:1320,height:880,minWidth:900,minHeight:640,title:'Project Hub',titleBarStyle:'hiddenInset',trafficLightPosition:{x:20,y:20},backgroundColor:'#f5f5f7',webPreferences:{preload:join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
 window.webContents.setWindowOpenHandler(()=>({action:'deny'}));window.webContents.on('will-navigate',(e,url)=>{if(new URL(url).origin!==server.url)e.preventDefault();});window.webContents.session.setPermissionRequestHandler((_wc,_permission,cb)=>cb(false));
 await window.webContents.session.cookies.set({url:server.url,name:'hub_session',value:secretForWindow(),httpOnly:true,sameSite:'strict',path:'/'});
 window.on('closed',()=>{window=null;});await window.loadURL(server.url);}
 // Keep the local cookie secret in the main process, never in renderer JavaScript.
 function secretForWindow(){return cookieSecret;}
 let cookieSecret='';
 // This listener also ensures the server doesn't outlive the application.
 app.on('before-quit',e=>{if(quitting)return;e.preventDefault();quitting=true;chat?.stop();Promise.resolve(server?.close()).finally(()=>app.exit(0));});
 app.on('window-all-closed',()=>app.quit());
 Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'Project Hub',submenu:[{role:'about',label:'О Project Hub'},{type:'separator'},{role:'hide',label:'Скрыть Project Hub'},{type:'separator'},{role:'quit',label:'Завершить Project Hub'}]},{label:'Правка',submenu:[{role:'undo',label:'Отменить'},{role:'redo',label:'Повторить'},{type:'separator'},{role:'cut',label:'Вырезать'},{role:'copy',label:'Копировать'},{role:'paste',label:'Вставить'},{role:'selectAll',label:'Выбрать всё'}]},{label:'Вид',submenu:[{role:'resetZoom',label:'Исходный масштаб'},{role:'zoomIn',label:'Увеличить'},{role:'zoomOut',label:'Уменьшить'},{role:'togglefullscreen',label:'Полный экран'}]},{label:'Окно',submenu:[{role:'minimize',label:'Свернуть'},{role:'front',label:'Все окна на передний план'}]}]));
}
