import { useRef,useState } from 'react';
import { Link,useNavigate } from 'react-router-dom';
import { IDKitRequestWidget,proofOfHuman,orbLegacy,type RpContext } from '@worldcoin/idkit';
import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';
import { api,ApiError } from './api';
import { worldErrorMessage } from './worldErrors';
import { ArrowRight, Check, CheckCircle2, Circle, ShieldCheck } from 'lucide-react';
import './reward-journey.css';
type WorldRequest={credentialMode?:'proof-of-human'|'orb-legacy';id:string;appId:`app_${string}`;action:string;environment:'production'|'staging';signal:string;rpContext:RpContext};
export function WorldVerification({challengeHref='/dashboard#chapter-paths'}:{challengeHref?:string}={}){
  const navigate=useNavigate();
  const client=useQueryClient();
  // Eligibility can change in another tab or while the wallet prompt is open.
  // Do not inherit the app's 20-second cache and disabled focus refresh here.
  const status=useQuery({
    queryKey:['world'],queryFn:()=>api('/world-id/status'),
    staleTime:0,refetchOnMount:'always',refetchOnWindowFocus:'always',
    refetchInterval:query=>query.state.data?.verified||query.state.status==='error'?false:10000,
    refetchIntervalInBackground:false,
  });
  const [request,setRequest]=useState<WorldRequest|null>(null);const [open,setOpen]=useState(false);const [error,setError]=useState('');
  const backendError=useRef('');
  const verifiedResult=useRef<{accountSwitched?:boolean;existingAccount?:boolean;redirectTo?:string}|null>(null);
  const diagnostic=(event:string,fields:Record<string,unknown>={})=>{if(import.meta.env.DEV)console.info({event:`world_id.${event}`,...fields});};
  const start=useMutation({mutationFn:()=>api<WorldRequest>('/world-id/request',{}),onMutate:()=>{backendError.current='';verifiedResult.current=null;setError('');setRequest(null);},onSuccess:r=>{setRequest(r);setOpen(true);diagnostic('widget_opened',{appId:r.appId,rpId:r.rpContext.rp_id,action:r.action,environment:r.environment});},onError:e=>setError(e.message)});
  const verified = Boolean(status.data?.verified);
  return <section className="platform-card world-verification" id="world-verification" aria-labelledby="world-verification-title">
    <div className="world-verification-heading">
      <span className="world-verification-emblem"><ShieldCheck size={27} aria-hidden="true" /></span>
      <div><span className="section-eyebrow">STEP 03 · HUMAN VERIFICATION</span><h3 id="world-verification-title">{verified ? 'Your identity is verified.' : 'One human, one chapter attempt'}</h3><p>{verified ? 'Your World ID is connected to this learning account.' : 'The final setup step before your reward-eligible Master Challenge.'}</p></div>
    </div>
    {status.data?.scopeChanged&&<p className="platform-error" role="alert">This account uses an earlier World ID configuration. Contact the operator to restore it; changing the action must not reset your rewards.</p>}
    {verified ? <><div className="world-verified-state" role="status"><CheckCircle2 size={23} aria-hidden="true" /><div><strong>Verified · {status.data.environment}</strong><p>{status.data.environment!=='production' ? 'Simulation only; rewards disabled.' : 'World ID is complete. Keep your reward wallet selected and finish a chapter quiz to submit its Master Challenge.'}</p></div></div>{status.data.environment==='production'&&(challengeHref.startsWith('#')?<a className="btn btn-primary" href={challengeHref}>Continue to your challenge<ArrowRight size={16} aria-hidden="true" /></a>:<Link className="btn btn-primary" to={challengeHref}>Continue to your challenge<ArrowRight size={16} aria-hidden="true" /></Link>)}</> : <>
      <p className="world-status-description" aria-live="polite">{status.isPending ? 'Checking your saved quiz and wallet...' : status.isError ? 'Could not check eligibility. Refresh to try again.' : status.data?.canVerify ? 'Your saved quiz and verified reward wallet are ready.' : 'Finish the checklist below to unlock World ID. Your progress is checked automatically.'}</p>
      {status.data&&!status.isError&&<ul className="world-checklist" aria-label="World ID requirements">
        <li className={status.data.walletVerified?'is-complete':''}>{status.data.walletVerified ? <Check size={17} aria-hidden="true" /> : <Circle size={17} aria-hidden="true" />}<span>Wallet ownership signed and reward wallet selected: <strong>{status.data.walletVerified?'Complete':'Needed'}</strong></span></li>
        <li className={status.data.quizCompleted?'is-complete':''}>{status.data.quizCompleted ? <Check size={17} aria-hidden="true" /> : <Circle size={17} aria-hidden="true" />}<span>Five correct quiz answers saved to this account: <strong>{status.data.quizCompleted?'Complete':'Needed'}</strong></span></li>
      </ul>}
      {status.data&&!status.data.walletVerified&&<div className="world-next-step"><Link to="/wallet">Connect, verify, and select a wallet<ArrowRight size={15} aria-hidden="true" /></Link><p>Complete step 2 first: connect your wallet, sign its ownership message, then choose “Use for rewards”.</p></div>}
      {status.data?.walletVerified&&!status.data.quizCompleted&&<div className="world-next-step"><Link to="/dashboard">Choose a chapter<ArrowRight size={15} aria-hidden="true" /></Link><p>Complete all five questions in one chapter first. Make sure you are signed in so your answers are saved.</p></div>}
      <div className="world-verify-action"><button className="btn btn-primary" disabled={start.isPending||status.isPending||status.isError||status.data?.configured===false||!status.data?.canVerify||status.data?.scopeChanged} onClick={()=>start.mutate()}><ShieldCheck size={17} aria-hidden="true" />Verify with World ID</button><button className="text-button" disabled={status.isFetching||start.isPending} onClick={()=>void status.refetch()}>{status.isFetching?'Checking eligibility...':'Refresh eligibility'}</button></div>
      {start.isPending&&<p className="world-status-description" role="status">Preparing your verification request…</p>}
      {status.data?.configured===false&&<p className="world-config-notice">World ID is not available yet. The platform operator needs to finish its setup before you can verify. You can keep learning in the meantime.</p>}
      {status.data&&!status.isError&&typeof status.data.canVerify!=='boolean'&&<p className="world-config-notice" role="alert">Eligibility could not be confirmed. The platform needs an update; contact the operator, then refresh eligibility.</p>}
    </>}
    {(error||status.error)&&<p className="platform-error" role="alert">{error||status.error?.message}</p>}
    <details className="world-verification-details"><summary>How World ID and your chapter attempt work</summary><p>World ID verifies a supported Orb credential. Changing accounts or wallets does not reset a chapter’s reward attempt.</p><p>If a fresh verified proof belongs to an existing account, we will sign you into that account and open its dashboard. Wallets and progress from this account will not be merged.</p></details>
    {request&&<IDKitRequestWidget key={request.id} open={open} onOpenChange={setOpen} app_id={request.appId} action={request.action} rp_context={request.rpContext} preset={request.credentialMode==='orb-legacy'?orbLegacy({signal:request.signal}):proofOfHuman({signal:request.signal})} allow_legacy_proofs={request.credentialMode==='orb-legacy'} environment={request.environment} handleVerify={async proof=>{try{diagnostic('proof_received');verifiedResult.current=await api('/world-id/verify',{requestId:request.id,proof});}catch(cause){const code=cause instanceof ApiError?cause.code:undefined;backendError.current=cause instanceof Error?`${cause.message}${code?` [${code}]`:''}`:'The backend could not verify this result.';setError(backendError.current);throw cause;}}} onSuccess={async()=>{setOpen(false);diagnostic('verification_succeeded');if(verifiedResult.current?.accountSwitched){await client.cancelQueries();client.clear();navigate('/dashboard',{replace:true,state:{worldIdAccountRestored:true}});}else{await client.invalidateQueries({queryKey:['world']});await client.invalidateQueries({queryKey:['master']});await client.invalidateQueries({queryKey:['dashboard']});await client.invalidateQueries({queryKey:['me']});}}} onError={code=>{diagnostic('verification_failed',{code,backendCode:code==='failed_by_host_app'?(backendError.current.match(/\[([a-z0-9_]+)\]$/)?.[1]||'unknown'):undefined});setError(worldErrorMessage(code,backendError.current));if(code==='failed_by_host_app')setOpen(false);}} />}</section>;
}
