// A deliberately noncryptographic 32-bit hash for the work-search demonstration.
// This is not Ethash, Keccak, a block hash, or a security primitive.
export function toyWorkHash(message: string): number {
  let hash = 2166136261;
  for (let i = 0; i < message.length; i++) hash = Math.imul(hash ^ message.charCodeAt(i), 16777619);
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x846ca68b);
  return (hash ^ (hash >>> 16)) >>> 0;
}

export type WorkAttempt = { nonce: number; hash: number; meetsTarget: boolean };
export function searchWork(amount: number, difficulty: number, start: number, count: number): WorkAttempt[] {
  const target = 2 ** (32 - difficulty * 4);
  const attempts: WorkAttempt[] = [];
  for (let nonce = start; nonce < start + Math.min(count, 512); nonce++) {
    const hash = toyWorkHash(`parent:abc123|Alice:10|Bob:0|send:${amount}|nonce:${nonce}`);
    const attempt = { nonce, hash, meetsTarget: hash < target };
    attempts.push(attempt);
    if (attempt.meetsTarget) break;
  }
  return attempts;
}

export function nextBaseFee(base: bigint, used: bigint, target: bigint): bigint {
  if (base < 0n || target <= 0n || used < 0n || used > target * 2n) throw new Error('Invalid base-fee inputs');
  if (used === target) return base;
  if (used > target) {
    const change = base * (used - target) / target / 8n;
    return base + (change > 0n ? change : 1n);
  }
  return base - base * (target - used) / target / 8n;
}

export const GWEI = 1_000_000_000n;
export function gwei(value: bigint): string {
  const whole = value / GWEI;
  const fraction = (value % GWEI).toString().padStart(9, '0').replace(/0+$/, '');
  return `${whole}${fraction ? `.${fraction}` : ''}`;
}
export function effectivePrice(base: bigint, cap: bigint, priority: bigint): bigint | null {
  if (cap < base || cap < priority || priority < 0n) return null;
  return cap < base + priority ? cap : base + priority;
}

export type TokenState = { alice: number; bob: number; vault: number; allowance: number; events: string[] };
export type TokenAction = { kind: 'transfer' | 'approve' | 'transferFrom'; amount: number };
export const initialTokenState = (): TokenState => ({ alice: 100, bob: 0, vault: 0, allowance: 0, events: [] });
export function applyTokenAction(state: TokenState, action: TokenAction): { state: TokenState; message: string; ok: boolean } {
  if (!Number.isSafeInteger(action.amount) || action.amount < 0 || action.amount > 1000) return { state, message: 'Enter a whole number from 0 to 1,000 toy token units.', ok: false };
  const { amount, kind } = action;
  if (kind === 'approve') return { state: { ...state, allowance: amount, events: [`Approval(Alice, Vault, ${amount})`, ...state.events].slice(0, 8) }, message: `Alice authorized Vault to spend up to ${amount} token units. No tokens moved.`, ok: true };
  if (kind === 'transferFrom' && amount > state.allowance) return { state, message: `Rejected: Vault may spend only ${state.allowance}. Approve an allowance first. No balances changed.`, ok: false };
  if (amount > state.alice) return { state, message: `Rejected: Alice has only ${state.alice} token units. No balances or allowances changed.`, ok: false };
  if (kind === 'transfer') return { state: { ...state, alice: state.alice - amount, bob: state.bob + amount, events: [`Transfer(Alice, Bob, ${amount})`, ...state.events].slice(0, 8) }, message: `Alice sent ${amount} token units to Bob. Vault's permission did not change.`, ok: true };
  return { state: { ...state, alice: state.alice - amount, vault: state.vault + amount, allowance: state.allowance - amount, events: [`Transfer(Alice, Vault, ${amount})`, ...state.events].slice(0, 8) }, message: `Vault used ${amount} of its permission to pull tokens from Alice. ${state.allowance - amount} allowance remains.`, ok: true };
}
