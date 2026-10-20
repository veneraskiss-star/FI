import {existsSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {join} from 'node:path';
import {defaultProfile,validateProfile,type PersonalProfile} from '../shared/personal.ts';
export class PersonalStore{
 private path:string;private value:PersonalProfile={...defaultProfile};
 constructor(directory:string){this.path=join(directory,'personal.json');try{if(existsSync(this.path))this.value=validateProfile(JSON.parse(readFileSync(this.path,'utf8')));}catch{}}
 get(){return {...this.value};}
 set(input:unknown){const value=validateProfile(input);writeFileSync(this.path+'.tmp',JSON.stringify(value),{mode:0o600});renameSync(this.path+'.tmp',this.path);this.value=value;return this.get();}
}
