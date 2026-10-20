import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {noteFilename,noteName,noteText} from '../shared/notes.ts';
import {telegramUsername} from '../shared/telegram.ts';
// Explicit local handoff only: no Telegram API, credentials or automatic sending.
export async function prepareTelegramNote(input:{title:unknown;body:unknown;username:unknown},directory:string){
 const username=telegramUsername(input?.username);if(!username)throw Error('Выберите контакт с Telegram');
 const title=noteText(input.title,200),body=noteText(input.body,100000);const folder=await mkdtemp(join(directory,'fi-note-'));
 const file=join(folder,noteFilename(title));try{await writeFile(file,'# '+noteName(title)+'\n\n'+body+'\n',{mode:0o600});}catch(e){await rm(folder,{recursive:true,force:true});throw e;}
 const xml=file.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
 return {folder,file,fileURL:pathToFileURL(file).href,filenames:Buffer.from('<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><array><string>'+xml+'</string></array></plist>'),url:'tg://resolve?domain='+encodeURIComponent(username)};
}
