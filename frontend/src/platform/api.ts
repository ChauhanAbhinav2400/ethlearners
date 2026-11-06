import type { Progress } from '../lib/storage';
const base=(import.meta.env.VITE_API_URL||'').replace(/\/$/,'');
let csrf='';
export class ApiError extends Error{constructor(message:string,readonly code?:string,readonly status?:number){super(message);this.name='ApiError';}}
export async function api<T=any>(path:string,body?:unknown,method=body===undefined?'GET':'POST'):Promise<T>{
  let response:Response;
  try{
    response=await fetch(`${base}/api${path}`,{method,credentials:'include',headers:{'Content-Type':'application/json','X-Explorer-Client':'web',...(csrf?{'X-CSRF-Token':csrf}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(20000)});
  }catch{
    throw new Error('The server could not be reached. Please try again. Your local lessons still work.');
  }
  const data=await response.json().catch(()=>({error:'The server returned an unreadable response.'}));
  if(!response.ok){const code=typeof data.code==='string'&&/^[a-z0-9_]{1,64}$/.test(data.code)?data.code:undefined;if(import.meta.env.DEV&&path==='/world-id/verify')console.info({event:'world_id.backend_rejected_proof',status:response.status,code:code||'unknown'});throw new ApiError(data.error||'The API is unavailable. Your local lessons still work.',code,response.status);}
  if(typeof data.csrf==='string')csrf=data.csrf;
  if(path==='/auth/logout')csrf='';
  return data;
}
export async function syncReadingProgress(progress:Progress){
  // Reading positions are convenience data, never assessment or reward evidence.
  try{const me=await api('/auth/me');if(!me.student)return;
    const id=progress.lastLesson;await api('/progress',{lessonId:id,stage:progress.scenes[id]||0,completed:progress.completed.includes(id)});
  }catch{/* Keep local learning usable when signed out or offline. */}
}
