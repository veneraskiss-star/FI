import {Plus,Minus} from 'lucide-react';
import {useLayoutEffect,useState} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {undo,redo,isolateHistory} from '@codemirror/commands';
import {Facet,StateField,Transaction,type EditorState} from '@codemirror/state';
import {syntaxTree} from '@codemirror/language';
import {Decoration,EditorView,WidgetType,type DecorationSet} from '@codemirror/view';
import {NoteMarkdown} from './NoteMarkdown';
import {readTable,writeTable,cellText,cellSource,removeTableRow,removeTableColumn} from './note-table-data';
export const noteOpenLink=Facet.define<(url:string)=>void,(url:string)=>void>({combine:values=>values[0]||(()=>{})});
export function noteTableRanges(state:EditorState,_hasFocus=false){const tables:{from:number;to:number;text:string}[]=[];syntaxTree(state).iterate({enter(n){if(n.name!=='Table')return;if(n.node.parent?.name!=='Document')return false;tables.push({from:n.from,to:n.to,text:state.doc.sliceString(n.from,n.to)});return false;}});return tables;}
function RenderTable({text,from,view}:{text:string;from:number;view:EditorView}){
 const [active,setActive]=useState<string>();const [selected,setSelected]=useState<string>();const data=readTable(text);
 const [selectedRow,selectedCol]=(active||selected||'').split(':').map(Number);
 const removeRow=Number.isInteger(selectedRow)&&selectedRow>0?Math.min(selectedRow,data.rows.length-1):data.rows.length-1;
 const removeCol=Number.isInteger(selectedCol)?Math.min(selectedCol,data.rows[0].length-1):data.rows[0].length-1;
 useLayoutEffect(()=>{view.requestMeasure();},[text,view]);
 function change(edit:(table:ReturnType<typeof readTable>)=>void,typing=false){const table=noteTableRanges(view.state).find(t=>t.from===from);if(!table)return;const next=readTable(table.text);edit(next);view.dispatch({changes:{from:table.from,to:table.to,insert:writeTable(next.rows,next.alignment)},annotations:typing?Transaction.userEvent.of("input.type"):isolateHistory.of("full")});}
 function move(row:number,col:number,back=false){let index=row*data.rows[0].length+col+(back?-1:1);if(index<0)return;const columns=data.rows[0].length;if(index>=data.rows.length*columns)change(t=>t.rows.push(t.rows[0].map(()=>'')));setActive(Math.floor(index/columns)+':'+index%columns);}
 return <div className="note-table-frame" onKeyDownCapture={e=>{if((e.metaKey||e.ctrlKey)&&!e.altKey&&(e.key.toLowerCase()==='z'||e.code==='KeyZ')){e.preventDefault();e.stopPropagation();(e.shiftKey?redo:undo)(view);}}}><div className="note-table-grid"><table><thead><tr>{data.rows[0].map((_,col)=>cell(0,col,true))}</tr></thead><tbody>{data.rows.slice(1).map((row,r)=><tr key={r}>{row.map((_,c)=>cell(r+1,c))}</tr>)}</tbody></table></div><button className="note-table-add note-table-add-row" type="button" aria-label="Добавить строку" title="Добавить строку" onClick={()=>change(t=>t.rows.push(t.rows[0].map(()=>'')))}><Plus size={14}/></button><button className="note-table-add note-table-add-column" type="button" aria-label="Добавить столбец" title="Добавить столбец" onClick={()=>change(t=>{t.rows.forEach(row=>row.push(''));t.alignment.push('---');})}><Plus size={14}/></button><button className="note-table-add note-table-remove-row" type="button" aria-label={'Удалить строку '+(removeRow+1)} title={'Удалить строку '+(removeRow+1)} disabled={data.rows.length<=2} onClick={()=>{change(t=>removeTableRow(t,removeRow));setActive(undefined);setSelected(undefined);}}><Minus size={14}/></button><button className="note-table-add note-table-remove-column" type="button" aria-label={'Удалить столбец '+(removeCol+1)} title={'Удалить столбец '+(removeCol+1)} disabled={data.rows[0].length<=1} onClick={()=>{change(t=>removeTableColumn(t,removeCol));setActive(undefined);setSelected(undefined);}}><Minus size={14}/></button></div>;
 function cell(row:number,col:number,heading=false){const key=row+':'+col;const Tag=heading?'th':'td';const align=data.alignment[col]||'';return <Tag key={col} style={{textAlign:align.startsWith(':')&&align.endsWith(':')?'center':align.endsWith(':')?'right':'left'}}><div className="note-table-cell-box" data-editing={active===key||undefined}>{active===key&&<textarea rows={1} autoFocus onFocus={()=>setSelected(key)} aria-label={'Ячейка '+(row+1)+', '+(col+1)} value={cellText(data.rows[row][col])} onChange={e=>{const value=e.target.value;change(t=>{if(t.rows[row])t.rows[row][col]=cellSource(value);},true);}} onBlur={()=>setActive(v=>v===key?undefined:v)} onKeyDown={e=>{if(e.key==='Tab'){e.preventDefault();move(row,col,e.shiftKey);}else if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();if(row+1>=data.rows.length)change(t=>t.rows.push(t.rows[0].map(()=>'')));setActive((row+1)+':'+col);}else if(e.key==='Escape'){e.preventDefault();setActive(undefined);view.focus();}}}/>}<button type="button" className="note-table-cell" style={{minHeight:`calc(${cellText(data.rows[row][col]).split("\n").length} * 1.7em + 20px)`}} tabIndex={active===key?-1:0} aria-hidden={active===key||undefined} aria-label={'Редактировать ячейку '+(row+1)+', '+(col+1)} onClick={()=>{setSelected(key);setActive(key);}}><NoteMarkdown inline text={data.rows[row][col]||'\u00a0'} onOpen={()=>setActive(key)}/></button></div></Tag>;}
}
const roots=new WeakMap<HTMLElement,Root>();
class TableWidget extends WidgetType{
 constructor(private text:string,private from:number){super();}
 eq(other:TableWidget){return other.text===this.text&&other.from===this.from;}
 get estimatedHeight(){return Math.max(100,this.text.split('\n').length*38);}
 private render(dom:HTMLElement,view:EditorView){roots.get(dom)!.render(<RenderTable text={this.text} from={this.from} view={view}/>);}
 toDOM(view:EditorView){const dom=document.createElement('div');dom.className='note-markdown note-live-table';roots.set(dom,createRoot(dom));this.render(dom,view);return dom;}
 updateDOM(dom:HTMLElement,view:EditorView){this.render(dom,view);return true;}
 destroy(dom:HTMLElement){const root=roots.get(dom);if(root)queueMicrotask(()=>root.unmount());}
}
function tables(state:EditorState){return Decoration.set(noteTableRanges(state).map(t=>Decoration.replace({widget:new TableWidget(t.text,t.from),block:true}).range(t.from,t.to)));}
const tableState=StateField.define<DecorationSet>({create:tables,update(value,tr){return tr.docChanged||syntaxTree(tr.state)!==syntaxTree(tr.startState)?tables(tr.state):value;},provide:field=>EditorView.decorations.from(field)});
export const noteLiveTables=[tableState,EditorView.atomicRanges.of(view=>view.state.field(tableState))];
