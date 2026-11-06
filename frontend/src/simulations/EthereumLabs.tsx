import { useEffect, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, Check, ChevronRight, Cpu, Database, Fuel, GitBranch, KeyRound, Layers, Network, Pause, Play, Radio, RotateCcw, ShieldCheck, Unplug, Wallet } from 'lucide-react';
import type { SimulationProps } from '../content/types';
import './ethereum.css';

function Status({ children, warning = false }: { children: React.ReactNode; warning?: boolean }) {
  return <div className={`eth-status ${warning ? 'eth-status-warning' : ''}`} role="status"><span className="eth-status-dot" />{children}</div>;
}
function LabCaption({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="eth-lab-caption"><span className="eyebrow">{label}</span><p>{children}</p></div>;
}
const nodeParts = {
  execution: { title: 'Execution client', label: 'EXECUTION', icon: Cpu, text: 'Checks transactions, executes the EVM, and maintains account and contract state. It also has its own peer network and transaction pool.', code: 'payload → execute → state root' },
  engine: { title: 'Engine API', label: 'INTERNAL INTERFACE', icon: Layers, text: 'The authenticated connection between the two clients. The consensus client requests payload validation and communicates fork-choice updates to the execution client.', code: 'engine_newPayload / forkchoiceUpdated' },
  consensus: { title: 'Consensus client', label: 'CONSENSUS', icon: ShieldCheck, text: 'Tracks the beacon chain, checks consensus rules, and applies fork choice and finality. A separate validator component is needed to propose and attest.', code: 'blocks + attestations → chain view' },
  rpc: { title: 'JSON-RPC', label: 'APPLICATION INTERFACE', icon: Radio, text: 'An application can query state or submit a signed transaction through an execution client’s RPC endpoint. An RPC provider operates infrastructure; it is not your wallet.', code: 'eth_getBalance / eth_sendRawTransaction' },
};

export function NodeLab({ onDiscover }: SimulationProps) {
  const [selected, setSelected] = useState<keyof typeof nodeParts>('execution');
  const [execution, setExecution] = useState(true);
  const [consensus, setConsensus] = useState(true);
  const [height, setHeight] = useState(1042);
  const [message, setMessage] = useState('Both clients are connected. Inspect a component, then try advancing the local chain.');
  const part = nodeParts[selected];
  function toggle(which: 'execution' | 'consensus') {
    const next = !(which === 'execution' ? execution : consensus);
    if (which === 'execution') setExecution(next); else setConsensus(next);
    const text = next ? `${which === 'execution' ? 'Execution' : 'Consensus'} client reconnected. Try advancing the chain again.` : which === 'execution' ? 'Execution client offline: new payloads cannot be executed or validated. Consensus alone cannot safely advance this full node.' : 'Consensus client offline: execution can serve its existing state, but this paired node cannot follow new canonical blocks.';
    setMessage(text); onDiscover(text);
  }
  function advance() {
    const text = execution && consensus ? 'Payload executed and validated; the consensus client updated this node’s chain view. This is not a finality claim.' : !execution ? 'Stalled: the execution client cannot validate the proposed payload.' : 'Stalled: no consensus updates arrive to select the canonical head.';
    if (execution && consensus) setHeight(h => h + 1);
    setMessage(text); onDiscover(text);
  }
  return <div className="eth-lab eth-node-lab">
    <LabCaption label="INSIDE ONE FULL NODE">Two clients. Different responsibilities. One local view of Ethereum.</LabCaption>
    <div className="eth-node-shell">
      <div className="eth-node-heading"><span><Network size={15} /> YOUR LOCAL NODE</span><span className="mono">head #{height.toLocaleString('en-US')}</span></div>
      <div className="eth-node-top"><button className={`eth-rpc ${selected === 'rpc' ? 'is-selected' : ''}`} onClick={() => setSelected('rpc')} aria-pressed={selected === 'rpc'}><Radio size={19} /> Application / JSON-RPC <ArrowDown size={15} /></button></div>
      <div className="eth-node-pair">
        <button className={`eth-client ${selected === 'execution' ? 'is-selected' : ''} ${!execution ? 'is-offline' : ''}`} onClick={() => setSelected('execution')} aria-pressed={selected === 'execution'}><Cpu size={27} /><span className="eth-client-name">Execution client</span><span className="eth-client-desc">Transactions · EVM · state</span><span className="eth-client-live"><i />{execution ? 'Connected' : 'Offline'}</span></button>
        <button className={`eth-engine ${selected === 'engine' ? 'is-selected' : ''}`} onClick={() => setSelected('engine')} aria-pressed={selected === 'engine'}><span>⇄</span><strong>Engine API</strong><small>inspect interface</small></button>
        <button className={`eth-client ${selected === 'consensus' ? 'is-selected' : ''} ${!consensus ? 'is-offline' : ''}`} onClick={() => setSelected('consensus')} aria-pressed={selected === 'consensus'}><ShieldCheck size={27} /><span className="eth-client-name">Consensus client</span><span className="eth-client-desc">Fork choice · finality</span><span className="eth-client-live"><i />{consensus ? 'Connected' : 'Offline'}</span></button>
      </div>
      <div className="eth-node-databases"><span><Database size={14} /> Execution state & history</span><span><Database size={14} /> Beacon chain data</span></div>
    </div>
    <div className="eth-inspector"><div className="eth-inspector-title"><part.icon size={17} /><span className="eyebrow">{part.label}</span></div><h3>{part.title}</h3><p>{part.text}</p><code>{part.code}</code></div>
    <div className="eth-actions"><button className="btn btn-primary" onClick={advance}><Play size={14} /> Process next payload</button><button className="btn btn-secondary" onClick={() => toggle('execution')}><Unplug size={14} /> {execution ? 'Disconnect' : 'Connect'} execution</button><button className="btn btn-secondary" onClick={() => toggle('consensus')}><Unplug size={14} /> {consensus ? 'Disconnect' : 'Connect'} consensus</button></div>
    <Status warning={!execution || !consensus}>{message}</Status><p className="lab-note">Local architecture model. A full node can verify Ethereum without staking or running a validator. Each client also communicates with its own peers.</p>
  </div>;
}

type ToyTransaction = { amount: number; nonce: number; chainId: number };
function integer(text: string, min: number, max: number): number | null {
  if (!/^\d+$/.test(text.trim())) return null;
  const value = Number(text);
  return Number.isSafeInteger(value) && value >= min && value <= max ? value : null;
}
export function WalletLab({ onDiscover }: SimulationProps) {
  const [amount, setAmount] = useState('2');
  const [nonce, setNonce] = useState('7');
  const [chainId, setChainId] = useState('31337');
  const [account, setAccount] = useState({ balance: 10, nonce: 7 });
  const [signed, setSigned] = useState<ToyTransaction | null>(null);
  const [pending, setPending] = useState<ToyTransaction | null>(null);
  const [message, setMessage] = useState('Compose a transaction. The wallet prepares an intent; the account balance lives in chain state.');
  function edit(update: (value: string) => void, value: string) { update(value); if (signed) setMessage('The transaction changed. Its previous toy signature no longer matches. Sign the new fields.'); setSigned(null); }
  function sign() {
    const values = { amount: integer(amount, 1, 1000), nonce: integer(nonce, 0, 999999), chainId: integer(chainId, 1, 99999999) };
    if (values.amount === null || values.nonce === null || values.chainId === null) { setMessage('Enter whole numbers: amount 1–1,000, nonce 0–999,999, and chain ID 1–99,999,999.'); return; }
    setSigned(values as ToyTransaction); setMessage('Toy signature created over a frozen copy of these fields. Editing any field requires a new signature.'); onDiscover('A signature binds the transaction fields. The wallet does not directly edit the chain’s account balance.');
  }
  function submit() {
    if (!signed) return;
    if (signed.chainId !== 31337) { setMessage('Rejected by this local node: chain ID must be 31337. A chain ID helps bind a signature to its intended chain.'); return; }
    if (signed.nonce !== account.nonce) { setMessage(`This simplified pool expects nonce ${account.nonce}. Real clients can queue future nonces; an already-used nonce cannot be included again.`); return; }
    if (signed.amount > account.balance) { setMessage('Rejected: insufficient simulated balance. No account state changed.'); return; }
    setPending({ ...signed }); setMessage('Accepted into this node’s local transaction pool. Still pending: the account balance and nonce have not changed.'); onDiscover('Submission is not inclusion. A pending transaction has not changed canonical account state.');
  }
  function include() {
    if (!pending) return;
    setAccount(a => ({ balance: a.balance - pending.amount, nonce: a.nonce + 1 })); setNonce(String(account.nonce + 1)); setPending(null); setSigned(null);
    setMessage('Included in a simulated block: the balance changed and the sender nonce increased. Inclusion is not protocol finality. Fees are omitted in this wallet model.'); onDiscover('Execution and inclusion update account state. A wallet signs the request; it does not store the onchain balance.');
  }
  return <div className="eth-lab">
    <LabCaption label="FROM INTENT TO TRANSACTION">Your wallet signs a request. The network checks it.</LabCaption>
    <div className="eth-wallet-grid"><section className="eth-wallet-card"><div className="eth-card-label"><Wallet size={18} /><span>Wallet interface</span><span className="eth-mini-tag">LOCAL ONLY</span></div><div className="eth-address mono">0xAlice…7a2f <ArrowRight size={15} /> 0xBob…9c01</div><label className="eth-field">Amount · simulated ETH<input inputMode="numeric" value={amount} onChange={e => edit(setAmount, e.target.value)} disabled={!!pending} /></label><div className="eth-two-fields"><label className="eth-field">Transaction nonce<input inputMode="numeric" value={nonce} onChange={e => edit(setNonce, e.target.value)} disabled={!!pending} /></label><label className="eth-field">Chain ID<input inputMode="numeric" value={chainId} onChange={e => edit(setChainId, e.target.value)} disabled={!!pending} /></label></div><div className={`eth-signature ${signed ? 'is-signed' : ''}`}><KeyRound size={16} /><span>{signed ? 'Toy signature attached' : 'Unsigned transaction'}</span><span className="mono">{signed ? `n${signed.nonce} · c${signed.chainId}` : '—'}</span></div></section>
    <section className="eth-account-card"><div className="eth-card-label"><Database size={18} /><span>Account on chain</span></div><span className="eyebrow">ALICE’S BALANCE</span><strong className="eth-account-balance">{account.balance}<small>simulated ETH</small></strong><div className="eth-account-row"><span>Next account nonce</span><strong className="mono">{account.nonce}</strong></div><div className="eth-account-row"><span>Local pool</span><strong className="mono">{pending ? '1 pending' : 'empty'}</strong></div><p>The account is state. The wallet is the interface and key manager.</p></section></div>
    <div className="eth-actions"><button className="btn btn-primary" onClick={sign} disabled={!!pending}><KeyRound size={14} /> Sign transaction</button><button className="btn btn-secondary" onClick={submit} disabled={!signed || !!pending}><Radio size={14} /> Submit to local pool</button>{pending && <button className="btn btn-primary" onClick={include}><Layers size={14} /> Include in toy block</button>}</div>
    <Status>{message}</Status><p className="lab-note">No real wallet, keys, signature cryptography, RPC connection, or funds. Integer ETH values, balance checks, and pool behavior are intentionally simplified; fees are explored in the gas lab.</p>
  </div>;
}

const journeyStages = [
  { title: 'Submission', owner: 'Wallet → RPC', icon: Wallet, detail: 'The wallet sends a signed transaction to a node. Receiving a transaction hash is an acknowledgement, not proof of inclusion.', state: 'No account state change', code: 'eth_sendRawTransaction(signedTx)' },
  { title: 'Pending', owner: 'Execution client', icon: Network, detail: 'This node validates admission rules and may retain and share the transaction. Every node has its own pool; transactions can be dropped, replaced, or never included.', state: 'In a local pool', code: 'local txpool → peer propagation' },
  { title: 'Execution', owner: 'Payload construction', icon: Cpu, detail: 'A payload builder selects transactions and executes them against a candidate parent state. This candidate result is not yet canonical chain state.', state: 'Candidate state computed', code: 'parent state + transactions → candidate state' },
  { title: 'Proposal', owner: 'Selected proposer', icon: Layers, detail: 'A validator proposes a beacon block containing an execution payload. Other nodes independently check consensus rules and re-execute the payload.', state: 'Proposed, not guaranteed', code: 'beacon block { execution_payload }' },
  { title: 'Inclusion', owner: 'Local canonical chain', icon: Check, detail: 'The transaction is in a block your node currently considers canonical. A receipt reports execution success or failure. A reorganization can still remove this inclusion.', state: 'Included · not final', code: 'receipt { status, gasUsed, blockHash }' },
  { title: 'Attestations', owner: 'Stake-weighted validators', icon: ShieldCheck, detail: 'Validators attest to a head and checkpoint links. Fork choice selects a head; more descendant blocks give confirmations, which are distinct from protocol finality.', state: 'Head votes & checkpoint votes', code: 'attestation { head, source, target }' },
  { title: 'Finality', owner: 'Checkpoint consensus', icon: ShieldCheck, detail: 'With the required stake-weighted checkpoint links over epochs, a checkpoint and its ancestors become finalized. Finality may stall when participation is insufficient.', state: 'Containing checkpoint finalized', code: 'justified checkpoint → later link → finalized' },
];
export function JourneyLab({ onDiscover }: SimulationProps) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const stage = journeyStages[step]; const Icon = stage.icon;
  useEffect(() => {
    if (!playing || step >= 6) return;
    const timer = window.setTimeout(() => { const next = step + 1; setStep(next); if (next >= 4) onDiscover(journeyStages[next].detail); if (next === 6) setPlaying(false); }, 3500);
    return () => window.clearTimeout(timer);
  }, [playing, step, onDiscover]);
  function go(next: number) { setPlaying(false); setStep(next); if (next >= 4) onDiscover(journeyStages[next].detail); }
  return <div className="eth-lab"><LabCaption label="ONE TRANSACTION · SEVEN STAGES">Follow the request. Watch what each stage actually promises.</LabCaption>
    <ol className="eth-journey-track">{journeyStages.map((item, index) => <li key={item.title} className={index === step ? 'is-current' : index < step ? 'is-done' : ''}><button aria-label={`Inspect ${item.title}`} aria-current={index === step ? 'step' : undefined} onClick={() => go(index)}><span className="eth-stage-dot">{index < step ? <Check size={13} /> : index + 1}</span><span>{item.title}</span></button></li>)}</ol>
    <div className="eth-journey-stage"><div className="eth-journey-visual"><span className="eth-orbit eth-orbit-one" /><span className="eth-orbit eth-orbit-two" /><div className="eth-stage-icon"><Icon size={39} strokeWidth={1.3} /></div><span className="eth-transaction-label mono">TX 0x7a…2f</span><span className={`eth-journey-state ${step === 6 ? 'is-final' : ''}`}>{stage.state}</span></div><div className="eth-stage-story"><span className="eyebrow">STAGE 0{step + 1} / 07 · {stage.owner}</span><h3>{stage.title}</h3><p>{stage.detail}</p><code>{stage.code}</code></div></div>
    <div className="eth-actions"><button className="btn btn-secondary" onClick={() => go(step - 1)} disabled={step === 0}><ArrowLeft size={14} /> Back a stage</button><button className="btn btn-primary" onClick={() => go(step + 1)} disabled={step === 6}>Advance one stage <ArrowRight size={14} /></button><button className="btn btn-secondary" onClick={() => setPlaying(!playing)} disabled={step === 6}>{playing ? <Pause size={14} /> : <Play size={14} />}{playing ? 'Pause journey' : 'Play journey'}</button><button className="btn btn-secondary" onClick={() => go(0)} disabled={step === 0 && !playing}><RotateCcw size={14} /> Replay journey</button></div>
    <Status>{step === 6 ? 'Finality is a separate consensus outcome, not a synonym for successful execution or first inclusion.' : `${step + 1} of 7 · ${stage.state}.`}</Status><p className="lab-note">A simplified successful path, not a clock or a guarantee. Execution also happens during independent validation. Transactions can fail, disappear from pools, or be reorganized before finality.</p>
  </div>;
}

