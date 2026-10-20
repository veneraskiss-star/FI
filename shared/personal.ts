export type PersonalProfile={name:string;photo:string;playerEnabled:boolean};
export type NowPlaying={source:string;sourceName:string;title:string;artist:string;playing:boolean;position:number;duration:number;artwork?:string};
export const defaultProfile:PersonalProfile={name:'Моё пространство',photo:'',playerEnabled:false};
export function validateProfile(value:unknown):PersonalProfile{const p=value as PersonalProfile;if(!p||typeof p.name!=='string'||!p.name.trim()||p.name.trim().length>60||typeof p.photo!=='string'||p.photo.length>800000||(p.photo!==''&&!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(p.photo))||typeof p.playerEnabled!=='boolean')throw Error('Проверьте имя и фотографию');return {name:p.name.trim(),photo:p.photo,playerEnabled:p.playerEnabled};}
