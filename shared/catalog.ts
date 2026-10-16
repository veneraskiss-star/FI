export type Catalog={stages:string[];types:string[];analysts:string[];owners:string[];activityTypes:string[]};
export const defaultCatalog:Catalog={stages:['Знакомство'],types:['Presale','Upsale','Другое'],analysts:[],owners:[],activityTypes:['Встреча','Звонок','Переписка','Изменение','Заметка']};
export const catalogLabels:Record<keyof Catalog,string>={stages:'Этапы работы',types:'Типы клиентов',analysts:'Ответственные аналитики',owners:'Ответственные за задачи',activityTypes:'Типы записей истории'};
export const healthOptions=['По плану','Есть риски','Проблемы'];
export const taskStatuses=['Запланировано','В работе','Ожидание','Выполнено'];
export function validateCatalog(value:unknown):Catalog{
 if(!value||typeof value!=='object')throw Error('Проверьте варианты полей');const result={} as Catalog;
 for(const key of Object.keys(defaultCatalog) as (keyof Catalog)[]){const items=(value as Catalog)[key];if(!Array.isArray(items)||items.length>100||items.some(x=>typeof x!=='string'||!x.trim()||x!==x.trim()||x.length>200)||new Set(items.map(x=>x.toLocaleLowerCase('ru'))).size!==items.length)throw Error('Проверьте список «'+catalogLabels[key]+'»: уникальные непустые варианты, до 200 символов');if(['stages','types','activityTypes'].includes(key)&&!items.length)throw Error('Добавьте хотя бы один вариант в «'+catalogLabels[key]+'»');result[key]=[...items];}return result;
}
