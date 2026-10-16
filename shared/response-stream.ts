/** Read Responses SSE events without assuming chunk boundaries align with events. */
export async function readResponseStream(stream:ReadableStream<Uint8Array>){
 const reader=stream.getReader();const decoder=new TextDecoder();let pending='',text='',completed=false,total=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;total+=value.byteLength;if(total>4_000_000)throw Error('Ответ слишком большой');pending+=decoder.decode(value,{stream:true});let boundary:RegExpExecArray|null;
 while((boundary=/\r?\n\r?\n/.exec(pending))){const block=pending.slice(0,boundary.index);pending=pending.slice(boundary.index+boundary[0].length);const raw=block.split(/\r?\n/).filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trimStart()).join('\n');if(!raw||raw==='[DONE]')continue;const event=JSON.parse(raw);if(event.type==='response.output_text.delta')text+=event.delta||'';if(event.type==='response.completed')completed=true;if(['response.failed','response.incomplete','error'].includes(event.type))throw Error('ChatGPT не завершил анализ. Попробуйте ещё раз.');}}
 if(!completed)throw Error('Соединение прервалось до завершения анализа');return text;
 }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
