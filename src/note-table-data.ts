// GFM cells split only on unescaped pipes. Keep inline Markdown as source.
export function tableCells(line:string){const cells:string[]=[];let cell='';for(let i=0;i<line.length;i++){const char=line[i];let slashes=0;for(let j=i-1;j>=0&&line[j]==='\\';j--)slashes++;if(char==='|'&&slashes%2===0){cells.push(cell.trim());cell='';}else cell+=char;}cells.push(cell.trim());if(line.trimStart().startsWith('|'))cells.shift();if(/(?<!\\)\|\s*$/.test(line))cells.pop();return cells;}
export function readTable(text:string){const lines=text.split('\n');const header=tableCells(lines[0]);const alignment=tableCells(lines[1]||'');return {rows:[header,...lines.slice(2).map(tableCells)].map(row=>header.map((_,i)=>row[i]||'')),alignment};}
export function writeTable(rows:string[][],alignment:string[]){const line=(cells:string[])=>'| '+cells.join(' | ')+' |';return [line(rows[0]),line(rows[0].map((_,i)=>alignment[i]||'---')),...rows.slice(1).map(line)].join('\n');}
export const cellText=(value:string)=>value.replace(/<br\s*\/?>/gi,'\n').replace(/(\\+)\|/g,(_,slashes:string)=>'\\'.repeat(Math.floor(slashes.length/2))+'|');
export const cellSource=(value:string)=>value.replace(/\r?\n/g,'<br>').replace(/(\\*)\|/g,(_,slashes:string)=>slashes+slashes+'\\|');

// Keep a header, one body row and one column so the result remains an editable GFM table.
export function removeTableRow(table:ReturnType<typeof readTable>,index:number){if(Number.isInteger(index)&&index>0&&index<table.rows.length&&table.rows.length>2)table.rows.splice(index,1);}
export function removeTableColumn(table:ReturnType<typeof readTable>,index:number){if(Number.isInteger(index)&&index>=0&&index<table.rows[0].length&&table.rows[0].length>1){table.rows.forEach(row=>row.splice(index,1));table.alignment.splice(index,1);}}
