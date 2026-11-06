import { createPublicClient,createWalletClient,http,parseAbi,encodeFunctionData,keccak256,type Hex,type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import type { Config } from './config';
export const rewardAbi=parseAbi(['function distribute(bytes32 rewardId,address recipient,uint256 amount)','function recipients(bytes32) view returns (address)','function token() view returns (address)','function hasRole(bytes32,address) view returns (bool)','event RewardDistributed(bytes32 indexed rewardId,address indexed recipient,uint256 amount)']);
export type Receipt={status:'success'|'reverted';blockNumber:bigint;blockHash:Hex;transactionHash:Hex};
export interface ChainAdapter { prepare(rewardId:Hex,destination:Address,amount:bigint):Promise<{raw:Hex;hash:Hex;nonce:number}>;broadcast(raw:Hex):Promise<unknown>;receipt(hash:Hex):Promise<Receipt|null>;included?(receipt:Receipt):Promise<boolean>;confirmed(receipt:Receipt):Promise<boolean>;recipient(rewardId:Hex,blockNumber?:bigint):Promise<Address>; }
export function makeChain(c:Config):ChainAdapter{
  if(!c.SEPOLIA_RPC_URL||!c.REWARD_DISTRIBUTOR_ADDRESS||!/^0x[0-9a-fA-F]{64}$/.test(c.REWARD_SIGNER_PRIVATE_KEY))throw new Error('BLOCKED — EXTERNAL CONFIGURATION REQUIRED: Sepolia and dedicated signer.');
  const transport=http(c.SEPOLIA_RPC_URL,{timeout:15000,retryCount:0});const account=privateKeyToAccount(c.REWARD_SIGNER_PRIVATE_KEY as Hex);
  const client=createPublicClient({chain:sepolia,transport});const wallet=createWalletClient({chain:sepolia,transport,account});const address=c.REWARD_DISTRIBUTOR_ADDRESS as Address;
  return {
    async prepare(rewardId,destination,amount){
      if(await client.getChainId()!==sepolia.id)throw new Error('Wrong chain.');
      const token=await client.readContract({address,abi:rewardAbi,functionName:'token'});
      if(token.toLowerCase()!==c.REWARD_TOKEN_ADDRESS.toLowerCase())throw new Error('Token configuration mismatch.');
      await client.simulateContract({account,address,abi:rewardAbi,functionName:'distribute',args:[rewardId,destination,amount]});
      const request=await wallet.prepareTransactionRequest({account,to:address,data:encodeFunctionData({abi:rewardAbi,functionName:'distribute',args:[rewardId,destination,amount]})});
      const raw=await wallet.signTransaction(request);return {raw,hash:keccak256(raw),nonce:request.nonce};
    },
    broadcast:raw=>client.sendRawTransaction({serializedTransaction:raw}),
    async receipt(hash){try{return await client.getTransactionReceipt({hash});}catch(error){if((error as Error).name==='TransactionReceiptNotFoundError')return null;throw error;}},
    async included(receipt){const block=await client.getBlock({blockNumber:receipt.blockNumber});return block.hash===receipt.blockHash;},
    async confirmed(receipt){const finalized=await client.getBlock({blockTag:'finalized'});if(finalized.number<receipt.blockNumber)return false;const block=await client.getBlock({blockNumber:receipt.blockNumber});return block.hash===receipt.blockHash;},
    recipient:(rewardId,blockNumber)=>client.readContract({address,abi:rewardAbi,functionName:'recipients',args:[rewardId],...(blockNumber===undefined?{}:{blockNumber})}),
  };
}
