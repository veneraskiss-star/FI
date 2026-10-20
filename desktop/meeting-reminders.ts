import type {CalendarEvent} from '../shared/calendar.ts';
export function dueMeetings(events:CalendarEvent[],now:number,seen:Set<string>){return events.filter(e=>{const start=Date.parse(e.start);return !e.allDay&&Number.isFinite(start)&&start>now&&start-now<=600000&&!seen.has(meetingKey(e));});}
export const meetingKey=(e:CalendarEvent)=>JSON.stringify([e.calendarUrl,e.uid,e.start]);
