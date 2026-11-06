import mongoose from 'mongoose';
import { chapters,chapterById,REWARD_AMOUNT,badges } from '../../packages/shared/curriculum';
import { assessments } from './content/assessments';
import { Achievement,Attempt,Claim,Eligibility,MCQProgress,Verification,Wallet } from './models';
import { commitment,HttpError,requireValue } from './security';
import type { Config } from './config';
import { verifiedWallet } from './learningAccess';
import { worldScope } from './worldDiagnostics';
export async function submitMaster(student:string,chapterId:string,selected:number,c:Config){
  const chapter=requireValue(chapterById[chapterId],'Unknown chapter.');
  if(!await verifiedWallet(student))throw new HttpError(403,'Verify and select a wallet before submitting the Master Challenge.','verified_wallet_required');
  const verification=requireValue(await Verification.findOne({student}),'Verify with World ID before submitting.',403);
  if(verification.environment!=='production')throw new HttpError(403,'Simulator verification cannot earn Sepolia rewards.');
  if(verification.scope!==worldScope(c))throw new HttpError(409,'Your human binding uses an earlier World ID configuration. Sign in to your original account and contact the operator; attempts cannot be reset by changing actions.','world_scope_changed');
  const progress=await MCQProgress.findOne({student,chapterId});
  const bank=assessments[chapterId];
  if(!bank.quiz.every(q=>Array.isArray(progress?.completed)&&progress.completed.includes(q.id)))throw new HttpError(403,'Complete all five chapter questions first.');
  const passed=selected===bank.master.answer;
  const rewardId=`0x${commitment(c.REWARD_ID_SECRET,String(verification.human),chapter.rewardScope)}`;
  await mongoose.connection.transaction(async session=>{
    await Attempt.create([{student,human:verification.human,chapterId,rewardScope:chapter.rewardScope,selected,passed}],{session});
    if(passed)await Eligibility.create([{student,human:verification.human,chapterId,rewardScope:chapter.rewardScope,rewardId,amount:REWARD_AMOUNT}],{session});
  });
  return {passed,explanation:bank.master.explanation,status:passed?'ELIGIBLE':'NOT_ELIGIBLE'};
}
export async function claimReward(student:string,rewardId:string,address:string){
  const eligible=requireValue(await Eligibility.findOne({student,rewardId}),'No earned reward found.',403);
  requireValue(await Wallet.findOne({student,address}),'Link and verify this destination first.',403);
  // Unique rewardId and insert-only destination make retries and wallet changes idempotent.
  return Claim.findOneAndUpdate({rewardId},{$setOnInsert:{student,rewardId,chapterId:eligible.chapterId,destination:address,amount:eligible.amount,status:'CLAIM_REQUESTED'}},{upsert:true,new:true});
}
export async function unlockAchievements(student:string){
  const confirmed=await Claim.find({student,status:'CONFIRMED'}).lean();
  const developer=chapters.filter(c=>c.mode==='developer');
  const mastered=developer.every(ch=>confirmed.some(r=>r.chapterId===ch.id));
  for(const badge of badges){if(badge.id==='ethereum-master'?!mastered:confirmed.length<badge.required)continue;
    await Achievement.updateOne({student,badgeId:badge.id},{$setOnInsert:{student,badgeId:badge.id,unlockedAt:new Date()}},{upsert:true});
  }
}
