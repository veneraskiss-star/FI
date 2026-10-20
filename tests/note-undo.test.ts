import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EditorState,Transaction} from '@codemirror/state';
import {history,undo,redo,isolateHistory} from '@codemirror/commands';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import {NoteMarkdown} from '../src/NoteMarkdown.tsx';
test('Text, table cell and table structure share undo and redo history',()=>{
 let state=EditorState.create({doc:'Текст',extensions:[history()]});
 const target={get state(){return state;},dispatch(tr:Transaction){state=tr.state;}};
 const edit=(text:string)=>{state=state.update({changes:{from:0,to:state.doc.length,insert:text},annotations:isolateHistory.of('full')}).state;};
 edit('Текст\n\n| A |\n| --- |\n| B |');edit('Текст\n\n| A |\n| --- |\n| C |');edit('Текст\n\n| A |\n| --- |\n| C |\n| D |');
 assert.equal(undo(target),true);assert.match(state.doc.toString(),/C \|$/);assert.equal(undo(target),true);assert.match(state.doc.toString(),/B \|$/);assert.equal(undo(target),true);assert.equal(state.doc.toString(),'Текст');assert.equal(redo(target),true);assert.match(state.doc.toString(),/B \|$/);
});
test('Cell line breaks render in live cells and preview without enabling HTML',()=>{
 for(const inline of [false,true]){const text=inline?'Первая<br>Вторая':'| A |\n| --- |\n| Первая<br>Вторая |';const html=renderToStaticMarkup(createElement(NoteMarkdown,{text,inline,onOpen:()=>{}}));assert.match(html,/Первая<br\/>\s*Вторая/);}
 const html=renderToStaticMarkup(createElement(NoteMarkdown,{text:'<script>alert(1)</script>\n\n<br onclick="bad()">',onOpen:()=>{}}));assert.doesNotMatch(html,/<script|onclick/);
});
