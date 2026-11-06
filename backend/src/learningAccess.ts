import { MCQProgress,Student,Wallet } from './models';
import { assessments } from './content/assessments';
import { HttpError } from './security';

export async function verifiedWallet(student:string){
  const account=await Student.findById(student).select('rewardWallet');
  return Boolean(account?.rewardWallet&&await Wallet.exists({student,address:account.rewardWallet}));
}
export async function worldPrerequisites(student:string){
  const walletVerified=await verifiedWallet(student);
  const progress=await MCQProgress.find({student}).lean();
  const quizCompleted=progress.some(row=>Array.isArray(row.completed)&&assessments[String(row.chapterId)]?.quiz.every(q=>(row.completed as string[]).includes(q.id)));
  return {walletVerified,quizCompleted,canVerify:walletVerified&&quizCompleted};
}
export async function requireWorldPrerequisites(student:string){
  const access=await worldPrerequisites(student);
  if(!access.walletVerified)throw new HttpError(403,'Connect a wallet, sign its ownership challenge, and select it before World ID verification.','verified_wallet_required');
  if(!access.quizCompleted)throw new HttpError(403,'Complete all five questions in a chapter before World ID verification.','quiz_required');
}
