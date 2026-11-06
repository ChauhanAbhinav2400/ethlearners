import { beforeAll,afterAll,beforeEach,afterEach,describe,it,expect,vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import request from 'supertest';
import { privateKeyToAccount } from 'viem/accounts';
import { hashSignal } from '@worldcoin/idkit-core/hashing';
import { computeRpSignatureMessage } from '@worldcoin/idkit-core/signing';
import { verifyMessage as verifySignedMessage,hexToBytes } from 'viem';
import { createApp } from '../src/app';
import { envSchema } from '../src/config';
import { connectDatabase,Student,Verification,MCQProgress,Attempt,Eligibility,Wallet,Claim,Achievement,Challenge,RewardTransaction,Session } from '../src/models';
import { assessments } from '../src/content/assessments';
import { chapters,REWARD_AMOUNT } from '../../packages/shared/curriculum';
import { submitMaster,claimReward,unlockAchievements } from '../src/rewards';
import { processReward } from '../src/workerService';
import type { ChainAdapter } from '../src/blockchain';
import { verifyWorld,worldRequest,canonicalField } from '../src/world';
let mongo:MongoMemoryReplSet;
const c=envSchema.parse({NODE_ENV:'test',MONGODB_URI:'placeholder',SESSION_SECRET:'s'.repeat(40),IDENTITY_SECRET:'i'.repeat(40),REWARD_ID_SECRET:'r'.repeat(40),WORLD_ID_APP_ID:'app_test',WORLD_ID_RP_ID:'rp_test',WORLD_ID_ACTION:'ethereum-explorer-human-v1',WORLD_ID_SIGNING_KEY:'0x'+'11'.repeat(32)});
let app=createApp(c);const origin=c.FRONTEND_ORIGIN;
const post=(agent:any,path:string,body:unknown,csrf?:string)=>agent.post('/api'+path).set('Origin',origin).set('X-Explorer-Client','web').set('X-CSRF-Token',csrf||'').send(body);
async function register(username='learner'){const agent=request.agent(app);const result=await post(agent,'/auth/register',{username,displayName:'A learner',password:'a long test password'});expect(result.status).toBe(201);return {agent,student:result.body.student,csrf:result.body.csrf,recovery:result.body.recoveryCode};}
async function readyForWorld(student:string,chapterId='dev-00'){
  let wallet=await Wallet.findOne({student});
  if(!wallet)wallet=await Wallet.create({student,address:'0x'+String(student).padStart(40,'0'),verifiedAt:new Date()});
  await Student.updateOne({_id:student},{$set:{rewardWallet:wallet.address}});
  await MCQProgress.updateOne({student,chapterId},{$set:{completed:assessments[chapterId].quiz.map(q=>q.id)}},{upsert:true});
}
async function eligible(student:string,chapterId='dev-00',human='human-one'){
  await readyForWorld(student,chapterId);
  await Verification.create({student,human,scope:'production:rp_test:ethereum-explorer-human-v1',environment:'production',verifiedAt:new Date()});

}
beforeAll(async()=>{mongo=await MongoMemoryReplSet.create({replSet:{count:1,storageEngine:'wiredTiger'}});await connectDatabase(mongo.getUri());});
beforeEach(async()=>{app=createApp(c);for(const model of Object.values(mongoose.models))await model.deleteMany({});});
afterEach(()=>vi.unstubAllGlobals());
afterAll(async()=>{await mongoose.disconnect();await mongo?.stop();});

describe('curated assessment contract',()=>{
  it('has five MCQs and a distinct master for every stable chapter',()=>{
    expect(chapters).toHaveLength(29);expect(new Set(chapters.map(c=>c.rewardScope)).size).toBe(29);
    for(const chapter of chapters){const bank=assessments[chapter.id];expect(bank.quiz).toHaveLength(5);for(const q of [...bank.quiz,bank.master]){expect(q.options).toHaveLength(4);expect(new Set(q.options).size).toBe(4);expect(q.explanation.length).toBeGreaterThan(20);}expect(bank.quiz.some(q=>q.prompt===bank.master.prompt)).toBe(false);}
  });
});
describe('accounts, privacy and grading',()=>{
  it('registers, persists sessions, enforces normalized username uniqueness and logs out',async()=>{
    const r=await register('Learner');expect(r.student.username).toBe('learner');expect((await r.agent.get('/api/auth/me')).body.student.username).toBe('learner');
    expect((await post(request(app),'/auth/register',{username:'LEARNER',displayName:'Other',password:'a different long password'})).status).toBe(409);
    expect((await post(r.agent,'/auth/logout',{},r.csrf)).status).toBe(200);expect((await r.agent.get('/api/auth/me')).body.student).toBe(null);
    expect((await post(r.agent,'/auth/login',{username:'learner',password:'a long test password'})).status).toBe(200);
  });
  it('requires origin and CSRF and never accepts reward evidence from local reading state',async()=>{
    const r=await register();expect((await r.agent.post('/api/progress').send({})).status).toBe(403);
    expect((await post(r.agent,'/progress',{lessonId:'gas',stage:7,completed:true})).status).toBe(403);
    expect((await post(r.agent,'/progress/import',{lessons:[{lessonId:'gas',stage:7,completed:true}]},r.csrf)).status).toBe(200);
    expect((await post(r.agent,'/chapters/dev-07/master-challenge/submit',{selected:0,confirmed:true},r.csrf)).status).toBe(403);
    expect(await Eligibility.countDocuments()).toBe(0);
  });
  it('does not expose answer keys and saves retryable quiz progress only when correct',async()=>{
    const r=await register();const quiz=await r.agent.get('/api/chapters/dev-00/quiz');expect(quiz.body.questions[0]).not.toHaveProperty('answer');expect(quiz.body.questions[0]).not.toHaveProperty('explanation');
    const q=assessments['dev-00'].quiz[0];const wrong=await post(r.agent,'/chapters/dev-00/quiz/submit',{questionId:q.id,selected:(q.answer+1)%4},r.csrf);expect(wrong.body.correct).toBe(false);
    expect(await MCQProgress.countDocuments()).toBe(0);
    for(const q of assessments['dev-00'].quiz)expect((await post(r.agent,'/chapters/dev-00/quiz/submit',{questionId:q.id,selected:q.answer},r.csrf)).body.correct).toBe(true);
    const master=(await r.agent.get('/api/chapters/dev-00/master-challenge')).body;expect(master.unlocked).toBe(true);expect(master.question).not.toHaveProperty('answer');
  });
  it('rejects client-provided success or amounts and makes incorrect master results permanent',async()=>{
    const r=await register();await eligible(r.student.id);
    expect((await post(r.agent,'/chapters/dev-00/master-challenge/submit',{selected:0,confirmed:true,passed:true,rewardAmount:100},r.csrf)).status).toBe(400);
    const correct=assessments['dev-00'].master.answer;
    const failed=await post(r.agent,'/chapters/dev-00/master-challenge/submit',{selected:(correct+1)%4,confirmed:true},r.csrf);expect(failed.body.passed).toBe(false);
    expect((await post(r.agent,'/chapters/dev-00/master-challenge/submit',{selected:correct,confirmed:true},r.csrf)).status).toBe(409);expect(await Eligibility.countDocuments()).toBe(0);
  });
  it('consumes at most one attempt under concurrent submissions',async()=>{
    const r=await register();await eligible(r.student.id);const answer=assessments['dev-00'].master.answer;
    const results=await Promise.allSettled([submitMaster(r.student.id,'dev-00',answer,c),submitMaster(r.student.id,'dev-00',answer,c)]);
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(await Attempt.countDocuments()).toBe(1);expect(await Eligibility.countDocuments()).toBe(1);
  });
  it('hides identifiers, wallet information and private progress from public profiles',async()=>{
    const r=await register();await eligible(r.student.id);const body=(await request(app).get('/api/public/students/learner')).body;
    expect(Object.keys(body).sort()).toEqual(['avatar','badges','bio','displayName','username']);expect(JSON.stringify(body)).not.toContain('human-one');expect(body).not.toHaveProperty('passwordHash');
  });
  it('recovers with a single-use code and invalidates old sessions',async()=>{
    const r=await register();const other=request.agent(app);const response=await post(other,'/auth/recover',{username:'learner',password:'another long test password',recoveryCode:r.recovery});expect(response.status).toBe(200);expect((await r.agent.get('/api/auth/me')).body.student).toBe(null);
    expect((await post(other,'/auth/recover',{username:'learner',password:'another long test password',recoveryCode:r.recovery})).status).toBe(400);
  });
});
describe('World ID server verification (mock verifier; real database constraints)',()=>{
  it('verifies an Orb legacy proof through the v4 API and resolves its existing account',async()=>{
    const legacy={...c,WORLD_ID_CREDENTIAL_MODE:'orb-legacy' as const};
    const remote=vi.fn(async()=>new Response(JSON.stringify({success:true,action:c.WORLD_ID_ACTION,environment:'production',results:[{identifier:'orb',success:true,nullifier:'12345'}]})));
    let original='';
    for(const username of ['firstorb','secondorb']){
      const r=await register(username);await readyForWorld(r.student.id);const pending=await worldRequest(r.student.id,legacy);
      expect(pending.credentialMode).toBe('orb-legacy');
      const proof={protocol_version:'3.0',nonce:pending.rpContext.nonce,action:c.WORLD_ID_ACTION,environment:'production',responses:[{identifier:'orb',signal_hash:hashSignal(pending.signal),nullifier:'0x3039',merkle_root:'0x'+'01'.repeat(32),proof:'0x'+'02'.repeat(256)}]};
      const result=await verifyWorld(r.student.id,pending.id,proof,legacy,remote as typeof fetch);
      if(!original)original=r.student.id;
      expect(result.targetStudent).toBe(original);expect(result.accountSwitched).toBe(username==='secondorb');
      expect(remote).toHaveBeenLastCalledWith('https://developer.world.org/api/v4/verify/rp_test',expect.objectContaining({body:JSON.stringify(proof)}));
    }
    expect(await Verification.countDocuments()).toBe(1);
    expect((await Verification.findOne())?.scope).toBe('production:rp_test:ethereum-explorer-human-v1:orb-legacy');
    await expect(worldRequest(original,c)).rejects.toMatchObject({code:'world_scope_changed'});
  });
  it('rejects weaker legacy credentials, wrong modes, and mismatched verified identifiers',async()=>{
    const legacy={...c,WORLD_ID_CREDENTIAL_MODE:'orb-legacy' as const};const r=await register();await readyForWorld(r.student.id);
    const pending=await worldRequest(r.student.id,legacy);
    const proof={protocol_version:'3.0',nonce:pending.rpContext.nonce,action:c.WORLD_ID_ACTION,environment:'production',responses:[{identifier:'orb',signal_hash:hashSignal(pending.signal),nullifier:'12345',merkle_root:'0x'+'01'.repeat(32),proof:'0x'+'02'.repeat(256)}]};
    const remote=vi.fn(async()=>new Response(JSON.stringify({success:true,action:c.WORLD_ID_ACTION,environment:'production',results:[{identifier:'document',success:true,nullifier:'12345'}]})));
    for(const identifier of ['device','document','selfie','proof_of_human'])await expect(verifyWorld(r.student.id,pending.id,{...proof,responses:[{...proof.responses[0],identifier}]},legacy,remote as typeof fetch)).rejects.toMatchObject({code:'world_unsupported_proof'});
    await expect(verifyWorld(r.student.id,pending.id,{...proof,protocol_version:'4.0'},legacy,remote as typeof fetch)).rejects.toMatchObject({code:'world_unsupported_proof'});
    expect(remote).not.toHaveBeenCalled();
    await expect(verifyWorld(r.student.id,pending.id,proof,legacy,remote as typeof fetch)).rejects.toMatchObject({code:'world_result_mismatch'});
    expect(await Verification.countDocuments()).toBe(0);
    expect((await Challenge.findById(pending.id))?.used).toBe(false);
  });
  async function proofFor(student:string){await readyForWorld(student);const pending=await worldRequest(student,c);const proof={protocol_version:'4.0',nonce:pending.rpContext.nonce,action:c.WORLD_ID_ACTION,environment:'production',responses:[{identifier:'proof_of_human',issuer_schema_id:1,signal_hash:hashSignal(pending.signal),nullifier:'12345',proof:['1','2','3','4','5']}]};return {pending,proof};}
  const verifier=vi.fn(async()=>new Response(JSON.stringify({success:true,action:c.WORLD_ID_ACTION,environment:'production',results:[{identifier:'proof_of_human',success:true,nullifier:'12345'}]}),{status:200}));
  it('binds once and resolves a second fresh proof to the existing account',async()=>{
    const r=await register();const a=await proofFor(r.student.id);await verifyWorld(r.student.id,a.pending.id,a.proof,c,verifier as typeof fetch);expect(await Verification.countDocuments()).toBe(1);
    await expect(verifyWorld(r.student.id,a.pending.id,a.proof,c,verifier as typeof fetch)).rejects.toThrow();
    const second=await register('second');const b=await proofFor(second.student.id);const resolved=await verifyWorld(second.student.id,b.pending.id,b.proof,c,verifier as typeof fetch);expect(resolved).toMatchObject({targetStudent:r.student.id,accountSwitched:true,existingAccount:true});expect(await Verification.countDocuments()).toBe(1);expect(await Verification.findOne({student:second.student.id})).toBeNull();
  });
  it('rejects account-swapped, nonhuman, and invalid proofs',async()=>{
    const r=await register();const a=await proofFor(r.student.id);const b=await register('other');
    await expect(verifyWorld(b.student.id,a.pending.id,a.proof,c,verifier as typeof fetch)).rejects.toThrow();
    await expect(verifyWorld(r.student.id,a.pending.id,{...a.proof,responses:[{...a.proof.responses[0],issuer_schema_id:9303}]},c,verifier as typeof fetch)).rejects.toThrow();
    await expect(verifyWorld(r.student.id,a.pending.id,a.proof,c,(async()=>new Response('{"success":false}',{status:400})) as typeof fetch)).rejects.toThrow();expect(await Verification.countDocuments()).toBe(0);
  });
  it('canonicalizes equivalent nullifier encodings',()=>expect(canonicalField('0x3039')).toBe(canonicalField('12345')));
  it.each(['invalid_proof','invalid_rp_signature'])('reports %s without consuming the request or exposing provider details',async(code)=>{
    const r=await register();const a=await proofFor(r.student.id);
    const rejected=async()=>new Response(JSON.stringify({success:false,code,detail:'private provider payload'}),{status:400});
    await expect(verifyWorld(r.student.id,a.pending.id,a.proof,c,rejected as typeof fetch)).rejects.toMatchObject({code:`world_${code}`,message:expect.not.stringContaining('private provider payload')});
    expect((await Challenge.findById(a.pending.id))?.used).toBe(false);expect(await Verification.countDocuments()).toBe(0);
  });
  it('reports network failure and unsupported proof format separately',async()=>{
    const r=await register();const a=await proofFor(r.student.id);
    await expect(verifyWorld(r.student.id,a.pending.id,{...a.proof,protocol_version:'3.0'},c,verifier as typeof fetch)).rejects.toMatchObject({code:'world_unsupported_proof'});
    await expect(verifyWorld(r.student.id,a.pending.id,a.proof,c,(async()=>{throw new Error('secret URL');}) as typeof fetch)).rejects.toMatchObject({code:'world_verifier_unreachable'});
    expect(await Verification.countDocuments()).toBe(0);
  });
  it.each([429,503])('handles verifier HTTP %s without consuming the request',async(status)=>{
    const r=await register();const a=await proofFor(r.student.id);
    await expect(verifyWorld(r.student.id,a.pending.id,a.proof,c,(async()=>new Response('upstream unavailable',{status})) as typeof fetch)).rejects.toMatchObject({status,code:status===429?'world_verifier_rate_limited':'world_verifier_unavailable'});
    expect((await Challenge.findById(a.pending.id))?.used).toBe(false);expect(await Verification.countDocuments()).toBe(0);
  });
  it('signs the same configured action returned to IDKit and rejects arbitrary client actions',async()=>{
    const r=await register();await readyForWorld(r.student.id);
    expect((await post(r.agent,'/world-id/request',{action:'other-action'},r.csrf)).status).toBe(400);
    const response=await post(r.agent,'/world-id/request',{},r.csrf);expect(response.status).toBe(200);
    const context=response.body.rpContext;expect(response.body.action).toBe(c.WORLD_ID_ACTION);expect(context.rp_id).toBe(c.WORLD_ID_RP_ID);expect(response.body.environment).toBe('production');
    const signer=privateKeyToAccount(c.WORLD_ID_SIGNING_KEY as `0x${string}`);
    const message=computeRpSignatureMessage(hexToBytes(context.nonce),context.created_at,context.expires_at,c.WORLD_ID_ACTION);
    expect(await verifySignedMessage({address:signer.address,message:{raw:message},signature:context.signature})).toBe(true);
    expect(context.expires_at-context.created_at).toBe(300);
  });
  it('rejects mismatched action, environment, session, and expired requests before contacting the verifier',async()=>{
    const r=await register();const a=await proofFor(r.student.id);const remote=vi.fn(verifier);
    await expect(verifyWorld(r.student.id,a.pending.id,{...a.proof,action:'other'},c,remote as typeof fetch)).rejects.toMatchObject({code:'world_action_mismatch'});
    await expect(verifyWorld(r.student.id,a.pending.id,{...a.proof,environment:'staging'},c,remote as typeof fetch)).rejects.toMatchObject({code:'world_environment_mismatch'});
    await Challenge.updateOne({_id:a.pending.id},{$set:{authSession:'session-one'}});
    await expect(verifyWorld(r.student.id,a.pending.id,a.proof,c,remote as typeof fetch,{authSession:'session-two'})).rejects.toMatchObject({code:'world_session_mismatch'});
    await Challenge.updateOne({_id:a.pending.id},{$unset:{authSession:1},$set:{expiresAt:new Date(0)}});
    await expect(verifyWorld(r.student.id,a.pending.id,a.proof,c,remote as typeof fetch)).rejects.toThrow('expired');expect(remote).not.toHaveBeenCalled();
  });
  it('requires wallet ownership and completed quiz before issuing a World ID request',async()=>{
    const r=await register();expect((await post(r.agent,'/world-id/request',{},r.csrf)).body.code).toBe('verified_wallet_required');
    await readyForWorld(r.student.id);await MCQProgress.deleteMany({student:r.student.id});
    expect((await post(r.agent,'/world-id/request',{},r.csrf)).body.code).toBe('quiz_required');expect(await Challenge.countDocuments()).toBe(0);
  });
  it('atomically switches the browser session to the existing account without merging wallets or resetting attempts',async()=>{
    const first=await register();const a=await proofFor(first.student.id);await verifyWorld(first.student.id,a.pending.id,a.proof,c,verifier as typeof fetch);
    await submitMaster(first.student.id,'dev-00',(assessments['dev-00'].master.answer+1)%4,c);
    const second=await register('second');await readyForWorld(second.student.id);const oldSession=await Session.findOne({student:second.student.id});
    const pending=(await post(second.agent,'/world-id/request',{},second.csrf)).body;
    const proof={...a.proof,nonce:pending.rpContext.nonce,responses:[{...a.proof.responses[0],signal_hash:hashSignal(pending.signal)}]};
    vi.stubGlobal('fetch',verifier);
    const response=await post(second.agent,'/world-id/verify',{requestId:pending.id,proof},second.csrf);
    expect(response.status).toBe(200);expect(response.body).toMatchObject({verified:true,accountSwitched:true,redirectTo:'/dashboard'});
    expect((await second.agent.get('/api/auth/me')).body.student.id).toBe(first.student.id);
    expect(await Session.findById(oldSession!._id)).toBeNull();expect(await Verification.countDocuments()).toBe(1);expect(await Wallet.countDocuments({student:second.student.id})).toBe(1);
    expect((await post(second.agent,'/chapters/dev-00/master-challenge/submit',{selected:assessments['dev-00'].master.answer,confirmed:true},response.body.csrf)).status).toBe(409);
    expect(await Attempt.countDocuments()).toBe(1);expect(await Eligibility.countDocuments()).toBe(0);
    expect((await post(second.agent,'/world-id/verify',{requestId:pending.id,proof},response.body.csrf)).status).toBe(400);
  });
  it('does not switch accounts based on a known nullifier when provider verification fails',async()=>{
    const first=await register();const a=await proofFor(first.student.id);await verifyWorld(first.student.id,a.pending.id,a.proof,c,verifier as typeof fetch);
    const second=await register('second');await readyForWorld(second.student.id);const pending=(await post(second.agent,'/world-id/request',{},second.csrf)).body;
    vi.stubGlobal('fetch',async()=>new Response('{"success":false,"code":"already_verified"}',{status:400}));
    const proof={...a.proof,nonce:pending.rpContext.nonce,responses:[{...a.proof.responses[0],signal_hash:hashSignal(pending.signal)}]};
    const response=await post(second.agent,'/world-id/verify',{requestId:pending.id,proof},second.csrf);
    expect(response.status).toBe(400);expect((await second.agent.get('/api/auth/me')).body.student.id).toBe(second.student.id);expect(await Verification.countDocuments()).toBe(1);
  });
  it('reuses a stored binding for future chapters and prevents wallet changes from resetting an attempt',async()=>{
    const r=await register();await eligible(r.student.id);const answer=assessments['dev-00'].master.answer;
    await submitMaster(r.student.id,'dev-00',answer,c);
    await Wallet.create({student:r.student.id,address:'0x'+'ab'.repeat(20),verifiedAt:new Date()});await Student.updateOne({_id:r.student.id},{$set:{rewardWallet:'0x'+'ab'.repeat(20)}});
    await expect(submitMaster(r.student.id,'dev-00',answer,c)).rejects.toThrow();
    await readyForWorld(r.student.id,'dev-01');expect((await submitMaster(r.student.id,'dev-01',assessments['dev-01'].master.answer,c)).passed).toBe(true);
    expect(await Verification.countDocuments()).toBe(1);expect(await Challenge.countDocuments()).toBe(0);expect(await Eligibility.countDocuments()).toBe(2);
  });
  it('blocks submission with a removed wallet and refuses silent action-scope changes',async()=>{
    const r=await register();await eligible(r.student.id);await Wallet.deleteMany({student:r.student.id});
    await expect(submitMaster(r.student.id,'dev-00',0,c)).rejects.toMatchObject({code:'verified_wallet_required'});await readyForWorld(r.student.id);
    await expect(submitMaster(r.student.id,'dev-00',0,{...c,WORLD_ID_ACTION:'new-action'})).rejects.toMatchObject({code:'world_scope_changed'});
    expect(await Attempt.countDocuments()).toBe(0);
    const other=await register('other');await readyForWorld(other.student.id);
    await expect(worldRequest(other.student.id,{...c,WORLD_ID_ACTION:'new-action'})).rejects.toMatchObject({code:'world_scope_changed'});
  });
  it('rejects oversized nullifiers without Number conversion',()=>{expect(()=>canonicalField((1n<<256n).toString())).toThrow();expect(canonicalField(((1n<<256n)-1n).toString())).toBe(((1n<<256n)-1n).toString());});
  it('handles concurrent fresh bindings to one human without creating a second identity',async()=>{
    const first=await register();const second=await register('second');const a=await proofFor(first.student.id);const b=await proofFor(second.student.id);
    const results=await Promise.all([verifyWorld(first.student.id,a.pending.id,a.proof,c,verifier as typeof fetch),verifyWorld(second.student.id,b.pending.id,b.proof,c,verifier as typeof fetch)]);
    expect(await Verification.countDocuments()).toBe(1);expect(results[0].targetStudent).toBe(results[1].targetStudent);expect(results.filter(r=>r.accountSwitched)).toHaveLength(1);
  });
  it('rolls back binding and nonce consumption when session replacement fails',async()=>{
    const r=await register();const a=await proofFor(r.student.id);
    await expect(verifyWorld(r.student.id,a.pending.id,a.proof,c,verifier as typeof fetch,{onBound:async()=>{throw new Error('Session persistence unavailable');}})).rejects.toThrow('Session persistence');
    expect(await Verification.countDocuments()).toBe(0);expect((await Challenge.findById(a.pending.id))?.used).toBe(false);
  });
  it('does not treat frontend verification flags or nullifiers as login credentials',async()=>{
    const r=await register();await readyForWorld(r.student.id);const pending=(await post(r.agent,'/world-id/request',{},r.csrf)).body;
    const response=await post(r.agent,'/world-id/verify',{requestId:pending.id,proof:{verified:true,nullifier:'12345'}},r.csrf);
    expect(response.status).toBe(400);expect(response.body.code).toBe('world_unsupported_proof');expect(await Verification.countDocuments()).toBe(0);
  });
});
describe('wallet ownership and durable rewards',()=>{
  it('refuses to link one wallet to a conflicting student account',async()=>{
    const first=await register();const second=await register('second');const owner=privateKeyToAccount(`0x${'24'.repeat(32)}`);
    for(const [r,status] of [[first,200],[second,409]] as const){const challenge=(await post(r.agent,'/wallets/challenge',{address:owner.address},r.csrf)).body;const signature=await owner.signMessage({message:challenge.message});expect((await post(r.agent,'/wallets/link',{challengeId:challenge.id,signature},r.csrf)).status).toBe(status);}
    expect(await Wallet.countDocuments()).toBe(1);expect(String((await Wallet.findOne())?.student)).toBe(first.student.id);
    expect((await first.agent.get('/api/wallets')).body.wallets).toHaveLength(1);
  });
  it('rejects a signature from another wallet without consuming the valid challenge',async()=>{
    const r=await register();const owner=privateKeyToAccount(`0x${'22'.repeat(32)}`);const stranger=privateKeyToAccount(`0x${'23'.repeat(32)}`);
    const challenge=(await post(r.agent,'/wallets/challenge',{address:owner.address},r.csrf)).body;
    const wrong=await stranger.signMessage({message:challenge.message});
    expect((await post(r.agent,'/wallets/link',{challengeId:challenge.id,signature:wrong},r.csrf)).status).toBe(400);
    expect(await Wallet.countDocuments()).toBe(0);
    const signature=await owner.signMessage({message:challenge.message});
    expect((await post(r.agent,'/wallets/link',{challengeId:challenge.id,signature},r.csrf)).status).toBe(200);
  });
  it('never turns a simulator identity into a reward attempt',async()=>{
    const r=await register();await eligible(r.student.id);await Verification.updateOne({student:r.student.id},{$set:{environment:'staging'}});
    await expect(submitMaster(r.student.id,'dev-00',assessments['dev-00'].master.answer,c)).rejects.toThrow('Simulator');
    expect(await Attempt.countDocuments()).toBe(0);expect(await Eligibility.countDocuments()).toBe(0);
  });
  it('links only a valid ownership signature and rejects challenge replay',async()=>{
    const r=await register();const account=privateKeyToAccount('0x'+'22'.repeat(32) as `0x${string}`);
    const challenge=(await post(r.agent,'/wallets/challenge',{address:account.address},r.csrf)).body;
    const signature=await account.signMessage({message:challenge.message});
    expect((await post(r.agent,'/wallets/link',{challengeId:challenge.id,signature},r.csrf)).status).toBe(200);
    expect((await post(r.agent,'/wallets/link',{challengeId:challenge.id,signature},r.csrf)).status).toBe(400);
    expect((await post(r.agent,'/wallets/select-reward-wallet',{address:account.address},r.csrf)).status).toBe(200);
  });
  it('reserves one claim and freezes its destination across retries and wallet changes',async()=>{
    const r=await register();await eligible(r.student.id);await submitMaster(r.student.id,'dev-00',assessments['dev-00'].master.answer,c);
    const e=(await Eligibility.findOne())!;const a='0x'+'33'.repeat(20),b='0x'+'44'.repeat(20);
    await Wallet.create([{student:r.student.id,address:a,verifiedAt:new Date()},{student:r.student.id,address:b,verifiedAt:new Date()}]);
    await Promise.allSettled([claimReward(r.student.id,String(e.rewardId),a),claimReward(r.student.id,String(e.rewardId),a)]);
    await claimReward(r.student.id,String(e.rewardId),b);expect(await Claim.countDocuments()).toBe(1);expect((await Claim.findOne())?.destination).toBe(a);
  });
  it('persists signed bytes before broadcasting and recovers confirmation after a restart',async()=>{
    const r=await register();const rewardId='0x'+'66'.repeat(32);const destination='0x'+'33'.repeat(20);const txHash='0x'+'77'.repeat(32);const blockHash='0x'+'88'.repeat(32);
    await Claim.create({student:r.student.id,rewardId,chapterId:'dev-00',destination,amount:REWARD_AMOUNT});let mined=false;
    const chain:ChainAdapter={prepare:vi.fn(async()=>({raw:'0x1234' as const,hash:txHash as `0x${string}`,nonce:5})),broadcast:vi.fn(async()=>{expect((await Claim.findOne())?.rawTransaction).toBe('0x1234');throw new Error('Network lost after send');}),receipt:vi.fn(async()=>mined?{status:'success' as const,blockNumber:5n,blockHash:blockHash as `0x${string}`,transactionHash:txHash as `0x${string}`}:null),confirmed:vi.fn(async()=>true),recipient:vi.fn(async()=>destination as `0x${string}`)};
    await processReward(c,chain);expect((await Claim.findOne())?.status).toBe('TRANSACTION_PENDING');expect(await Achievement.countDocuments()).toBe(0);
    mined=true;await processReward(c,chain);expect(chain.prepare).toHaveBeenCalledTimes(1);expect((await Claim.findOne())?.status).toBe('CONFIRMED');expect(await Achievement.countDocuments()).toBe(1);
    await processReward(c,chain);expect(await Achievement.countDocuments()).toBe(1);expect(await RewardTransaction.countDocuments()).toBe(1);
  });
  it('unlocks four badges from confirmed rewards only, with Developer v1 mastery',async()=>{
    const r=await register();for(const [i,ch] of chapters.filter(c=>c.mode==='developer').entries())await Claim.create({student:r.student.id,rewardId:`r-${i}`,chapterId:ch.id,destination:'wallet',amount:REWARD_AMOUNT,status:'CONFIRMED'});
    await unlockAchievements(r.student.id);expect(await Achievement.countDocuments()).toBe(4);await unlockAchievements(r.student.id);expect(await Achievement.countDocuments()).toBe(4);
  });
  async function workerFixture(){
    const r=await register();const rewardId=`0x${'66'.repeat(32)}`;const destination=`0x${'33'.repeat(20)}`;
    const hash=`0x${'77'.repeat(32)}` as `0x${string}`;
    await Claim.create({student:r.student.id,rewardId,chapterId:'dev-00',destination,amount:REWARD_AMOUNT});
    const chain:ChainAdapter={prepare:vi.fn(async()=>({raw:'0x1234' as const,hash,nonce:5})),broadcast:vi.fn(async()=>hash),receipt:vi.fn(async()=>null),confirmed:vi.fn(async()=>false),recipient:vi.fn(async()=>destination as `0x${string}`)};
    return {chain,hash,destination};
  }
  it('keeps one signer lane across concurrent workers and pending claims',async()=>{
    const {chain}=await workerFixture();await Promise.all([processReward(c,chain),processReward(c,chain)]);
    expect(chain.prepare).toHaveBeenCalledTimes(1);expect(await RewardTransaction.countDocuments()).toBe(1);
    await processReward(c,chain);expect(chain.prepare).toHaveBeenCalledTimes(1);expect(await Achievement.countDocuments()).toBe(0);
  });
  it('waits for canonical finality before counting a successful receipt',async()=>{
    const {chain,hash}=await workerFixture();await processReward(c,chain);
    vi.mocked(chain.receipt).mockResolvedValue({status:'success',blockNumber:5n,blockHash:`0x${'88'.repeat(32)}`,transactionHash:hash});
    await processReward(c,chain);expect((await Claim.findOne())?.status).toBe('INCLUDED');expect(await Achievement.countDocuments()).toBe(0);
    vi.mocked(chain.confirmed).mockResolvedValue(true);await processReward(c,chain);expect((await Claim.findOne())?.status).toBe('CONFIRMED');
  });
  it('journals finalized reverts and stops after three signed attempts',async()=>{
    const {chain}=await workerFixture();let signed=0;
    vi.mocked(chain.prepare).mockImplementation(async()=>({raw:'0x1234',hash:`0x${(++signed).toString(16).padStart(64,'0')}`,nonce:signed}));
    vi.mocked(chain.receipt).mockImplementation(async hash=>({status:'reverted',blockNumber:5n,blockHash:`0x${'88'.repeat(32)}`,transactionHash:hash}));
    vi.mocked(chain.confirmed).mockResolvedValue(true);
    for(let i=0;i<4;i++)await processReward(c,chain);
    expect(chain.prepare).toHaveBeenCalledTimes(3);expect(await RewardTransaction.countDocuments({status:'REVERTED'})).toBe(3);
    const claim=await Claim.findOne();expect(claim?.status).toBe('FAILED_RETRYABLE');expect(claim?.rawTransaction).toBeUndefined();expect(await Achievement.countDocuments()).toBe(0);
  });
  it('preserves a signed claim through an RPC outage without allocating another nonce',async()=>{
    const {chain}=await workerFixture();await processReward(c,chain);vi.mocked(chain.receipt).mockRejectedValueOnce(new Error('RPC unavailable'));
    await expect(processReward(c,chain)).rejects.toThrow('RPC unavailable');
    expect((await Claim.findOne())?.rawTransaction).toBe('0x1234');
    await processReward(c,chain);expect(chain.prepare).toHaveBeenCalledTimes(1);expect(await Achievement.countDocuments()).toBe(0);
  });
  it('rolls back preparation and never broadcasts when the transaction journal cannot be saved',async()=>{
    const {chain}=await workerFixture();
    const journal=vi.spyOn(RewardTransaction,'create').mockRejectedValueOnce(new Error('Database write unavailable'));
    try{
      await expect(processReward(c,chain)).rejects.toThrow('Database write unavailable');
      const claim=await Claim.findOne();expect(claim?.rawTransaction).toBeUndefined();expect(claim?.attempts).toBe(0);
      expect(chain.broadcast).not.toHaveBeenCalled();expect(await RewardTransaction.countDocuments()).toBe(0);
    }finally{journal.mockRestore();}
    await processReward(c,chain);expect(chain.broadcast).toHaveBeenCalledTimes(1);expect(await RewardTransaction.countDocuments()).toBe(1);
  });
});
