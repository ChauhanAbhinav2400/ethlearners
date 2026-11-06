export type Sender = 'Alice' | 'Bob' | 'Carol';
export type PoolAccount = { nonce: number; balance: number };
export type PoolAccounts = Record<Sender, PoolAccount>;
export type PoolTx = { id: string; sender: Sender; nonce: number; value: number; maxFee: number; tip: number; signed: boolean };
export const poolBaseFee = 20;
export const transferGas = 21000;
export const initialAccounts = (): PoolAccounts => ({ Alice: { nonce: 0, balance: 2000000 }, Bob: { nonce: 0, balance: 1000000 }, Carol: { nonce: 0, balance: 400000 } });
export function whole(value: string, min = 0, max = 10000000): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const number = Number(value); return Number.isSafeInteger(number) && number >= min && number <= max ? number : null;
}
export function checkAdmission(tx: PoolTx, accounts: PoolAccounts, pool: PoolTx[], minTip: number): string | null {
  if (![tx.nonce, tx.value, tx.maxFee, tx.tip].every(Number.isSafeInteger) || Math.min(tx.nonce, tx.value, tx.maxFee, tx.tip) < 0) return 'The fields must be non-negative whole numbers.';
  if (!tx.signed) return 'Invalid signature: the sender has not authorized these fields.';
  if (tx.tip > tx.maxFee) return 'Invalid fee fields: the tip cap cannot exceed the maximum fee.';
  if (tx.nonce < accounts[tx.sender].nonce) return 'Nonce already used: this request cannot execute again.';
  if (tx.value + transferGas * tx.maxFee > accounts[tx.sender].balance) return 'Insufficient balance for the transfer plus its maximum gas budget.';
  if (pool.some(item => item.sender === tx.sender && item.nonce === tx.nonce)) return 'This node already holds that sender and nonce. Replacement rules are outside this lab.';
  if (tx.tip < minTip) return `Local policy: this node requires a requested tip of at least ${minTip} gwei per gas. Another node may accept it.`;
  return null;
}
export function poolLabel(tx: PoolTx, accounts: PoolAccounts): string {
  if (tx.nonce < accounts[tx.sender].nonce) return 'Stale · nonce used';
  if (tx.nonce > accounts[tx.sender].nonce) return `Queued · waiting for nonce ${accounts[tx.sender].nonce}`;
  if (tx.maxFee < poolBaseFee) return 'Parked · fee below base';
  if (tx.value + transferGas * tx.maxFee > accounts[tx.sender].balance) return 'Waiting · balance too low';
  return 'Ready for selection';
}
export function selectBlock(pool: PoolTx[], initial: PoolAccounts, capacity = 2): { selected: PoolTx[]; accounts: PoolAccounts; fees: number } {
  const accounts: PoolAccounts = { Alice: { ...initial.Alice }, Bob: { ...initial.Bob }, Carol: { ...initial.Carol } };
  const selected: PoolTx[] = []; let fees = 0;
  while (selected.length < capacity) {
    const ready = pool.filter(tx => !selected.includes(tx) && tx.signed && tx.nonce === accounts[tx.sender].nonce && tx.maxFee >= poolBaseFee && tx.tip <= tx.maxFee && tx.value + transferGas * tx.maxFee <= accounts[tx.sender].balance);
    ready.sort((a, b) => Math.min(b.tip, b.maxFee - poolBaseFee) - Math.min(a.tip, a.maxFee - poolBaseFee));
    const tx = ready[0]; if (!tx) break;
    const fee = transferGas * Math.min(tx.maxFee, poolBaseFee + tx.tip);
    accounts[tx.sender].balance -= tx.value + fee; accounts[tx.sender].nonce++; fees += fee; selected.push(tx);
  }
  return { selected, accounts, fees };
}
export type ReceiptState = { count: number; nonce: number; balance: number; block: number };
export type ReceiptOutcome = { before: ReceiptState; after: ReceiptState; draft: number | null; status: '0x0' | '0x1'; used: number; fee: number; logs: { name: 'Changed'; value: number }[]; reason: 'success' | 'revert' | 'out-of-gas' };
export const initialReceiptState = (): ReceiptState => ({ count: 5, nonce: 0, balance: 10000000, block: 100 });
export function executeIncluded(before: ReceiptState, add: number, gasLimit: number, revert: boolean): ReceiptOutcome | string {
  if (!Number.isSafeInteger(add) || add < 1 || add > 100 || !Number.isSafeInteger(gasLimit) || gasLimit < 21000 || gasLimit > 100000) return 'Use an increment from 1 to 100 and a gas limit from 21,000 to 100,000.';
  if (before.balance < gasLimit * 22) return 'Not included: the sender cannot afford this model’s gas budget. The nonce and contract stay unchanged.';
  const required = revert ? 28000 : 42000; const outOfGas = gasLimit < required; const used = outOfGas ? gasLimit : required; const success = !outOfGas && !revert;
  return { before, after: { count: success ? before.count + add : before.count, nonce: before.nonce + 1, balance: before.balance - used * 22, block: before.block + 1 }, draft: gasLimit >= 26000 ? before.count + add : null, status: success ? '0x1' : '0x0', used, fee: used * 22, logs: success ? [{ name: 'Changed', value: before.count + add }] : [], reason: outOfGas ? 'out-of-gas' : revert ? 'revert' : 'success' };
}
export const GET_SELECTOR = '0x6d4ce63c';
export const SET_SELECTOR = '0x60fe47b1';
export const CONTRACT_ADDRESS = '0x000000000000000000000000000000000000c001';
export const OTHER_ADDRESS = '0x000000000000000000000000000000000000c002';
export function encodeUint(value: number | bigint): string { if (typeof value === 'number' && !Number.isSafeInteger(value)) throw new Error('Use bigint for values outside the safe integer range'); const number = BigInt(value); if (number < 0n || number >= 2n ** 256n) throw new Error('Value is outside uint256'); return `0x${number.toString(16).padStart(64, '0')}`; }
export function decodeUint(word: string): bigint { if (!/^0x[0-9a-fA-F]{64}$/.test(word)) throw new Error('Expected one 32-byte ABI word'); return BigInt(word); }
export const encodeSet = (value: number) => SET_SELECTOR + encodeUint(value).slice(2);
const TOY_RPC_PREFIX = 'explorer-toy:v1:';
const TOY_SENDER = '0x000000000000000000000000000000000000a001';
export type ToyRpcEnvelope = { format: 'ethereum-explorer-local-v1'; chainId: number; nonce: number; from: string; to: string; data: string };
export function encodeToyEnvelope(value: number, nonce: number): string {
  if (!Number.isSafeInteger(value) || value < 0 || value > 1000 || !Number.isSafeInteger(nonce) || nonce < 0) throw new Error('Invalid local transaction fields');
  const payload: ToyRpcEnvelope = { format: 'ethereum-explorer-local-v1', chainId: 31337, nonce, from: TOY_SENDER, to: CONTRACT_ADDRESS, data: encodeSet(value) };
  // All fields in this model are ASCII. This is hex-encoded JSON, not Ethereum serialization or a signature.
  return TOY_RPC_PREFIX + Array.from(JSON.stringify(payload), character => character.charCodeAt(0).toString(16).padStart(2, '0')).join('');
}
export function receiveToyEnvelope(raw: string, expectedNonce: number): { payload: ToyRpcEnvelope; value: number } {
  if (!raw.startsWith(TOY_RPC_PREFIX)) throw new Error('This local receiver accepts only explorer-toy envelopes');
  const hex = raw.slice(TOY_RPC_PREFIX.length);
  if (!/^(?:[0-9a-f]{2})+$/.test(hex)) throw new Error('The local envelope is not valid hexadecimal JSON');
  const payload: ToyRpcEnvelope = JSON.parse(hex.match(/.{2}/g)!.map(pair => String.fromCharCode(parseInt(pair, 16))).join(''));
  if (!payload || payload.format !== 'ethereum-explorer-local-v1' || payload.chainId !== 31337 || payload.from !== TOY_SENDER || payload.to !== CONTRACT_ADDRESS) throw new Error('The local envelope targets an unexpected chain, account, or contract');
  if (!Number.isSafeInteger(payload.nonce) || payload.nonce !== expectedNonce) throw new Error(`The local sender needs nonce ${expectedNonce}`);
  if (typeof payload.data !== 'string' || !payload.data.startsWith(SET_SELECTOR)) throw new Error('The local receiver expects set(uint256) calldata');
  const value = decodeUint(`0x${payload.data.slice(SET_SELECTOR.length)}`);
  if (value > 1000n) throw new Error('This local model accepts values only from 0 to 1,000');
  return { payload, value: Number(value) };
}
export const syntheticHash = (number: number) => `0x${number.toString(16).padStart(64, '0')}`;
export const toHex = (number: number) => `0x${number.toString(16)}`;
export const counterAbi = [
  { type: 'function', name: 'get', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'set', stateMutability: 'nonpayable', inputs: [{ name: 'next', type: 'uint256' }], outputs: [] },
  { type: 'event', name: 'Changed', anonymous: false, inputs: [{ name: 'value', type: 'uint256', indexed: false }] },
];
