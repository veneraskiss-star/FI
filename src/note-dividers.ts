import {StateField,type EditorState} from '@codemirror/state';
import {syntaxTree} from '@codemirror/language';
import {Decoration,EditorView,WidgetType,type DecorationSet} from '@codemirror/view';
export function noteDividerRanges(state:EditorState){const ranges:{from:number;to:number}[]=[];syntaxTree(state).iterate({enter(n){if(n.name==='HorizontalRule')ranges.push({from:n.from,to:n.to});}});return ranges;}
class Divider extends WidgetType{eq(){return true;}toDOM(view:EditorView){const el=document.createElement('div');el.className='note-live-divider';el.setAttribute('role','separator');el.title='Разделитель Markdown';el.onmousedown=e=>{e.preventDefault();const position=view.posAtDOM(el);view.dispatch({selection:{anchor:position}});view.focus();};return el;}}
function dividers(state:EditorState){return Decoration.set(noteDividerRanges(state).map(r=>Decoration.replace({widget:new Divider(),block:true}).range(r.from,r.to)));}
export const noteLiveDividers=StateField.define<DecorationSet>({create:dividers,update(value,tr){return tr.docChanged||syntaxTree(tr.state)!==syntaxTree(tr.startState)?dividers(tr.state):value;},provide:field=>EditorView.decorations.from(field)});
