import { useState } from 'react';
import { ArrowRight, Check, FileText, Fuel, RotateCcw } from 'lucide-react';
import type { SimulationProps } from '../../content/types';
import { encodeUint, executeIncluded, initialReceiptState, syntheticHash, toHex, whole } from './models';
import type { ReceiptOutcome } from './models';
import { ExecCode, ExecHeader, ExecStatus } from './shared';

export function ReceiptsLab({ onDiscover }: SimulationProps) {
  const [state, setState] = useState(initialReceiptState); const [amount, setAmount] = useState('3'); const [limit, setLimit] = useState('50000'); const [revert, setRevert] = useState(false); const [result, setResult] = useState<ReceiptOutcome | null>(null);
  const [message, setMessage] = useState('Add 3 to the counter, then compare a successful transaction with a revert.');
  function run(nextLimit = limit, nextRevert = revert) {
    const increment = whole(amount, 1, 100); const gasLimit = whole(nextLimit, 21000, 100000);
    if (increment === null || gasLimit === null) { setMessage('Use a whole increment from 1 to 100 and a gas limit from 21,000 to 100,000. Nothing was included.'); return; }
    const next = executeIncluded(state, increment, gasLimit, nextRevert);
    if (typeof next === 'string') { setMessage(next); return; }
    setResult(next); setState(next.after);
    const text = next.reason === 'success' ? 'Included and successful: the new counter value and its event log survive. The sender also pays gas and uses a nonce.' : next.reason === 'revert' ? 'Included but reverted: the counter and event log rolled back. The sender still used a nonce and paid for the work already done.' : 'Included but out of gas: the counter and event log rolled back. This top-level failure consumes the whole gas limit, and the sender nonce still advances.';
    setMessage(text); onDiscover(text);
  }
  function preset(kind: 'success' | 'revert' | 'oog') { const nextLimit = kind === 'oog' ? '30000' : '50000'; setLimit(nextLimit); setRevert(kind === 'revert'); run(nextLimit, kind === 'revert'); }
  const receipt = result ? { transactionHash: syntheticHash(result.after.block), blockNumber: toHex(result.after.block), status: result.status, gasUsed: toHex(result.used), effectiveGasPrice: toHex(22e9), logs: result.logs.map(log => ({ address: '0x000000000000000000000000000000000000c001', data: encodeUint(log.value), logIndex: '0x0' })) } : null;
  return <div className="exec-lab"><ExecHeader eyebrow="WHAT SURVIVES EXECUTION?">A failed transaction can still be included in a block.</ExecHeader>
    <div className="exec-fields exec-receipt-controls"><label className="field">Add to the counter<input inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} /></label><label className="field">Gas limit<input inputMode="numeric" value={limit} onChange={e => setLimit(e.target.value)} /></label><label className="exec-check"><input type="checkbox" checked={revert} onChange={e => setRevert(e.target.checked)} /> Revert after a tentative write and log</label></div>
    <div className="exec-state-flow"><div className="exec-state-box"><span className="eyebrow">BEFORE LAST INCLUDED ATTEMPT</span><strong>{result?.before.count ?? state.count}</strong><small>stored counter value</small></div><ArrowRight size={22} /><div className="exec-state-box exec-draft"><span className="eyebrow">INSIDE THE CALL</span><strong>{result?.draft ?? '—'}</strong><small>{result?.draft === null ? 'ran out of gas before the write' : 'tentative write · may roll back'}</small></div><ArrowRight size={22} /><div className={`exec-state-box ${result?.status === '0x1' ? 'exec-success' : ''}`}><span className="eyebrow">CURRENT CHAIN STATE</span><strong data-testid="receipt-counter">{state.count}</strong><small>value that actually survived</small></div></div>
    <div className="exec-metrics"><div><span>Sender nonce</span><strong className="mono" data-testid="receipt-nonce">{state.nonce}</strong><small>{result ? `${result.before.nonce} → ${result.after.nonce}` : 'next request number'}</small></div><div><span><Fuel size={13} /> Gas charged</span><strong className="mono">{result?.used.toLocaleString('en-US') ?? '—'}</strong><small>{result ? `${result.fee.toLocaleString('en-US')} gwei at 22 / gas` : 'invented execution workload'}</small></div><div><span>Surviving logs</span><strong className="mono">{result?.logs.length ?? '—'}</strong><small>{result?.logs.length ? `Changed(${result.logs[0].value})` : 'no durable event'}</small></div></div>
    <div className="exec-actions"><button className="btn btn-primary" onClick={() => run()}><FileText size={15} /> Execute & include</button><button className="btn btn-secondary" onClick={() => preset('success')}><Check size={14} /> Try success</button><button className="btn btn-secondary" onClick={() => preset('revert')}><RotateCcw size={14} /> Try revert</button><button className="btn btn-secondary" onClick={() => preset('oog')}>Try out of gas</button></div>
    <ExecStatus warning={!!result && result.status === '0x0'}>{message}</ExecStatus>
    {receipt && <details className="exec-details"><summary>Inspect the receipt fields</summary><ExecCode label="JSON-RPC RECEIPT EXCERPT · SYNTHETIC HASH" value={receipt} /><p className="exec-small">status 0x1 means execution succeeded; 0x0 means it failed. The receipt alone does not explain why. gasUsed is gas units; effectiveGasPrice is wei per gas. Event topics and other metadata are omitted from this excerpt.</p></details>}
    <p className="lab-note">The gas workloads are invented: the tentative write is reached at 26,000; success uses 42,000; REVERT uses 28,000. A lower limit causes top-level out of gas. No nested calls, gas refunds, finality, or reorgs. Only a transaction that passes the initial checks is included. Its nonce and fee remain even when its contract writes and logs are discarded. Sender balance: {state.balance.toLocaleString('en-US')} simulated gwei.</p>
  </div>;
}
