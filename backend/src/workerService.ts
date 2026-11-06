import mongoose from 'mongoose';
import type { Hex,Address } from 'viem';
import type { Config } from './config';
import { Claim,Lease,RewardTransaction } from './models';
import { randomToken } from './security';
import { makeChain,type ChainAdapter } from './blockchain';
import { unlockAchievements } from './rewards';

// One durable signer lane. The next nonce can be allocated after a transaction
// is canonically included; user-facing reward confirmation still waits for finality.
export async function processReward(c:Config,chain:ChainAdapter=makeChain(c)){
  const owner=randomToken();const name='sepolia-reward-signer-v1';
  try{await Lease.updateOne({name},{$setOnInsert:{owner:'unclaimed',expiresAt:new Date(0)}},{upsert:true});}catch(error){if((error as any).code!==11000)throw error;}
  const lease=await Lease.findOneAndUpdate({name,expiresAt:{$lt:new Date()}},{$set:{owner,expiresAt:new Date(Date.now()+120000)}},{new:true});
  if(!lease)return;
  try{
    // Recover badge writes even if a previous process died just after confirming a transaction.
    for(const student of await Claim.distinct('student',{status:'CONFIRMED'}))await unlockAchievements(String(student));
    const submitQueuedClaim=async(claim:any)=>{
      let prepared:Awaited<ReturnType<ChainAdapter['prepare']>>;
      try{prepared=await chain.prepare(claim.rewardId as Hex,claim.destination as Address,BigInt(String(claim.amount)));}
      catch{await Claim.updateOne({_id:claim._id,rawTransaction:{$exists:false}},{$set:{status:'FAILED_RETRYABLE',errorCode:'signer_or_simulation_unavailable'}});return;}
      // Persist exact signed bytes before broadcasting so retries cannot create a new nonce.
      await mongoose.connection.transaction(async session=>{
        const held=await Lease.updateOne({name,owner,expiresAt:{$gt:new Date()}},{$set:{expiresAt:new Date(Date.now()+120000)}},{session});
        if(held.matchedCount!==1)throw new Error('Lease lost.');
        const persisted=await Claim.updateOne({_id:claim._id,rawTransaction:{$exists:false},status:{$ne:'CONFIRMED'}},{$set:{rawTransaction:prepared.raw,txHash:prepared.hash,nonce:prepared.nonce,status:'TRANSACTION_PENDING'},$unset:{errorCode:1},$inc:{attempts:1}},{session});
        if(persisted.modifiedCount!==1)throw new Error('Claim changed.');
        await RewardTransaction.create([{rewardId:claim.rewardId,hash:prepared.hash,nonce:prepared.nonce,status:'TRANSACTION_PENDING'}],{session});
      });
      try{await chain.broadcast(prepared.raw);}catch{await Claim.updateOne({_id:claim._id,txHash:prepared.hash,status:{$ne:'CONFIRMED'}},{$set:{status:'TRANSACTION_PENDING',errorCode:'broadcast_or_network_pending'}});}
    };

    const signedClaims=await Claim.find({status:{$ne:'CONFIRMED'},rawTransaction:{$exists:true}}).sort({createdAt:1});
    for(const claim of signedClaims){
      const receipt=await chain.receipt(claim.txHash as Hex);
      if(!receipt){
        await Claim.updateOne({_id:claim._id,txHash:claim.txHash,status:{$ne:'CONFIRMED'}},{$set:{status:'TRANSACTION_PENDING'},$unset:{blockNumber:1}});
        try{await chain.broadcast(claim.rawTransaction as Hex);}catch{await Claim.updateOne({_id:claim._id,status:{$ne:'CONFIRMED'}},{$set:{status:'TRANSACTION_PENDING',errorCode:'broadcast_or_network_pending'}});}
        return; // Do not allocate a later nonce until this exact transaction is included.
      }
      const included=chain.included?await chain.included(receipt):true;
      if(!included){
        // The receipt was removed by a reorg. Re-broadcast the same signed bytes
        // and stop until the nonce is present in a canonical block again.
        await Claim.updateOne({_id:claim._id,txHash:claim.txHash,status:{$ne:'CONFIRMED'}},{$set:{status:'TRANSACTION_PENDING'},$unset:{blockNumber:1}});
        try{await chain.broadcast(claim.rawTransaction as Hex);}catch{await Claim.updateOne({_id:claim._id,status:{$ne:'CONFIRMED'}},{$set:{errorCode:'broadcast_or_network_pending'}});}
        return;
      }
      // Record a successful canonical inclusion first. A lagging/unavailable
      // finalized checkpoint must not hide a minted balance or stall the queue.
      if(receipt.status==='success'){
        const recipient=await chain.recipient(claim.rewardId as Hex,receipt.blockNumber);
        if(recipient.toLowerCase()!==String(claim.destination).toLowerCase())throw new Error('Included destination mismatch.');
        await Claim.updateOne({_id:claim._id,txHash:receipt.transactionHash,status:{$ne:'CONFIRMED'}},{$set:{status:'INCLUDED',blockNumber:String(receipt.blockNumber)},$unset:{errorCode:1}});
        await RewardTransaction.updateOne({hash:receipt.transactionHash},{$set:{status:'INCLUDED',blockNumber:String(receipt.blockNumber)}});
      }else{
        await Claim.updateOne({_id:claim._id,txHash:receipt.transactionHash,status:{$ne:'CONFIRMED'}},{$set:{status:'INCLUDED_REVERTED',blockNumber:String(receipt.blockNumber)},$unset:{errorCode:1}});
        await RewardTransaction.updateOne({hash:receipt.transactionHash},{$set:{status:'INCLUDED_REVERTED',blockNumber:String(receipt.blockNumber)}});
      }
      let finalized=false;
      try{finalized=await chain.confirmed(receipt);}catch{/* Inclusion is enough to advance the nonce; retry finality next poll. */}
      if(!finalized)continue;
      if(receipt.status==='reverted'){
        await mongoose.connection.transaction(async session=>{
          await RewardTransaction.updateOne({hash:claim.txHash},{$set:{status:'REVERTED',blockNumber:String(receipt.blockNumber)}},{session});
          await Claim.updateOne({_id:claim._id,txHash:receipt.transactionHash},{$set:{status:'FAILED_RETRYABLE',errorCode:'transaction_reverted'},$unset:{rawTransaction:1,txHash:1,nonce:1,blockNumber:1}},{session});
        });
        continue;
      }
      const recipient=await chain.recipient(claim.rewardId as Hex,receipt.blockNumber);
      if(recipient.toLowerCase()!==String(claim.destination).toLowerCase())throw new Error('Confirmed destination mismatch.');
      await mongoose.connection.transaction(async session=>{
        await Claim.updateOne({_id:claim._id,txHash:receipt.transactionHash},{$set:{status:'CONFIRMED',blockNumber:String(receipt.blockNumber),confirmedAt:new Date()},$unset:{rawTransaction:1,errorCode:1}},{session});
        await RewardTransaction.updateOne({hash:receipt.transactionHash},{$set:{status:'CONFIRMED',blockNumber:String(receipt.blockNumber)}},{session});
      });
      await unlockAchievements(String(claim.student));
    }

    // Only one new transaction is prepared per tick. Before advancing the nonce,
    // every earlier signed transaction above must have a canonical inclusion.
    const queued=await Claim.findOne({status:{$in:['CLAIM_REQUESTED','FAILED_RETRYABLE']},attempts:{$lt:3},rawTransaction:{$exists:false}}).sort({createdAt:1});
    if(queued)await submitQueuedClaim(queued);
  }finally{await Lease.updateOne({name,owner},{$set:{expiresAt:new Date(0)}});}
}
export function startWorker(c:Config){
  let stopped=false;let timer:ReturnType<typeof setTimeout>;
  console.info('Reward worker started; polling every 5 seconds.');
  async function tick(){if(stopped)return;try{await processReward(c);}catch(error){const type=error instanceof Error?error.name:'UnknownError';console.warn(`Reward worker tick failed (${type}); check database, signer funding, permissions and RPC configuration.`);}if(!stopped)timer=setTimeout(tick,5000);}
  void tick();return ()=>{stopped=true;clearTimeout(timer);};
}
