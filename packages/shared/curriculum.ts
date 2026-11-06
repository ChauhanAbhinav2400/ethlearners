export type LearningMode = 'developer' | 'everyday';
export type Chapter = { id: string; mode: LearningMode; worldId: string; title: string; lessonIds: string[]; rewardScope: string };
const developer: [string, string[]][] = [
  ['The Web2 world',['source-of-truth']], ['Shared records',['replication','peers']], ['Blockchain foundations',['hashes','signatures','blocks']],
  ['Inside an Ethereum node',['ethereum-node']], ['Accounts & wallets',['wallets']], ['Execution & transaction pools',['transaction-pool','receipts-and-logs']],
  ['The EVM',['evm']], ['Gas & fees',['gas']], ['Proof of stake',['consensus']], ['The transaction journey',['transaction-journey']],
  ['Building with Ethereum',['contract-workshop','frontend-rpc']], ['Beyond layer one',['rollups','bridges','oracles','smart-accounts']],
  ['Ethereum history',['proof-of-work','the-merge']], ['A protocol that evolves',['protocol-upgrades','token-standards']],
];
export const everydayTitles = ['Welcome to Web3','Understanding Blockchain','What Is Ethereum?','Your First Wallet','Addresses and Private Keys','Sending Transactions','Understanding Gas Fees','Smart Contracts','Tokens','NFTs','Decentralized Applications','Staying Safe in Web3','Common Web3 Scams','Real-World Applications','Your Web3 Journey'];
export const chapters: Chapter[] = [
  ...developer.map(([title,lessonIds],i)=>({id:`dev-${String(i).padStart(2,'0')}`,mode:'developer' as const,worldId:String(i).padStart(2,'0'),title,lessonIds,rewardScope:`developer-v1:${i}`})),
  ...everydayTitles.map((title,i)=>({id:`everyday-${i+1}`,mode:'everyday' as const,worldId:'everyday',title,lessonIds:[`everyday-${i+1}`],rewardScope:`everyday-v1:${i+1}`})),
];
export const chapterById = Object.fromEntries(chapters.map(c=>[c.id,c]));
export const chapterForLesson = (id:string)=>chapters.find(c=>c.lessonIds.includes(id));
export const REWARD_AMOUNT = '10000000000000000000'; // 10 LEARN, 18 decimals; fixed contract policy.
export const PATH_VERSION = 'developer-v1'; // Ethereum Master requires all 14 Developer rewards.
export const badges = [
  {id:'first-victory',name:'First Victory',required:1,description:'One confirmed chapter reward.'},
  {id:'rising-explorer',name:'Rising Explorer',required:3,description:'Three confirmed chapter rewards.'},
  {id:'knowledge-champion',name:'Knowledge Champion',required:5,description:'Five confirmed chapter rewards.'},
  {id:'ethereum-master',name:'Ethereum Master',required:14,description:'All 14 Developer v1 chapter rewards confirmed.'},
];