type Instruction = { op: 'PUSH1' | 'ADD' | 'MSTORE' | 'SSTORE' | 'STOP' | 'REVERT'; value?: number; cost: number; pc: number };
export type TraceState = { cursor: number; stack: number[]; memory: number | null; storage: number; gas: number; halted: boolean; reverted: boolean; history: string[] };
export function initialTrace(): TraceState { return { cursor: 0, stack: [], memory: null, storage: 0, gas: 0, halted: false, reverted: false, history: [] }; }
export function toyProgram(revert: boolean): Instruction[] {
  const start: Instruction[] = [{ op: 'PUSH1', value: 2, cost: 1, pc: 0 }, { op: 'PUSH1', value: 3, cost: 1, pc: 2 }, { op: 'ADD', cost: 2, pc: 4 }, { op: 'PUSH1', value: 0, cost: 1, pc: 5 }, { op: 'MSTORE', cost: 3, pc: 7 }, { op: 'PUSH1', value: 5, cost: 1, pc: 8 }, { op: 'PUSH1', value: 0, cost: 1, pc: 10 }, { op: 'SSTORE', cost: 8, pc: 12 }];
  return [...start, ...(revert ? [{ op: 'PUSH1' as const, value: 0, cost: 1, pc: 13 }, { op: 'PUSH1' as const, value: 0, cost: 1, pc: 15 }, { op: 'REVERT' as const, cost: 0, pc: 17 }] : [{ op: 'STOP' as const, cost: 0, pc: 13 }])];
}
export function stepTrace(state: TraceState, revert: boolean): TraceState {
  if (state.halted) return state;
  const instruction = toyProgram(revert)[state.cursor]; if (!instruction) return state;
  const next: TraceState = { ...state, cursor: state.cursor + 1, stack: [...state.stack], gas: state.gas + instruction.cost, history: [...state.history] };
  let detail = '';
  if (instruction.op === 'PUSH1') { next.stack.push(instruction.value!); detail = `Pushed ${instruction.value} onto the stack.`; }
  else if (instruction.op === 'ADD') { const a = next.stack.pop()!; const b = next.stack.pop()!; next.stack.push(a + b); detail = `${a} + ${b} = ${a + b}. Two inputs became one output.`; }
  else if (instruction.op === 'MSTORE') { const offset = next.stack.pop()!; next.memory = next.stack.pop()!; detail = `Stored a 32-byte word with value ${next.memory} at memory byte offset ${offset}.`; }
  else if (instruction.op === 'SSTORE') { const key = next.stack.pop()!; next.storage = next.stack.pop()!; detail = `Tentatively wrote ${next.storage} to storage slot ${key}. The transaction can still revert.`; }
  else if (instruction.op === 'REVERT') { next.halted = true; next.reverted = true; next.storage = 0; next.stack = []; next.memory = null; detail = 'REVERT: storage rolled back to 0; this frame ended. Consumed gas was not restored.'; }
  else { next.halted = true; detail = 'STOP: execution succeeded. Storage value 5 survives; temporary memory is only shown as a trace snapshot.'; }
  next.history.push(detail); return next;
}
export function EvmLab({ onDiscover }: SimulationProps) {
  const [revert, setRevert] = useState(false); const [trace, setTrace] = useState(initialTrace);
  const program = toyProgram(revert);
  function step(all = false) { let next = stepTrace(trace, revert); if (all) while (!next.halted) next = stepTrace(next, revert); setTrace(next); if (next.halted) onDiscover(next.reverted ? 'Reverting rolls back state changes, but execution still consumed gas.' : 'Every node running the same instructions from the same state gets the same result.'); }
  return <div className="eth-lab"><LabCaption label="THE EXECUTION WORKBENCH">Small instructions. Visible state changes. A deterministic result.</LabCaption>
    <div className="eth-trace-toolbar"><span className="mono">PC {trace.halted ? 'HALT' : String(program[trace.cursor].pc).padStart(2, '0')}</span><span className="mono"><Fuel size={14} /> {trace.gas} toy gas consumed</span><label className="eth-checkbox"><input type="checkbox" checked={revert} onChange={e => { setRevert(e.target.checked); setTrace(initialTrace()); }} /> End with REVERT</label></div>
    <div className="eth-evm-grid"><div className="eth-program"><span className="eyebrow">PROGRAM · TOY COSTS</span>{program.map((instruction, index) => <div key={instruction.pc} className={`eth-instruction ${trace.cursor === index && !trace.halted ? 'is-current' : ''} ${index < trace.cursor ? 'is-executed' : ''}`}><span className="eth-pc mono">{String(instruction.pc).padStart(2, '0')}</span><code>{instruction.op}{instruction.value !== undefined ? ` 0x${instruction.value.toString(16).padStart(2, '0')}` : ''}</code><span className="mono">{instruction.cost}g</span>{index < trace.cursor ? <Check size={12} /> : trace.cursor === index && !trace.halted ? <ChevronRight size={13} /> : <span />}</div>)}</div>
    <div className="eth-machine"><section className="eth-stack"><div className="eth-machine-label"><span>STACK</span><small>bottom → top</small></div><div className="eth-stack-cells">{trace.stack.length ? trace.stack.map((value, index) => <span className="mono" key={index}>{value}</span>) : <span className="eth-empty">empty</span>}</div></section><section><div className="eth-machine-label"><span>MEMORY</span><small>{trace.halted ? 'ended frame snapshot' : 'temporary · this call'}</small></div><div className="eth-memory-row mono"><span>0x00</span><strong>{trace.memory === null ? '—' : '0x0000…0005'}</strong></div></section><section><div className="eth-machine-label"><span>STORAGE</span><small>{trace.halted ? trace.reverted ? 'rolled back' : 'committed result' : 'tentative writes'}</small></div><div className={`eth-storage-row ${trace.storage ? 'is-changed' : ''}`}><Database size={21} /><span className="mono">slot[0]</span><strong className="mono" data-testid="storage-value">{trace.storage}</strong></div></section></div></div>
    <div className="eth-actions"><button className="btn btn-primary" onClick={() => step()} disabled={trace.halted}><Play size={14} /> Step instruction</button><button className="btn btn-secondary" onClick={() => step(true)} disabled={trace.halted}>Run to end <ArrowRight size={14} /></button><button className="btn btn-secondary" onClick={() => setTrace(initialTrace())}><RotateCcw size={14} /> Reset trace</button></div><Status warning={trace.reverted}>{trace.history.at(-1) || 'Ready: PUSH1 0x02 will put the first value on the stack. The highlighted row is the next instruction.'}</Status><p className="lab-note">An EVM-like teaching trace, not an EVM implementation. Gas costs are deliberately invented; memory expansion, gas refunds, transaction overhead, 256-bit arithmetic, and nested call frames are omitted. Real MSTORE writes 32 bytes.</p>
  </div>;
}

