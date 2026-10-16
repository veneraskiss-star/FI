import {DatabaseSync,backup} from 'node:sqlite';
import {existsSync,renameSync,rmSync} from 'node:fs';
/** Never overwrite either database; publish the destination only after a complete backup. */
export async function migrateDatabase(sourcePath:string,destinationPath:string){
 if(existsSync(destinationPath)||!existsSync(sourcePath))return false;
 const temporary=destinationPath+'.migrating';rmSync(temporary,{force:true});const source=new DatabaseSync(sourcePath,{readOnly:true});
 try{await backup(source,temporary);renameSync(temporary,destinationPath);return true;}catch(e){rmSync(temporary,{force:true});throw e;}finally{source.close();}
}
