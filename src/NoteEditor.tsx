import {noteLiveDividers} from './note-dividers';
import {GFM} from '@lezer/markdown';
import {noteLiveTables,noteOpenLink} from './note-tables';
import {noteLiveMarkers} from './note-markers';
import {useEffect,useRef,useImperativeHandle,forwardRef} from 'react';
import {EditorState} from '@codemirror/state';
import {EditorView,keymap,placeholder,drawSelection} from '@codemirror/view';
import {undo,redo,defaultKeymap,history,historyKeymap,indentMore,indentLess} from '@codemirror/commands';
import {markdown,markdownKeymap} from '@codemirror/lang-markdown';
import {HighlightStyle,syntaxHighlighting} from '@codemirror/language';
import {tags} from '@lezer/highlight';
const style=HighlightStyle.define([
 {tag:tags.heading1,class:'note-md-h1'},{tag:tags.heading2,class:'note-md-h2'},{tag:tags.heading3,class:'note-md-h3'},
 {tag:[tags.heading4,tags.heading5,tags.heading6],class:'note-md-h4'},
 {tag:tags.strong,class:'note-md-strong'},{tag:tags.emphasis,class:'note-md-em'},
 {tag:tags.strikethrough,class:'note-md-strike'},{tag:tags.monospace,class:'note-md-code'},
 {tag:[tags.link,tags.url],class:'note-md-link'},{tag:tags.meta,class:'note-md-mark'},
 {tag:tags.quote,class:'note-md-quote'}
]);
export type NoteEditorHandle={insertTable:()=>void;undo:()=>void;redo:()=>void};
export const NoteEditor=forwardRef<NoteEditorHandle,{value:string;onChange:(value:string)=>void;onSave:()=>void;onOpen?:(url:string)=>void}>(function NoteEditor({value,onChange,onSave,onOpen},ref){
 const host=useRef<HTMLDivElement>(null);const editor=useRef<EditorView|undefined>(undefined);const callbacks=useRef({onChange,onSave,onOpen});callbacks.current={onChange,onSave,onOpen};
 useImperativeHandle(ref,()=>({undo(){if(editor.current)undo(editor.current);},redo(){if(editor.current)redo(editor.current);},insertTable(){const view=editor.current;if(!view)return;const {from,to}=view.state.selection.main;const prefix=from?'\n\n':'';const text=prefix+'| Колонка 1 | Колонка 2 |\n| --- | --- |\n| Значение | Значение |\n\n';view.dispatch({changes:{from,to,insert:text},selection:{anchor:from+text.length},scrollIntoView:true});view.focus();}}),[]);
 useEffect(()=>{const view=new EditorView({parent:host.current!,state:EditorState.create({doc:value,extensions:[markdown({extensions:GFM}),noteLiveTables,noteOpenLink.of(url=>callbacks.current.onOpen?.(url)),noteLiveMarkers,noteLiveDividers,history(),drawSelection(),EditorView.lineWrapping,syntaxHighlighting(style),EditorView.contentAttributes.of({'aria-label':'Текст заметки в Markdown',spellcheck:'false'}),placeholder('Начните писать…'),EditorState.transactionFilter.of(tr=>tr.newDoc.length>100000?[]:tr),keymap.of([{key:'Mod-s',run:()=>{callbacks.current.onSave();return true;}},...markdownKeymap,{key:'Tab',run:indentMore},{key:'Shift-Tab',run:indentLess},...defaultKeymap,...historyKeymap]),EditorView.updateListener.of(u=>{if(u.docChanged)callbacks.current.onChange(u.state.doc.toString());})]})});editor.current=view;return()=>{view.destroy();editor.current=undefined;};},[]);
 useEffect(()=>{const view=editor.current;if(view&&view.state.doc.toString()!==value)view.dispatch({changes:{from:0,to:view.state.doc.length,insert:value}});},[value]);
 return <div className="note-editor" ref={host}/>;
});