export type GasInputs = { limit: number; needed: number; base: number; priority: number; max: number; revert: boolean };
export type GasResult = { outcome: 'rejected' | 'out-of-gas' | 'reverted' | 'success'; reason: string; used: number; effective: number; fee: number; burn: number; tip: number; unused: number };
export function calculateGas(input: GasInputs): GasResult {
  const { limit, needed, base, priority, max, revert } = input;
  const reject = (reason: string): GasResult => ({ outcome: 'rejected', reason, used: 0, effective: 0, fee: 0, burn: 0, tip: 0, unused: limit });
  if (![limit, needed, base, priority, max].every(Number.isSafeInteger) || limit < 0 || limit > 1000000 || needed < 21000 || needed > 1000000 || Math.min(base, priority, max) < 0 || Math.max(base, priority, max) > 10000) return reject('Use whole gas units up to 1,000,000 and fee values from 0 to 10,000 gwei. Required gas must be at least 21,000.');
  if (max < priority) return reject('Invalid fee fields: the maximum fee cannot be smaller than the maximum priority fee.');
  if (max < base) return reject('Not eligible for this block: the fee cap is below its base fee. No execution and no gas charged here; a pool may retain it for a cheaper block.');
  if (limit < 21000) return reject('Gas limit is below this model’s 21,000 intrinsic gas. Rejected before execution; no gas charged.');
  const effective = Math.min(max, base + priority); const outOfGas = needed > limit; const used = outOfGas ? limit : needed;
  return { outcome: outOfGas ? 'out-of-gas' : revert ? 'reverted' : 'success', reason: outOfGas ? 'Execution ran out of gas. State changes rolled back, and the whole transaction gas limit was consumed in this top-level model.' : revert ? 'The contract executed REVERT. State changes rolled back; gas already consumed is charged, while unused gas is not.' : 'Execution succeeded. Only consumed gas is charged at the effective price; the maximum fee is a cap.', used, effective, fee: used * effective, burn: used * base, tip: used * (effective - base), unused: limit - used };
}
const defaultGas = { limit: '50000', needed: '30000', base: '20', priority: '2', max: '30' };
export function GasLab({ onDiscover }: SimulationProps) {
  const [fields, setFields] = useState(defaultGas); const [revert, setRevert] = useState(false); const [result, setResult] = useState<GasResult | null>(null); const [error, setError] = useState('');
  function run(nextFields = fields, nextRevert = revert) {
    const parsed = Object.fromEntries(Object.entries(nextFields).map(([key, value]) => [key, integer(value, 0, key === 'limit' || key === 'needed' ? 1000000 : 10000)]));
    if (Object.values(parsed).some(value => value === null)) { setError('Enter non-negative whole numbers. Gas fields allow up to 1,000,000; fee fields allow up to 10,000 gwei.'); setResult(null); return; }
    const next = calculateGas({ ...parsed, revert: nextRevert } as GasInputs); setResult(next); setError(''); onDiscover(next.reason);
  }
  function change(key: keyof typeof defaultGas, value: string) { setFields(old => ({ ...old, [key]: value })); setResult(null); setError(''); }
  function preset(kind: 'cap' | 'oog' | 'revert') { const next = { ...defaultGas, ...(kind === 'cap' ? { max: '15' } : kind === 'oog' ? { limit: '25000' } : {}) }; setFields(next); setRevert(kind === 'revert'); run(next, kind === 'revert'); }
  return <div className="eth-lab"><LabCaption label="THE COST OF EXECUTION">Gas measures work. Gwei prices each unit of that work.</LabCaption>
    <div className="eth-gas-grid"><div className="eth-gas-inputs"><div className="eth-section-label"><Fuel size={15} /> WORK BUDGET · GAS UNITS</div><div className="eth-two-fields"><label className="eth-field">Gas limit<input inputMode="numeric" value={fields.limit} onChange={e => change('limit', e.target.value)} /></label><label className="eth-field">Gas needed / used before revert<input inputMode="numeric" value={fields.needed} onChange={e => change('needed', e.target.value)} /></label></div><div className="eth-section-label">PRICE · GWEI PER GAS</div><div className="eth-three-fields"><label className="eth-field">Block base fee<input inputMode="numeric" value={fields.base} onChange={e => change('base', e.target.value)} /></label><label className="eth-field">Priority fee cap<input inputMode="numeric" value={fields.priority} onChange={e => change('priority', e.target.value)} /></label><label className="eth-field">Maximum fee<input inputMode="numeric" value={fields.max} onChange={e => change('max', e.target.value)} /></label></div><label className="eth-checkbox"><input type="checkbox" checked={revert} onChange={e => { setRevert(e.target.checked); setResult(null); }} /> Contract calls REVERT after the specified work</label></div>
    <div className="eth-fee-receipt"><span className="eyebrow">SIMULATED RECEIPT</span><div className="eth-receipt-price">{result ? (result.fee / 1e9).toFixed(9) : '—'}<small>ETH charged</small></div><div className="eth-account-row"><span>Gas consumed</span><strong className="mono">{result?.used.toLocaleString('en-US') ?? '—'}</strong></div><div className="eth-account-row"><span>Effective price</span><strong className="mono">{result ? `${result.effective} gwei` : '—'}</strong></div><div className="eth-account-row"><span>Base fee burned</span><strong className="mono">{result ? `${result.burn.toLocaleString('en-US')} gwei` : '—'}</strong></div><div className="eth-account-row"><span>Proposer tip</span><strong className="mono">{result ? `${result.tip.toLocaleString('en-US')} gwei` : '—'}</strong></div><div className="eth-account-row"><span>Unused gas</span><strong className="mono">{result?.unused.toLocaleString('en-US') ?? '—'}</strong></div></div></div>
    <div className="eth-formula mono">effective price = min(max fee, base fee + priority fee)<br />transaction fee = gas consumed × effective price</div>
    <div className="eth-actions"><button className="btn btn-primary" onClick={() => run()}><Play size={14} /> Run transaction</button><button className="btn btn-secondary" onClick={() => preset('cap')}>Try low fee cap</button><button className="btn btn-secondary" onClick={() => preset('oog')}>Try out of gas</button><button className="btn btn-secondary" onClick={() => preset('revert')}>Try REVERT</button></div><Status warning={!!error || !!result && result.outcome !== 'success'}>{error || (result ? <><strong className="eth-outcome">{result.outcome.replaceAll('-', ' ').toUpperCase()}</strong> {result.reason}</> : 'Set a budget and a price, then run the local transaction. These values are examples, not current network fees.')}</Status><p className="lab-note">Simplified type-2 fee arithmetic with a 21,000 intrinsic baseline. No refunds, calldata floor, blobs, access lists, nested calls, or balance checks. A top-level out-of-gas failure is different from a caught inner-call failure.</p>
  </div>;
}

