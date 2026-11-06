import type { Config } from './config';
export function worldDiagnostic(c:Config,event:string,code?:string){
  if(c.NODE_ENV!=='development')return;
  // Deliberate allowlist: no keys, cookies, student IDs, signals, nullifiers or proofs.
  console.info(JSON.stringify({event:`world_id.${event}`,appId:c.WORLD_ID_APP_ID,rpId:c.WORLD_ID_RP_ID,action:c.WORLD_ID_ACTION,environment:c.WORLD_ID_ENVIRONMENT,credentialMode:c.WORLD_ID_CREDENTIAL_MODE,...(code?{code}: {})}));
}
export function worldScope(c:Config){const base=`${c.WORLD_ID_ENVIRONMENT}:${c.WORLD_ID_RP_ID}:${c.WORLD_ID_ACTION}`;return c.WORLD_ID_CREDENTIAL_MODE==='orb-legacy'?`${base}:orb-legacy`:base;}
