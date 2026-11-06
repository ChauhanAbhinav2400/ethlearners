import express from 'express';
import type { Request,Response,NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import mongoose from 'mongoose';
import { z,ZodError } from 'zod';
import pino from 'pino';
import { verifyMessage,getAddress,isAddress } from 'viem';
import { chapters,chapterById,chapterForLesson,badges } from '../../packages/shared/curriculum';
import { config,configured,type Config } from './config';
import { Achievement,Attempt,Challenge,Claim,Eligibility,MCQAttempt,MCQProgress,Progress,Session,Student,Verification,Wallet } from './models';
import { checkPassword,hashPassword,digest,randomToken,usernameSchema,passwordSchema,HttpError,requireValue } from './security';
import { assessments,publicQuestion } from './content/assessments';
import { claimReward,submitMaster } from './rewards';
import { verifyWorld,worldRequest,worldConfigured,WORLD_PROOF_CONTRACT_VERSION } from './world';
import { worldPrerequisites,verifiedWallet } from './learningAccess';
import { worldDiagnostic,worldScope } from './worldDiagnostics';

const log=pino({level:process.env.NODE_ENV==='test'?'silent':'info'});
type AuthRequest=Request & { auth?:{student:string;session:string;csrf:string} };
const id=z.string().regex(/^[a-f0-9]{24}$/i);
const addressSchema=z.string().refine(isAddress).transform(v=>getAddress(v).toLowerCase());
const empty=z.object({}).strict();
const publicStudent=(s:any)=>({id:String(s._id),username:s.username,displayName:s.displayName,avatar:s.avatar,bio:s.bio,publicProgress:s.publicProgress,publicRewards:s.publicRewards,publicWallet:s.publicWallet,rewardWallet:s.rewardWallet,reduceMotion:s.reduceMotion,largeText:s.largeText});
const claimView=(c:any)=>({id:String(c._id),rewardId:c.rewardId,chapterId:c.chapterId,destination:c.destination,amount:c.amount,status:c.status,txHash:c.txHash,blockNumber:c.blockNumber,confirmedAt:c.confirmedAt,errorCode:c.errorCode});
export function createApp(c:Config=config){
  const app=express();app.disable('x-powered-by');if(c.TRUST_PROXY==='true')app.set('trust proxy',1);
  app.use(helmet());
  app.use(cors({origin:c.FRONTEND_ORIGIN,credentials:true,methods:['GET','POST','PATCH'],allowedHeaders:['Content-Type','X-CSRF-Token','X-Explorer-Client']}));
  app.use(express.json({limit:'64kb'}));app.use(cookieParser());
  app.use((req,res,next)=>{res.set('Cache-Control','no-store');const start=Date.now();res.on('finish',()=>log.info({method:req.method,status:res.statusCode,ms:Date.now()-start},'request'));next();});
  app.get('/api/health',(_req,res)=>res.status(mongoose.connection.readyState===1?200:503).json({status:mongoose.connection.readyState===1?'ok':'BLOCKED — EXTERNAL CONFIGURATION REQUIRED',database:mongoose.connection.readyState===1?'connected':'unavailable',worldIdConfigured:worldConfigured(c),worldIdCredentialMode:c.WORLD_ID_CREDENTIAL_MODE,worldProofContract:WORLD_PROOF_CONTRACT_VERSION,rewardsConfigured:Boolean(c.SEPOLIA_RPC_URL&&c.REWARD_DISTRIBUTOR_ADDRESS&&c.REWARD_SIGNER_PRIVATE_KEY),rewardWorkerEnabledInApiProcess:c.REWARD_WORKER_ENABLED==='true'}));
  app.get('/api/curriculum',(_req,res)=>res.json({chapters}));
  app.get('/api/chapters/:chapterId', (req,res)=>res.json(requireValue(chapterById[String(req.params.chapterId)],'Unknown chapter.')));
  app.use('/api',rateLimit({windowMs:60000,limit:120,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Too many requests. Try again shortly.',code:'rate_limited'}}));
  app.use('/api',async (req:AuthRequest,_res,next)=>{
    if(!['GET','HEAD','OPTIONS'].includes(req.method)){
      if(req.get('origin')!==c.FRONTEND_ORIGIN||req.get('x-explorer-client')!=='web')throw new HttpError(403,'Request origin is not allowed.');
      if(!req.is('application/json'))throw new HttpError(415,'Send JSON.');
    }
    if(mongoose.connection.readyState!==1||!configured(c))throw new HttpError(503,'BLOCKED — EXTERNAL CONFIGURATION REQUIRED: database and server secrets.','backend_unconfigured');
    const token=req.cookies.explorer_session;
    if(typeof token==='string'&&/^[a-f0-9]{64}$/.test(token)){
      const session=await Session.findOne({tokenHash:digest(c.SESSION_SECRET+token),expiresAt:{$gt:new Date()}});
      if(session)req.auth={student:String(session.student),session:String(session._id),csrf:String(session.csrf)};
    }
    if(req.auth&&!['GET','HEAD','OPTIONS'].includes(req.method)&&req.get('x-csrf-token')!==req.auth.csrf)throw new HttpError(403,'Refresh your session before trying again.','csrf');
    next();
  });
  const auth=(req:AuthRequest,_res:Response,next:NextFunction)=>{if(!req.auth)throw new HttpError(401,'Please sign in.','unauthenticated');next();};
  const sid=(req:Request)=>(req as AuthRequest).auth!.student;
  const cookie={httpOnly:true,secure:c.NODE_ENV==='production',sameSite:c.COOKIE_SAME_SITE as 'lax'|'none',path:'/api',maxAge:7*24*60*60*1000};
  async function issue(req:AuthRequest,res:Response,student:string){
    if(req.auth)await Session.deleteOne({_id:req.auth.session});
    const token=randomToken(),csrf=randomToken();
    await Session.create({student,tokenHash:digest(c.SESSION_SECRET+token),csrf,expiresAt:new Date(Date.now()+cookie.maxAge)});
    res.cookie('explorer_session',token,cookie);return csrf;
  }
  app.use('/api/auth',rateLimit({windowMs:15*60000,limit:30,skip:req=>req.method==='GET',message:{error:'Too many account requests. Try again later.'}}));
  app.post('/api/auth/register',async(req:AuthRequest,res)=>{
    const b=z.object({username:usernameSchema,displayName:z.string().trim().max(60).optional(),avatar:z.enum(['leaf','orbit','gem','book']).optional(),password:passwordSchema}).strict().parse(req.body);
    const recoveryCode=randomToken();
    const student=await Student.create({username:b.username,displayName:b.displayName||b.username,passwordHash:await hashPassword(b.password),recoveryHash:digest(recoveryCode),avatar:b.avatar||'leaf'});
    const csrf=await issue(req,res,String(student._id));res.status(201).json({student:publicStudent(student),csrf,recoveryCode});
  });
  app.post('/api/auth/login',async(req:AuthRequest,res)=>{
    const b=z.object({username:usernameSchema,password:z.string().max(128)}).strict().parse(req.body);
    const student=await Student.findOne({username:b.username});
    const valid=await checkPassword(b.password,String(student?.passwordHash||'00000000000000000000000000000000:'+ '00'.repeat(64)));
    if(!student||!valid)throw new HttpError(401,'Username or password is incorrect.');
    const csrf=await issue(req,res,String(student._id));res.json({student:publicStudent(student),csrf});
  });
  app.post('/api/auth/recover',async(req,res)=>{
    const b=z.object({username:usernameSchema,recoveryCode:z.string().regex(/^[a-f0-9]{64}$/),password:passwordSchema}).strict().parse(req.body);
    const recoveryCode=randomToken();
    const passwordHash=await hashPassword(b.password);
    await mongoose.connection.transaction(async session=>{
      const student=await Student.findOneAndUpdate({username:b.username,recoveryHash:digest(b.recoveryCode)},{$set:{passwordHash,recoveryHash:digest(recoveryCode)}},{new:true,session});
      if(!student)throw new HttpError(400,'Recovery details are invalid.');
      await Session.deleteMany({student:student._id},{session});
    });res.json({recoveryCode,message:'Password changed. Sign in again and store the replacement recovery code.'});
  });
  app.get('/api/auth/me',async(req:AuthRequest,res)=>{if(!req.auth)return res.json({student:null});const student=await Student.findById(req.auth.student);res.json({student:student?publicStudent(student):null,csrf:req.auth.csrf});});
  app.post('/api/auth/logout',auth,async(req:AuthRequest,res)=>{empty.parse(req.body);await Session.deleteOne({_id:req.auth!.session});res.clearCookie('explorer_session',cookie);res.json({ok:true});});
  app.patch('/api/students/me',auth,async(req,res)=>{
    const b=z.object({username:usernameSchema.optional(),displayName:z.string().trim().min(1).max(60).optional(),bio:z.string().max(280).optional(),avatar:z.enum(['leaf','orbit','gem','book']).optional(),publicProgress:z.boolean().optional(),publicRewards:z.boolean().optional(),publicWallet:z.boolean().optional(),reduceMotion:z.boolean().optional(),largeText:z.boolean().optional()}).strict().parse(req.body);
    res.json({student:publicStudent(await Student.findByIdAndUpdate(sid(req),{$set:b},{new:true,runValidators:true}))});
  });
  app.get('/api/progress',auth,async(req,res)=>res.json({lessons:await Progress.find({student:sid(req)}).select('lessonId mode stage completed source').lean()}));
  const progressSchema=z.object({lessonId:z.string().max(80),stage:z.number().int().min(0).max(7),completed:z.boolean()}).strict();
  async function saveProgress(student:string,b:z.infer<typeof progressSchema>,source:string){
    const chapter=requireValue(chapterForLesson(b.lessonId),'Unknown lesson.');
    if(chapter.mode==='everyday'&&b.stage>5)throw new HttpError(400,'Invalid lesson stage.');
    await Progress.updateOne({student,lessonId:b.lessonId},{$set:{stage:b.stage,mode:chapter.mode,source},$max:{completed:b.completed}},{upsert:true});
  }
  app.post('/api/progress',auth,async(req,res)=>{await saveProgress(sid(req),progressSchema.parse(req.body),'lesson');res.json({ok:true});});
  app.post('/api/progress/import',auth,async(req,res)=>{const b=z.object({lessons:z.array(progressSchema).max(39)}).strict().parse(req.body);for(const item of b.lessons)await saveProgress(sid(req),item,'browser-import');res.json({ok:true,message:'Reading progress imported. Assessment and reward results are not imported.'});});
  app.get('/api/chapters/:chapterId/quiz',async(req:AuthRequest,res)=>{
    const bank=requireValue(assessments[String(req.params.chapterId)],'Unknown chapter.');
    const saved=req.auth?await MCQProgress.findOne({student:req.auth.student,chapterId:req.params.chapterId}):null;
    res.json({questions:bank.quiz.map(publicQuestion),completed:saved?.completed||[]});
  });
  app.post('/api/chapters/:chapterId/quiz/submit',async(req:AuthRequest,res)=>{
    const b=z.object({questionId:z.string(),selected:z.number().int().min(0).max(3)}).strict().parse(req.body);
    const chapterId=String(req.params.chapterId);const bank=requireValue(assessments[chapterId],'Unknown chapter.');const q=requireValue(bank.quiz.find(q=>q.id===b.questionId),'Unknown question.');
    const correct=b.selected===q.answer;
    if(req.auth)await mongoose.connection.transaction(async session=>{
      await MCQAttempt.create([{student:req.auth!.student,chapterId,questionId:q.id,selected:b.selected,correct}],{session});
      if(correct)await MCQProgress.updateOne({student:req.auth!.student,chapterId},{$addToSet:{completed:q.id}},{upsert:true,session});
    });
    res.json({correct,explanation:q.explanation,persisted:Boolean(req.auth)});
  });
  app.get('/api/chapters/:chapterId/master-challenge',auth,async(req,res)=>{
    const chapterId=String(req.params.chapterId);const bank=requireValue(assessments[chapterId],'Unknown chapter.');
    const progress=await MCQProgress.findOne({student:sid(req),chapterId});
    const binding=await Verification.findOne({student:sid(req)});
    const attempt=await Attempt.findOne(binding?{human:binding.human,rewardScope:chapterById[chapterId].rewardScope}:{student:sid(req),chapterId}).select('passed createdAt').lean();
    const walletVerified=await verifiedWallet(sid(req));
    const humanVerified=Boolean(binding&&binding.environment==='production'&&binding.scope===worldScope(c));
    const unlocked=bank.quiz.every(q=>Array.isArray(progress?.completed)&&progress.completed.includes(q.id));
    res.json({unlocked,canSubmit:unlocked&&walletVerified&&humanVerified&&!attempt,walletVerified,humanVerified,question:unlocked?publicQuestion(bank.master):null,attempt,explanation:attempt?bank.master.explanation:undefined});
  });
  app.post('/api/chapters/:chapterId/master-challenge/submit',auth,async(req,res)=>{
    const b=z.object({selected:z.number().int().min(0).max(3),confirmed:z.literal(true)}).strict().parse(req.body);
    res.json(await submitMaster(sid(req),String(req.params.chapterId),b.selected,c));
  });
  const worldLimit=rateLimit({windowMs:15*60000,limit:30,message:{error:'Too many World ID requests. Wait before starting another verification.',code:'world_rate_limited'}});
  app.get('/api/world-id/status',auth,async(req,res)=>{
    const v=await Verification.findOne({student:sid(req)});const prerequisites=await worldPrerequisites(sid(req));
    res.json({verified:Boolean(v&&v.scope===worldScope(c)),scopeChanged:Boolean(v&&v.scope!==worldScope(c)),environment:v?.environment,configured:worldConfigured(c),credentialMode:c.WORLD_ID_CREDENTIAL_MODE,...prerequisites});
  });
  app.post('/api/world-id/request',auth,worldLimit,async(req:AuthRequest,res)=>{
    empty.parse(req.body);res.json(await worldRequest(sid(req),c,req.auth!.session));
  });
  app.post('/api/world-id/verify',auth,worldLimit,async(req:AuthRequest,res)=>{
    const b=z.object({requestId:id,proof:z.unknown()}).strict().parse(req.body);
    const token=randomToken(),csrf=randomToken();
    try{
      const result=await verifyWorld(sid(req),b.requestId,b.proof,c,fetch,{authSession:req.auth!.session,onBound:async(target,session)=>{
        const previous=await Session.deleteOne({_id:req.auth!.session,student:sid(req),expiresAt:{$gt:new Date()}},{session});
        if(previous.deletedCount!==1)throw new HttpError(401,'Your session changed. Sign in and start verification again.','world_session_changed');
        await Session.create([{student:target,tokenHash:digest(c.SESSION_SECRET+token),csrf,expiresAt:new Date(Date.now()+cookie.maxAge)}],{session});
      }});
      res.cookie('explorer_session',token,cookie);
      res.json({verified:true,environment:result.environment,existingAccount:result.existingAccount,accountSwitched:result.accountSwitched,csrf,redirectTo:result.accountSwitched?'/dashboard':undefined});
      worldDiagnostic(c,'verification_succeeded');
    }catch(error){worldDiagnostic(c,'verification_failed',error instanceof HttpError?error.code:'unexpected_error');throw error;}
  });
  app.get('/api/wallets',auth,async(req,res)=>res.json({wallets:await Wallet.find({student:sid(req)}).select('address verifiedAt').lean(),selected:(await Student.findById(sid(req)))?.rewardWallet}));
  app.post('/api/wallets/challenge',auth,async(req,res)=>{
    const b=z.object({address:addressSchema}).strict().parse(req.body);const nonce=randomToken();const expiresAt=new Date(Date.now()+5*60000);
    const message=`Web3MadEazy wallet ownership\nOrigin: ${c.FRONTEND_ORIGIN}\nAccount: ${sid(req)}\nAddress: ${b.address}\nChain ID: 11155111\nNonce: ${nonce}\nExpires: ${expiresAt.toISOString()}\nThis links a reward destination. It does not authorize spending.`;
    const challenge=await Challenge.create({student:sid(req),kind:'wallet',address:b.address,nonce,message,expiresAt});res.json({id:String(challenge._id),message});
  });
  app.post('/api/wallets/link',auth,async(req,res)=>{
    const b=z.object({challengeId:id,signature:z.string().regex(/^0x[0-9a-fA-F]{130}$/)}).strict().parse(req.body);
    const challenge=requireValue(await Challenge.findOne({_id:b.challengeId,student:sid(req),kind:'wallet',used:false,expiresAt:{$gt:new Date()}}),'Wallet challenge expired.',400);
    if(!await verifyMessage({address:challenge.address as `0x${string}`,message:String(challenge.message),signature:b.signature as `0x${string}`}))throw new HttpError(400,'Signature does not match this wallet.');
    await mongoose.connection.transaction(async session=>{
      const consumed=await Challenge.updateOne({_id:challenge._id,used:false,expiresAt:{$gt:new Date()}},{$set:{used:true}},{session});if(consumed.modifiedCount!==1)throw new HttpError(409,'Challenge already used.');
      await Wallet.updateOne({student:sid(req),address:challenge.address},{$setOnInsert:{verifiedAt:new Date()}},{upsert:true,session});
    });res.json({linked:true});
  });
  app.post('/api/wallets/select-reward-wallet',auth,async(req,res)=>{const b=z.object({address:addressSchema}).strict().parse(req.body);requireValue(await Wallet.findOne({student:sid(req),address:b.address}),'Verify wallet ownership first.',403);await Student.updateOne({_id:sid(req)},{$set:{rewardWallet:b.address}});res.json({ok:true});});
  app.get('/api/rewards',auth,async(req,res)=>res.json({eligible:await Eligibility.find({student:sid(req)}).select('rewardId chapterId amount').lean(),claims:(await Claim.find({student:sid(req)})).map(claimView)}));
  app.post('/api/rewards/claim',auth,async(req,res)=>{const b=z.object({rewardId:z.string().regex(/^0x[0-9a-f]{64}$/)}).strict().parse(req.body);const student=requireValue(await Student.findById(sid(req)),'Account missing.');if(!student.rewardWallet)throw new HttpError(400,'Select a verified reward wallet first.');res.json(claimView(await claimReward(sid(req),b.rewardId,String(student.rewardWallet))));});
  app.get('/api/rewards/claims/:claimId',auth,async(req,res)=>res.json(claimView(requireValue(await Claim.findOne({_id:id.parse(req.params.claimId),student:sid(req)}),'Claim not found.'))));
  app.get('/api/dashboard',auth,async(req,res)=>{
    const student=sid(req);const [s,progress,quizzes,attempts,eligible,claims,awards,verification]=await Promise.all([Student.findById(student),Progress.find({student}).select('lessonId mode stage completed').lean(),MCQProgress.find({student}).select('chapterId completed').lean(),Attempt.find({student}).select('chapterId passed createdAt').lean(),Eligibility.find({student}).select('rewardId chapterId amount').lean(),Claim.find({student}),Achievement.find({student}).select('badgeId unlockedAt').lean(),Verification.findOne({student})]);
    const totalConfirmed=claims.filter(r=>r.status==='CONFIRMED').reduce((sum,r)=>sum+BigInt(String(r.amount)),0n);
    const totalOnchain=claims.filter(r=>r.status==='CONFIRMED'||r.status==='INCLUDED').reduce((sum,r)=>sum+BigInt(String(r.amount)),0n);
    res.json({student:publicStudent(s),progress,quizzes,attempts,eligible,claims:claims.map(claimView),badges:badges.map(b=>({...b,unlockedAt:awards.find(a=>a.badgeId===b.id)?.unlockedAt})),verified:Boolean(verification),verificationEnvironment:verification?.environment,totalConfirmed:totalConfirmed.toString(),totalOnchain:totalOnchain.toString()});
  });
  app.get('/api/public/students/:username',async(req,res)=>{
    const student=requireValue(await Student.findOne({username:usernameSchema.parse(req.params.username)}),'Profile not found.');const studentId=student._id;
    const profile:any={username:student.username,displayName:student.displayName,avatar:student.avatar,bio:student.bio,badges:await Achievement.find({student:studentId}).select('badgeId unlockedAt -_id').lean()};
    if(student.publicProgress)profile.progress=await Progress.find({student:studentId,completed:true}).select('lessonId mode -_id').lean();
    if(student.publicWallet)profile.wallet=student.rewardWallet;
    if(student.publicRewards)profile.confirmedRewards=(await Claim.find({student:studentId,status:'CONFIRMED'})).reduce((sum,r)=>sum+BigInt(String(r.amount)),0n).toString();
    res.json(profile);
  });
  app.use((_req,_res)=>{throw new HttpError(404,'Endpoint not found.');});
  app.use((err:any,_req:Request,res:Response,_next:NextFunction)=>{
    const duplicate=err?.code===11000;const status=duplicate?409:err instanceof ZodError?400:err instanceof HttpError?err.status:err?.type==='entity.too.large'?413:503;
    const message=duplicate?'This username, verified identity, wallet, or chapter attempt is already registered.':err instanceof ZodError?'Check the submitted fields.':err instanceof HttpError?err.message:status===413?'Request is too large.':'The service is temporarily unavailable. Please try again.';
    log.warn({status,code:duplicate?'duplicate':err instanceof HttpError?err.code:'request_error'},'request rejected');
    res.status(status).json({error:message,code:duplicate?'duplicate':err instanceof HttpError?err.code:'request_error'});
  });
  return app;
}
