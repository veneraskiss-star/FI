import {existsSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {join} from 'node:path';
export type Theme='light'|'dark';
export class Preferences{
 private path:string;private theme:Theme|null=null;
 constructor(directory:string){this.path=join(directory,'preferences.json');if(existsSync(this.path)){try{const value=JSON.parse(readFileSync(this.path,'utf8'));if(value.theme==='dark'||value.theme==='light')this.theme=value.theme;}catch{/* Invalid appearance preferences must never block access to client data. */}}}
 getTheme(){return this.theme;}
 private save(theme:Theme|null){const temporary=this.path+'.tmp';writeFileSync(temporary,JSON.stringify({theme})+'\n',{mode:0o600});renameSync(temporary,this.path);this.theme=theme;}
 setTheme(theme:unknown){if(theme!=='dark'&&theme!=='light')throw Error('Некорректная тема');this.save(theme);}

}
