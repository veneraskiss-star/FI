import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
export function openDatabase(path:string){
 mkdirSync(dirname(path),{recursive:true}); const db=new DatabaseSync(path);
 db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
 CREATE TABLE IF NOT EXISTS Client(id TEXT PRIMARY KEY,name TEXT NOT NULL,analyst TEXT NOT NULL DEFAULT '',type TEXT NOT NULL DEFAULT 'Другое',stage TEXT NOT NULL DEFAULT 'Знакомство',health TEXT NOT NULL DEFAULT 'По плану',state TEXT NOT NULL DEFAULT '',risks TEXT NOT NULL DEFAULT '',archived INTEGER NOT NULL DEFAULT 0,createdAt TEXT NOT NULL,updatedAt TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS Task(id TEXT PRIMARY KEY,clientId TEXT NOT NULL REFERENCES Client(id),title TEXT NOT NULL,owner TEXT NOT NULL DEFAULT '',start TEXT NOT NULL DEFAULT '',deadline TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'Запланировано',createdAt TEXT NOT NULL,updatedAt TEXT NOT NULL,completedAt TEXT);
 CREATE TABLE IF NOT EXISTS Activity(id TEXT PRIMARY KEY,clientId TEXT NOT NULL REFERENCES Client(id),type TEXT NOT NULL,date TEXT NOT NULL,title TEXT NOT NULL,body TEXT NOT NULL DEFAULT '',createdAt TEXT NOT NULL,updatedAt TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS ChangeLog(id TEXT PRIMARY KEY,clientId TEXT NOT NULL REFERENCES Client(id),entity TEXT NOT NULL,entityId TEXT NOT NULL,field TEXT NOT NULL,oldValue TEXT,newValue TEXT,createdAt TEXT NOT NULL); PRAGMA user_version=1;`);
 return db;
}
