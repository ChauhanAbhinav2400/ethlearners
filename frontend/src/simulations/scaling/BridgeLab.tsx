import { useState } from 'react';
import { ArrowLeftRight, ArrowRight, Flame, LockKeyhole, ShieldCheck, UnlockKeyhole } from 'lucide-react';
import type { SimulationProps } from '../../content/types';

type BridgeStage = 'ready' | 'locked' | 'source-final' | 'minted' | 'burned' | 'return-final' | 'complete';
export function BridgeLab({ onDiscover }: SimulationProps) {
  const [stage, setStage] = useState<BridgeStage>('ready');
  const [amountText, setAmountText] = useState('10');
  const [amount, setAmount] = useState(0);
  const [tampered, setTampered] = useState(false);
  const [message, setMessage] = useState('Alice has 100 demo tokens on the source chain. Lock 10 and inspect what exists on each side.');
  const locked = stage !== 'ready' && stage !== 'complete';
  const source = locked ? 100 - amount : 100;
  const vault = locked ? amount : 0;
  const wrapped = stage === 'minted' ? amount : 0;
  const depositUsed = ['minted', 'burned', 'return-final', 'complete'].includes(stage);
  function report(text: string) { setMessage(text); onDiscover(text); }
  function lock() {
    const value = Number(amountText);
    if (!Number.isInteger(value) || value < 1 || value > 100) return report('Lock rejected. Choose a whole number from 1 to 100; no account balances changed.');
    setAmount(value); setStage('locked'); report('The source vault now holds the tokens. The destination balance is still zero: locking is not minting, and the source record is not final yet.');
  }
  function relay() {
    if (depositUsed) return report('Replay rejected: deposit message 01 was already consumed. The destination cannot mint twice for one lock.');
    if (stage !== 'source-final') return report('Relay rejected: this model requires finalized source evidence before minting. Waiting is part of the bridge protocol.');
    if (tampered) return report('Relay rejected: the message claims a different amount from the source evidence. Transporting a message does not make it valid.');
    setStage('minted'); report('The destination validated the source message and minted a representation. The originals remain locked; these are two records tied together by bridge rules.');
  }
  function unlock() {
    if (stage !== 'return-final') return report('Unlock rejected: the return message has not met this model’s settlement and finality requirements. The originals stay locked.');
    if (tampered) return report('Unlock rejected: the return message does not match the verified burn. The vault balance is unchanged.');
    setStage('complete'); report('The verified burn released the originals. Alice is back to 100 source tokens, with zero wrapped tokens and an empty vault.');
  }
  return <div className="scale-lab">
    <div className="scale-heading"><span className="eyebrow">TWO CHAINS. TWO SEPARATE RECORDS.</span><span className="scale-chip">LOCK / MINT MODEL</span></div>
    <div className="scale-bridge-worlds">
      <section className="scale-chain"><span className="eyebrow">SOURCE CHAIN</span><h3>Alice’s originals</h3><div className="scale-big-balance" data-testid="bridge-source">{source}<small>demo tokens</small></div><div className="scale-vault"><LockKeyhole size={19} /><span>Bridge vault</span><strong data-testid="bridge-vault">{vault}</strong></div><p>{stage === 'locked' ? 'Lock included · not final' : ['source-final', 'minted', 'burned', 'return-final'].includes(stage) ? 'Source lock finalized in model' : stage === 'complete' ? 'Originals unlocked' : 'Tokens freely held by Alice'}</p></section>
      <div className="scale-bridge-crossing" aria-hidden="true"><span /><ArrowLeftRight size={27} /><span /></div>
      <section className="scale-chain destination"><span className="eyebrow">DESTINATION CHAIN</span><h3>Alice’s representation</h3><div className="scale-big-balance" data-testid="bridge-wrapped">{wrapped}<small>wrapped demo tokens</small></div><div className="scale-vault"><ShieldCheck size={19} /><span>Deposit message 01</span><strong>{depositUsed ? 'used' : 'unused'}</strong></div><p>{stage === 'minted' ? 'Mint included here · not a finality claim' : ['burned', 'return-final', 'complete'].includes(stage) ? 'Wrapped tokens burned for return' : 'No mint has executed'}</p></section>
    </div>
    <div className="scale-message"><span className="eyebrow">CROSS-CHAIN MESSAGE</span><code>{stage === 'ready' ? 'No message yet' : `${['burned', 'return-final', 'complete'].includes(stage) ? 'BURN / return-01' : 'LOCK / deposit-01'}  •  amount: ${amount + (tampered ? 10 : 0)}  •  recipient: Alice`}</code><span>Evidence amount: {amount} · source and destination are bound to the message</span></div>
    <label className="scale-field-label">Amount to bridge<input aria-label="Amount to bridge" className="field" type="number" min={1} max={100} step={1} value={amountText} disabled={stage !== 'ready'} onChange={event => setAmountText(event.target.value)} /></label>
    <label className="scale-check"><input type="checkbox" checked={tampered} onChange={event => setTampered(event.target.checked)} />Tamper with the relayed amount</label>
    <div className="scale-actions">
      {stage === 'ready' && <button className="btn btn-primary" onClick={lock}>Lock source tokens <LockKeyhole size={16} /></button>}
      {stage === 'locked' && <button className="btn btn-primary" onClick={() => { setStage('source-final'); report('The source lock meets the model’s finality requirement. A relayer must still deliver evidence and the destination must validate it.'); }}>Advance source finality</button>}
      {['locked', 'source-final'].includes(stage) && <button className="btn btn-secondary" onClick={relay}>Validate & relay mint <ArrowRight size={16} /></button>}
      {stage === 'minted' && <button className="btn btn-primary" onClick={() => { setStage('burned'); report('Wrapped tokens were burned. The originals are still locked until the return evidence meets the source bridge’s acceptance rules.'); }}>Burn wrapped tokens <Flame size={16} /></button>}
      {stage === 'burned' && <button className="btn btn-primary" onClick={() => { setStage('return-final'); report('The return has met the model’s settlement and finality conditions. Validate the burn evidence before releasing the originals.'); }}>Advance return settlement</button>}
      {['burned', 'return-final'].includes(stage) && <button className="btn btn-secondary" onClick={unlock}>Validate & unlock <UnlockKeyhole size={16} /></button>}
      {depositUsed && <button className="btn btn-secondary" onClick={relay}>Replay deposit message</button>}
    </div>
    <p className="status-line" role="status">{message}</p>
    <p className="lab-note">A local lock/mint and burn/unlock model, not a bridge service. The buttons compress waiting and evidence checks; they do not implement proofs or finality. Real bridges can use different mechanisms and have contract, validator, custody, upgrade, and chain risks. A wrapped balance is not an extra original asset.</p>
  </div>;
}
