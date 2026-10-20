export type ExportReport={text:string;clientNames:string[];from:string;to:string};
const clean=(s:string)=>s.replace(/[\r\n\u0000-\u001f]/g,' ').trim();
const md=(s:string)=>clean(s).replace(/[\\`*_[\]<>#]/g,'\\$&');
const date=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)?s.split('-').reverse().join('.'):clean(s);
export function reportMarkdown(r:ExportReport){return '# Отчёт '+(r.clientNames.length===1?'по клиенту «'+md(r.clientNames[0])+'»':'по клиентам')+'\n\n**Клиенты:** '+r.clientNames.map(md).join(', ')+'\n\n**Период:** '+date(r.from)+' — '+date(r.to)+'\n\n'+r.text.trim()+'\n';}
export function reportFilename(r:ExportReport){return ('Отчёт — '+(r.clientNames.length===1?clean(r.clientNames[0]):r.clientNames.length+' клиентов')+' — '+r.from+'_'+r.to).replace(/[\/:*?"<>|\u0000-\u001f]/g,'-').slice(0,180)+'.md';}
