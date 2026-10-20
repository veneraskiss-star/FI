import type {EditorState} from '@codemirror/state';
import {syntaxTree} from '@codemirror/language';
import {Decoration,WidgetType,ViewPlugin,type EditorView,type ViewUpdate,type DecorationSet} from '@codemirror/view';
// Decorations affect the editor view only. The saved Markdown is never rewritten.
export function hiddenNoteMarkers(state:EditorState,focused:boolean){
 const ranges:{from:number;to:number}[]=[];
 const active=(from:number,to:number)=>focused&&state.selection.ranges.some(r=>state.doc.lineAt(r.from).from<=to&&state.doc.lineAt(r.to).to>=from);
 syntaxTree(state).iterate({enter(node){
  if(node.name==='Link'&&state.doc.sliceString(node.from,node.to).includes('](')&&!active(node.from,node.to)){
   const children=[];for(let c=node.node.firstChild;c;c=c.nextSibling)children.push(c);
   const marks=children.filter(c=>c.name==='LinkMark');
   if(marks.length>=2){ranges.push({from:marks[0].from,to:marks[0].to},{from:marks[1].from,to:node.to});}
  }
  if(!['HeaderMark','EmphasisMark','StrikethroughMark','QuoteMark','CodeMark'].includes(node.name)||active(node.from,node.to))return;
  if(node.name==='CodeMark'&&node.node.parent?.name!=='InlineCode')return;
  let to=node.to;
  if(node.name==='HeaderMark'||node.name==='QuoteMark')while(to<state.doc.lineAt(node.to).to&&state.doc.sliceString(to,to+1)===' ')to++;
  ranges.push({from:node.from,to});
 }});
 return ranges.sort((a,b)=>a.from-b.from||a.to-b.to);
}
class ListBullet extends WidgetType{toDOM(){const el=document.createElement('span');el.className='note-list-bullet';el.textContent='•';return el;}}
function decorations(view:EditorView){const items:ReturnType<Decoration["range"]>[]=[];syntaxTree(view.state).iterate({enter(node){if(node.name!=='ListMark'||!/^[-+*]$/.test(view.state.doc.sliceString(node.from,node.to)))return;const line=view.state.doc.lineAt(node.from);if(view.hasFocus&&view.state.selection.ranges.some(r=>r.from<=line.to&&r.to>=line.from))return;items.push(Decoration.replace({widget:new ListBullet()}).range(node.from,node.to));}});return Decoration.set([...items,...hiddenNoteMarkers(view.state,view.hasFocus).filter(r=>!view.state.doc.sliceString(r.from,r.to).includes('\n')).map(r=>Decoration.replace({}).range(r.from,r.to))],true);}
export const noteLiveMarkers=ViewPlugin.fromClass(class{
 decorations:DecorationSet;tree;
 constructor(view:EditorView){this.decorations=decorations(view);this.tree=syntaxTree(view.state);}
 update(u:ViewUpdate){if(u.docChanged||u.selectionSet||u.focusChanged||u.viewportChanged||this.tree!==syntaxTree(u.state)){this.decorations=decorations(u.view);this.tree=syntaxTree(u.state);}}
},{decorations:v=>v.decorations});
