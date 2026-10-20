import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
export function openDatabase(path:string){
 mkdirSync(dirname(path),{recursive:true}); const db=new DatabaseSync(path);
 db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
 CREATE TABLE IF NOT EXISTS Client(id TEXT PRIMARY KEY,name TEXT NOT NULL,analyst TEXT NOT NULL DEFAULT '',type TEXT NOT NULL DEFAULT 'Другое',stage TEXT NOT NULL DEFAULT 'Знакомство',health TEXT NOT NULL DEFAULT 'По плану',state TEXT NOT NULL DEFAULT '',risks TEXT NOT NULL DEFAULT '',archived INTEGER NOT NULL DEFAULT 0,createdAt TEXT NOT NULL,updatedAt TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS Task(id TEXT PRIMARY KEY,clientId TEXT NOT NULL REFERENCES Client(id),title TEXT NOT NULL,owner TEXT NOT NULL DEFAULT '',start TEXT NOT NULL DEFAULT '',deadline TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'Запланировано',createdAt TEXT NOT NULL,updatedAt TEXT NOT NULL,completedAt TEXT);
 CREATE TABLE IF NOT EXISTS Activity(id TEXT PRIMARY KEY,clientId TEXT NOT NULL REFERENCES Client(id),type TEXT NOT NULL,date TEXT NOT NULL,title TEXT NOT NULL,body TEXT NOT NULL DEFAULT '',createdAt TEXT NOT NULL,updatedAt TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS ChangeLog(id TEXT PRIMARY KEY,clientId TEXT NOT NULL REFERENCES Client(id),entity TEXT NOT NULL,entityId TEXT NOT NULL,field TEXT NOT NULL,oldValue TEXT,newValue TEXT,createdAt TEXT NOT NULL);`);
 const version=Number((db.prepare('PRAGMA user_version').get() as any).user_version);
 if(version<2){db.exec(`BEGIN IMMEDIATE;
 CREATE TABLE IF NOT EXISTS ClientContact(id TEXT PRIMARY KEY,clientId TEXT NOT NULL REFERENCES Client(id),name TEXT NOT NULL,role TEXT NOT NULL DEFAULT '',phone TEXT NOT NULL DEFAULT '',email TEXT NOT NULL DEFAULT '',notes TEXT NOT NULL DEFAULT '');
 CREATE INDEX IF NOT EXISTS ClientContact_client ON ClientContact(clientId);
 PRAGMA user_version=2;COMMIT;`);}
 if(version<3){db.exec("BEGIN IMMEDIATE; ALTER TABLE Client ADD COLUMN about TEXT NOT NULL DEFAULT ''; PRAGMA user_version=3; COMMIT;");}
 if(version<4){db.exec("BEGIN IMMEDIATE; CREATE TABLE IF NOT EXISTS ReportCache(hash TEXT NOT NULL,model TEXT NOT NULL,text TEXT NOT NULL,createdAt TEXT NOT NULL,metadata TEXT NOT NULL,PRIMARY KEY(hash,model)); PRAGMA user_version=4; COMMIT;");}
 if(version<5){db.exec(`BEGIN IMMEDIATE;
 CREATE TABLE IF NOT EXISTS Note(id TEXT PRIMARY KEY,title TEXT NOT NULL DEFAULT '',body TEXT NOT NULL DEFAULT '',revision INTEGER NOT NULL DEFAULT 1,deleted INTEGER NOT NULL DEFAULT 0,createdAt TEXT NOT NULL,updatedAt TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS NoteChangeLog(id TEXT PRIMARY KEY,noteId TEXT NOT NULL REFERENCES Note(id),field TEXT NOT NULL,oldValue TEXT,newValue TEXT,createdAt TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS Note_recent ON Note(deleted,updatedAt);
 PRAGMA user_version=5;COMMIT;`);}
 if(version<6){db.exec(`BEGIN IMMEDIATE;
 ALTER TABLE Note ADD COLUMN clientId TEXT REFERENCES Client(id);
 ALTER TABLE Note ADD COLUMN meeting TEXT NOT NULL DEFAULT '';
 CREATE INDEX Note_client ON Note(clientId);
 PRAGMA user_version=6;COMMIT;`);}
 if(version<7){db.exec("BEGIN IMMEDIATE; ALTER TABLE ClientContact ADD COLUMN telegram TEXT NOT NULL DEFAULT ''; PRAGMA user_version=7; COMMIT;");}
 if(version<8){db.exec("BEGIN IMMEDIATE; CREATE TABLE NoteFolder(path TEXT PRIMARY KEY); ALTER TABLE Note ADD COLUMN folder TEXT NOT NULL DEFAULT ''; PRAGMA user_version=8; COMMIT;");}
 return db;
}