type Branch = 'A' | 'B';
type Checkpoint = { epoch: number; branch: Branch | 'root' };
export type ConsensusState = { epoch: number; justified: Checkpoint; finalized: Checkpoint; history: { epoch: number; branch: Branch | null; weight: number; finalized: number }[] };
export const initialConsensus = (): ConsensusState => ({ epoch: 0, justified: { epoch: 0, branch: 'root' }, finalized: { epoch: 0, branch: 'root' }, history: [] });
export function advanceEpoch(state: ConsensusState, votes: { A: number; B: number }): ConsensusState {
  const epoch = state.epoch + 1;
  const eligible = (branch: Branch) => state.finalized.branch === 'root' || state.finalized.branch === branch;
  const branch: Branch | null = eligible('A') && votes.A * 3 >= 200 ? 'A' : eligible('B') && votes.B * 3 >= 200 ? 'B' : null;
  const weight = branch ? votes[branch] : Math.max(votes.A, votes.B);
  if (!branch) return { ...state, epoch, history: [...state.history, { epoch, branch, weight, finalized: state.finalized.epoch }] };
  const consecutive = state.justified.epoch === epoch - 1 && (state.justified.branch === 'root' || state.justified.branch === branch);
  const finalized = consecutive ? state.justified : state.finalized;
  return { epoch, justified: { epoch, branch }, finalized, history: [...state.history, { epoch, branch, weight, finalized: finalized.epoch }] };
}
const validatorWeights = [40, 30, 20, 10];
export function ConsensusLab({ onDiscover }: SimulationProps) {
  const [validators, setValidators] = useState(validatorWeights.map((weight, index) => ({ weight, online: true, branch: (index < 2 ? 'A' : 'B') as Branch })));
  const [state, setState] = useState(initialConsensus);
  const [slot, setSlot] = useState(0);
  const [proposal, setProposal] = useState('Advance a slot to select a toy proposer and attempt a block proposal.');
  const votes = validators.reduce((sum, validator) => { if (validator.online) sum[validator.branch] += validator.weight; return sum; }, { A: 0, B: 0 });
  const participating = votes.A + votes.B;
  const eligible = (branch: Branch) => state.finalized.branch === 'root' || state.finalized.branch === branch;
  const a = eligible('A') ? votes.A : 0; const b = eligible('B') ? votes.B : 0;
  const head = a + b === 0 ? 'none' : a >= b ? 'A' : 'B';
  function advance() { const next = advanceEpoch(state, votes); setState(next); setSlot(0); setProposal('New epoch. Advance a slot to attempt another block proposal.'); onDiscover(next.finalized.epoch > state.finalized.epoch ? `Checkpoint ${next.finalized.branch}${next.finalized.epoch} finalized after a later consecutive checkpoint link. Head selection and finality are different.` : next.justified.epoch === next.epoch ? `Checkpoint ${next.justified.branch}${next.justified.epoch} justified. The current head is not instantly final.` : 'Finality stalled: votes do not form the required link with at least two-thirds of total registered stake.'); }
  function advanceSlot() {
    if (slot >= 31) return;
    const index = slot % validators.length; const proposer = validators[index]; const next = slot + 1; setSlot(next);
    const text = !proposer.online ? `Slot ${state.epoch * 32 + next}: validator ${index + 1} is offline. This slot has no proposed block.` : !eligible(proposer.branch) ? `Slot ${state.epoch * 32 + next}: validator ${index + 1} proposed on branch ${proposer.branch}, which conflicts with finality and is ignored.` : `Slot ${state.epoch * 32 + next}: validator ${index + 1} proposed a toy block on branch ${proposer.branch}. A proposal is not an attestation or finality.`;
    setProposal(text); onDiscover(text);
  }
  return <div className="eth-lab"><LabCaption label="PROOF OF STAKE · SIMPLIFIED MODEL">A vote has weight. A head is not yet a finalized checkpoint.</LabCaption>
    <div className="eth-consensus-summary"><div><span>TOY HEAD</span><strong>{head === 'none' ? 'No new head' : `Branch ${head}`}</strong></div><div><span>PARTICIPATING STAKE</span><strong>{participating}<small> / 100</small></strong></div><div><span>EPOCH</span><strong className="mono">{state.epoch.toString().padStart(2, '0')}</strong></div></div>
    <div className="eth-slot-panel"><div className="eth-slot-top"><span className="eyebrow">SLOT {state.epoch * 32 + slot} · {slot + 1} / 32 IN EPOCH</span><button className="btn btn-secondary" onClick={advanceSlot} disabled={slot >= 31}>Advance one slot <ChevronRight size={12} /></button></div><div className="eth-slot-ticks" aria-hidden="true">{Array.from({ length: 32 }, (_, index) => <i key={index} className={index <= slot ? 'is-past' : ''} />)}</div><p role="status">{proposal}</p></div>
    <div className="eth-branches">{(['A', 'B'] as Branch[]).map(branch => <div key={branch} className={`eth-branch ${head === branch ? 'is-head' : ''} ${!eligible(branch) ? 'is-excluded' : ''}`}><div><GitBranch size={18} /><strong>Branch {branch}</strong><span>{!eligible(branch) ? 'conflicts with finality' : head === branch ? 'current toy head' : 'competing branch'}</span></div><div className="eth-weight-track"><span style={{ width: `${votes[branch]}%` }} /><i title="Two-thirds of total registered stake" /></div><small>{votes[branch]} / 100 stake weight · {eligible(branch) ? `${Math.max(0, 67 - votes[branch])} more to reach ≥ ⅔` : 'ineligible'}</small></div>)}</div>
    <div className="eth-validator-list">{validators.map((validator, index) => <div key={index} className={`eth-validator ${!validator.online ? 'is-offline' : ''}`}><span className="eth-validator-avatar"><ShieldCheck size={16} /></span><div><strong>Validator {index + 1}</strong><small>{validator.weight}% stake weight</small></div><div className="eth-vote-toggle" aria-label={`Validator ${index + 1} branch`}>{(['A', 'B'] as Branch[]).map(branch => <button key={branch} aria-label={`Validator ${index + 1} vote ${branch}`} aria-pressed={validator.branch === branch} disabled={!validator.online || !eligible(branch)} onClick={() => setValidators(old => old.map((item, i) => i === index ? { ...item, branch } : item))}>{branch}</button>)}</div><button className={`eth-connect-toggle ${validator.online ? 'is-online' : ''}`} aria-label={`${validator.online ? 'Disconnect' : 'Connect'} validator ${index + 1}`} onClick={() => { setValidators(old => old.map((item, i) => i === index ? { ...item, online: !item.online } : item)); onDiscover('Offline validators stop contributing new votes in this toy round, but their registered stake stays in the finality threshold.'); }}><i />{validator.online ? 'Online' : 'Offline'}</button></div>)}</div>
    <div className="eth-checkpoints"><div><span className="eyebrow">JUSTIFIED CHECKPOINT</span><strong className="mono" data-testid="justified-checkpoint">{state.justified.branch === 'root' ? 'Genesis' : `${state.justified.branch}${state.justified.epoch}`}</strong></div><ArrowRight size={20} /><div><span className="eyebrow">FINALIZED CHECKPOINT</span><strong className="mono" data-testid="finalized-checkpoint">{state.finalized.branch === 'root' ? 'Genesis' : `${state.finalized.branch}${state.finalized.epoch}`}</strong></div></div>
    {state.history.length > 0 && <div className="eth-epoch-history" aria-label="Epoch history">{state.history.slice(-6).map(item => <div key={item.epoch}><span className="mono">E{item.epoch}</span><strong>{item.branch ? `${item.branch}${item.epoch}` : 'No link'}</strong><small>{item.branch ? 'justified' : 'stalled'}</small></div>)}</div>}
    <div className="eth-actions"><button className="btn btn-primary" onClick={advance}>Advance one epoch <ArrowRight size={14} /></button><button className="btn btn-secondary" onClick={() => { setState(initialConsensus()); setSlot(0); setProposal('Advance a slot to select a toy proposer and attempt a block proposal.'); setValidators(validatorWeights.map((weight, index) => ({ weight, online: true, branch: index < 2 ? 'A' : 'B' }))); }}><RotateCcw size={14} /> Reset consensus</button></div>
    <Status warning={Math.max(a, b) * 3 < 200}>{state.epoch === 0 ? 'Change votes to move the toy head. Advance epochs separately: one qualifying checkpoint is justified; a later consecutive link can finalize it.' : state.justified.epoch < state.epoch ? 'This epoch did not justify a checkpoint. More than one-third offline or split stake can stall finality even while blocks continue.' : `Checkpoint ${state.justified.branch}${state.justified.epoch} is justified. ${state.finalized.branch === 'root' ? 'Genesis remains finalized.' : `${state.finalized.branch}${state.finalized.epoch} and its ancestors are finalized.`}`}</Status>
    <p className="lab-note">Teaching model, not LMD-GHOST or Casper FFG implementation. Epochs contain 32 slots; the epoch button skips to the next checkpoint. Proposers rotate here for teaching; real selection is pseudorandom and stake-weighted. We model only consecutive-epoch finality. Real fork choice retains latest messages and uses ancestry and other rules; this toy counts online votes each round and breaks head ties toward A. Offline stake remains in the denominator. No slashing, inactivity leak, timing, proposer boost, or delays are simulated.</p>
  </div>;
}
