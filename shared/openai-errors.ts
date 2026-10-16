/** Display only diagnostic identifiers; raw provider text can echo private input. */
export function openAIError(body:unknown,status?:number,requestId?:string|null){
 const obj=body&&typeof body==='object'?body as Record<string,any>:{};
 const error=obj.error&&typeof obj.error==='object'?obj.error:obj;
 const identifier=(v:unknown)=>typeof v==='string'&&/^[a-zA-Z0-9_.\[\]-]{1,160}$/.test(v)?v:undefined;
 const code=identifier(error.code);const param=identifier(error.param);
 const reasons:Record<string,string>={
 subscription_sharing_user_not_eligible:'Использование плана ChatGPT недоступно для выбранного аккаунта или рабочего пространства.',
 subscription_sharing_usage_limit_exceeded:'Достигнут лимит использования ChatGPT. Проверьте лимиты Project Hub в настройках ChatGPT.',
 subscription_sharing_usage_unavailable:'OpenAI временно не может проверить лимиты. Попробуйте позже.',
 subscription_sharing_user_unavailable:'Аккаунт или рабочее пространство временно недоступны. Попробуйте позже.',
 subscription_sharing_unsupported_capability:'OpenAI не поддерживает один из параметров запроса или выбранную модель.',
 subscription_sharing_route_not_supported:'OpenAI не разрешает этот маршрут для подключения ChatGPT.',
 subscription_sharing_invalid_user:'OpenAI не смог подтвердить подключение аккаунта ChatGPT.',
 chatpass_v2_scope_not_authorized:'Разрешения подключения ChatGPT не позволяют выполнить анализ.',
 chatpass_v2_invalid_authorization_context:'OpenAI отклонил разрешения подключения ChatGPT.',
 model_not_found:'Выбранная модель недоступна. Откройте разбор заново и выберите другую модель.',
 invalid_grant:'Подключение ChatGPT истекло или отозвано. Войдите повторно.',
 };
 const fallback=status===401?'OpenAI не принял подключение ChatGPT. Проверьте выбранный аккаунт.':status===403?'OpenAI ограничил доступ к анализу. Причиной могут быть разрешения аккаунта или регион обслуживания.':status===429?'OpenAI ограничил запросы. Проверьте лимиты в настройках ChatGPT и попробуйте позже.':status&&status>=500?'Сервис OpenAI временно недоступен. Попробуйте позже.':status===400?'OpenAI отклонил формат запроса. Передайте код ошибки разработчику.':'ChatGPT не завершил анализ.';
 const diagnostics=[status?`HTTP ${status}`:'',code?`код: ${code}`:'',param?`поле: ${param}`:'',identifier(requestId)?`запрос: ${requestId}`:'',typeof obj.detail==='string'?'ответ сервера: detail':''].filter(Boolean).join('; ');
 return new Error((code&&reasons[code]||fallback)+(diagnostics?` (${diagnostics})`:''));
}
export async function responseError(response:Response){
 let body:unknown;const reader=response.body?.getReader();if(reader){let raw='';let length=0;const decoder=new TextDecoder();try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>16384)break;raw+=decoder.decode(value,{stream:true});}try{body=JSON.parse(raw);}catch{body=undefined;}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}}
 return openAIError(body,response.status,response.headers.get('x-request-id')||response.headers.get('openai-request-id'));
}
