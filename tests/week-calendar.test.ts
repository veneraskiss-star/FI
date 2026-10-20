import {test} from 'node:test';
import assert from 'node:assert/strict';
import {arrange,monday,shiftDay} from '../src/WeekCalendar.tsx';
import type {CalendarEvent} from '../shared/calendar.ts';
const event={} as CalendarEvent;
test('week navigation crosses month/year and starts on Monday',()=>{
 assert.equal(monday('2027-01-03'),'2026-12-28');
 assert.equal(monday('2026-10-19'),'2026-10-19');
 assert.equal(shiftDay('2026-12-28',7),'2027-01-04');
});
test('overlap groups get separate columns, adjacent meetings reuse full width',()=>{
 const positioned=arrange([{event,start:600,end:660},{event,start:620,end:680},{event,start:680,end:700}]);
 assert.deepEqual(positioned.map(({column,columns})=>({column,columns})),[{column:0,columns:2},{column:1,columns:2},{column:0,columns:1}]);
 assert.deepEqual(arrange([]),[]);
});
test('a chain of overlapping meetings stays in one group',()=>{
 const result=arrange([{event,start:0,end:100},{event,start:10,end:20},{event,start:30,end:110},{event,start:100,end:120}]);
 assert.ok(result.every(e=>e.columns===2));
 assert.deepEqual(result.map(e=>e.column),[0,1,1,0]);
});
