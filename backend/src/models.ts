import mongoose, { Schema } from 'mongoose';
mongoose.set('bufferCommands',false);
mongoose.set('autoCreate',false);
mongoose.set('autoIndex',false);
const str={type:String,required:true};
const ref={type:Schema.Types.ObjectId,required:true};
function model(name:string,fields:mongoose.SchemaDefinition,indexes:[Record<string,1|-1>,Record<string,unknown>][]=[]){
  const schema=new Schema<any>(fields,{timestamps:true,strict:'throw'});
  for(const [keys,options] of indexes) schema.index(keys,options);
  return mongoose.model(name,schema);
}
// Stable internal IDs; public profile information is explicitly projected by the API.
export const Student=model('Student',{username:{...str,unique:true},displayName:str,passwordHash:str,recoveryHash:str,bio:{type:String,default:''},avatar:{type:String,default:'leaf'},publicProgress:{type:Boolean,default:false},publicRewards:{type:Boolean,default:false},publicWallet:{type:Boolean,default:false},rewardWallet:String,reduceMotion:{type:Boolean,default:false},largeText:{type:Boolean,default:false}});
export const Session=model('Session',{tokenHash:{...str,unique:true},student:ref,csrf:str,expiresAt:{type:Date,required:true}},[[{expiresAt:1},{expireAfterSeconds:0}]]);
export const Verification=model('WorldIdVerification',{student:{...ref,unique:true},human:{...str,unique:true},scope:str,environment:str,verifiedAt:{type:Date,required:true}});
export const Challenge=model('OwnershipChallenge',{student:ref,kind:str,nonce:{...str,unique:true},message:String,address:String,signal:String,authSession:String,worldScope:String,expiresAt:{type:Date,required:true},used:{type:Boolean,default:false}},[[{expiresAt:1},{expireAfterSeconds:0}]]);
export const Wallet=model('LinkedWallet',{student:ref,address:{...str,unique:true},verifiedAt:{type:Date,required:true}});
export const Progress=model('LessonProgress',{student:ref,lessonId:str,mode:str,stage:{type:Number,default:0},completed:{type:Boolean,default:false},source:{type:String,default:'lesson'}},[[{student:1,lessonId:1},{unique:true}]]);
export const MCQProgress=model('MCQProgress',{student:ref,chapterId:str,completed:{type:[String],default:[]}},[[{student:1,chapterId:1},{unique:true}]]);
export const MCQAttempt=model('MCQAttempt',{student:ref,chapterId:str,questionId:str,selected:{type:Number,required:true},correct:{type:Boolean,required:true}});
export const Attempt=model('MasterChallengeAttempt',{student:ref,human:str,chapterId:str,rewardScope:str,selected:{type:Number,required:true},passed:{type:Boolean,required:true}},[[{human:1,rewardScope:1},{unique:true}]]);
export const Eligibility=model('RewardEligibility',{student:ref,human:str,chapterId:str,rewardScope:str,rewardId:{...str,unique:true},amount:str},[[{human:1,rewardScope:1},{unique:true}]]);
export const Claim=model('RewardClaim',{student:ref,rewardId:{...str,unique:true},chapterId:str,destination:str,amount:str,status:{type:String,enum:['CLAIM_REQUESTED','TRANSACTION_PENDING','INCLUDED','INCLUDED_REVERTED','CONFIRMED','FAILED_RETRYABLE'],default:'CLAIM_REQUESTED'},txHash:String,rawTransaction:String,nonce:Number,blockNumber:String,confirmedAt:Date,errorCode:String,attempts:{type:Number,default:0}});
export const RewardTransaction=model('RewardTransaction',{rewardId:str,hash:{...str,unique:true},nonce:{type:Number,required:true},status:str,blockNumber:String});
export const Achievement=model('StudentAchievement',{student:ref,badgeId:str,unlockedAt:{type:Date,required:true}},[[{student:1,badgeId:1},{unique:true}]]);
export const Lease=model('WorkerLease',{name:{...str,unique:true},owner:str,expiresAt:{type:Date,required:true}});
export async function connectDatabase(uri:string){
  await mongoose.connect(uri,{serverSelectionTimeoutMS:5000});
  const hello=await mongoose.connection.db!.admin().command({hello:1});
  if(!hello.setName && hello.msg!=='isdbgrid') throw new Error('MongoDB must support transactions: use Atlas or a replica set.');
  for(const item of Object.values(mongoose.models)){await item.createCollection();await item.createIndexes();}
}
