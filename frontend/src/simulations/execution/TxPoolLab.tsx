import { useState } from 'react';
import { ArrowRight, Layers, Network, Radio, Send } from 'lucide-react';
import type { SimulationProps } from '../../content/types';
import { checkAdmission, initialAccounts, poolBaseFee, poolLabel, selectBlock, whole } from './models';
import type { PoolTx, Sender } from './models';
import { ExecHeader, ExecStatus } from './shared';

const examples = [
  { name: 'Alice · nonce 0', sender: 'Alice', nonce: '0', value: '100000', maxFee: '30', tip: '2', signed: true },
  { name: 'Alice · nonce 2', sender: 'Alice', nonce: '2', value: '100000', maxFee: '30', tip: '3', signed: true },
  { name: 'Alice · nonce 1', sender: 'Alice', nonce: '1', value: '120000', maxFee: '30', tip: '2', signed: true },
  { name: 'Bob · higher tip', sender: 'Bob', nonce: '0', value: '50000', maxFee: '35', tip: '6', signed: true },
  { name: 'Invalid signature', sender: 'Alice', nonce: '0', value: '100000', maxFee: '30', tip: '2', signed: false },
  { name: 'Not enough funds', sender: 'Carol', nonce: '0', value: '500000', maxFee: '30', tip: '2', signed: true },
  { name: 'Fee below base', sender: 'Bob', nonce: '0', value: '50000', maxFee: '15', tip: '2', signed: true },
];
export function TxPoolLab({ onDiscover }: SimulationProps) {
  const [form, setForm] = useState(examples[0]); const [accounts, setAccounts] = useState(initialAccounts);
  const [pools, setPools] = useState<{ A: PoolTx[]; B: PoolTx[] }>({ A: [], B: [] });
  const [node, setNode] = useState<'A' | 'B'>('A'); const [connected, setConnected] = useState(true); const [strict, setStrict] = useState(true);
  const [nextId, setNextId] = useState(1); const [block, setBlock] = useState<PoolTx[]>([]);
  const [status, setStatus] = useState('Try sending Alice’s nonce 2 first. This node can hold it while it waits for earlier requests.'); const [warning, setWarning] = useState(false);
  function report(text: string, warn = false) { setStatus(text); setWarning(warn); onDiscover(text); }
  function submit() {
    if (node === 'B' && !connected) { report('Node B is offline. Nothing was delivered to its local pool.', true); return; }
    const nonce = whole(form.nonce, 0, 999); const value = whole(form.value); const maxFee = whole(form.maxFee, 0, 1000); const tip = whole(form.tip, 0, 1000);
    if (nonce === null || value === null || maxFee === null || tip === null) { report('Enter whole numbers: nonce 0–999, amount 0–10,000,000 gwei, and fees 0–1,000 gwei.', true); return; }
    const tx: PoolTx = { id: `tx-${nextId}`, sender: form.sender as Sender, nonce, value, maxFee, tip, signed: form.signed };
    const error = checkAdmission(tx, accounts, pools[node], node === 'B' && strict ? 4 : 0);
    if (error) { report(`Node ${node} did not accept it. ${error}`, true); return; }
    setNextId(nextId + 1); setPools(old => ({ ...old, [node]: [...old[node], tx] })); report(`Node ${node} accepted ${tx.id}. ${poolLabel(tx, accounts)}. The chain’s balances and nonces have not changed.`);
  }
  function propagate() {
    if (!connected) { report('The connection to Node B is down. Node A still has its own transactions.', true); return; }
    const copy = [...pools.B]; let accepted = 0; let skipped = 0;
    for (const tx of pools.A) { if (checkAdmission(tx, accounts, copy, strict ? 4 : 0)) skipped++; else { copy.push({ ...tx }); accepted++; } }
    setPools(old => ({ ...old, B: copy })); report(`Node A shared its pool with B. B accepted ${accepted} request${accepted === 1 ? '' : 's'} and skipped ${skipped} under its own checks and policy. Sharing is not automatic acceptance.`, skipped > 0);
  }
  function build() {
    if (node === 'B' && !connected) { report('Node B is offline. Reconnect it before asking it to build a payload.', true); return; }
    const result = selectBlock(pools[node], accounts); setBlock(result.selected);
    if (!result.selected.length) { report('No request is ready for this block. Check the next nonce, available balance, and current base fee.', true); return; }
    setAccounts(result.accounts); setPools(old => ({ A: old.A.filter(tx => tx.nonce >= result.accounts[tx.sender].nonce), B: connected ? old.B.filter(tx => tx.nonce >= result.accounts[tx.sender].nonce) : old.B }));
    report(`Included ${result.selected.map(tx => `${tx.sender} #${tx.nonce}`).join(', ')}. This builder favored higher effective tips while preserving each sender’s nonce order. The transfer amounts went to a toy recipient; ${result.fees.toLocaleString('en-US')} gwei paid for gas.`);
  }
  return <div className="exec-lab"><ExecHeader eyebrow="THE WAITING ROOM">A transaction can be valid and still wait its turn.</ExecHeader>
    <div className="exec-presets" aria-label="Transaction examples">{examples.map(example => <button key={example.name} onClick={() => setForm(example)} aria-pressed={form === example}>{example.name}</button>)}</div>
    <div className="exec-grid"><section className="exec-card"><div className="exec-card-title"><Send size={17} /><h3>Compose a request</h3></div><div className="exec-fields"><label className="field">Sender<select value={form.sender} onChange={e => setForm(old => ({ ...old, sender: e.target.value }))}>{(['Alice', 'Bob', 'Carol'] as Sender[]).map(sender => <option key={sender}>{sender}</option>)}</select></label><label className="field">Nonce · request number<input inputMode="numeric" value={form.nonce} onChange={e => setForm(old => ({ ...old, nonce: e.target.value }))} /></label><label className="field">Transfer amount · gwei<input inputMode="numeric" value={form.value} onChange={e => setForm(old => ({ ...old, value: e.target.value }))} /></label><label className="field">Maximum fee · gwei / gas<input inputMode="numeric" value={form.maxFee} onChange={e => setForm(old => ({ ...old, maxFee: e.target.value }))} /></label><label className="field">Tip cap · gwei / gas<input inputMode="numeric" value={form.tip} onChange={e => setForm(old => ({ ...old, tip: e.target.value }))} /></label><label className="field">Deliver to<select value={node} onChange={e => setNode(e.target.value as 'A' | 'B')}><option value="A">Node A · accepts any tip</option><option value="B">Node B · its own policy</option></select></label></div><label className="exec-check"><input type="checkbox" checked={form.signed} onChange={e => setForm(old => ({ ...old, signed: e.target.checked }))} /> Signature matches the request</label><button className="btn btn-primary" onClick={submit}>Send to Node {node} <ArrowRight size={14} /></button></section>
    <section className="exec-card"><div className="exec-card-title"><Layers size={17} /><h3>Current chain state</h3></div><p className="exec-small">Each transfer uses 21,000 gas. This block’s base fee is {poolBaseFee} gwei per gas.</p>{Object.entries(accounts).map(([sender, account]) => <div className="exec-account" key={sender}><strong>{sender}</strong><span><b className="mono">{account.balance.toLocaleString('en-US')}</b> gwei<small>next nonce {account.nonce}</small></span></div>)}<p className="exec-small">1 gwei = one billionth of an ETH. Amounts and balances here are simulated.</p></section></div>
    <div className="exec-network-bar"><Network size={17} /><span>A <span className={connected ? 'exec-mint' : ''}>{connected ? '⟷' : '×'}</span> B</span><button className="btn btn-secondary" onClick={() => { setConnected(!connected); if (!connected) setPools(old => ({ ...old, B: old.B.filter(tx => tx.nonce >= accounts[tx.sender].nonce) })); report(connected ? 'B is disconnected. Its pool can differ from A’s.' : 'B reconnected and refreshed its view of used nonces. Pool entries still need to be shared.'); }}>{connected ? 'Disconnect B' : 'Reconnect B'}</button><label className="exec-check"><input type="checkbox" checked={strict} onChange={e => setStrict(e.target.checked)} /> B requires a 4 gwei tip for new arrivals</label></div>
    <div className="exec-grid">{(['A', 'B'] as const).map(name => <section className="exec-card exec-pool" key={name}><div className="exec-card-title"><Radio size={17} /><h3>Node {name}’s pool</h3><span className="exec-tag">{pools[name].length} HELD</span></div>{pools[name].length ? pools[name].map(tx => <div className="exec-pool-row" key={tx.id}><span className="mono">{tx.id}</span><strong>{tx.sender} · nonce {tx.nonce}</strong><small>{poolLabel(tx, accounts)}</small><span>{tx.tip} gwei tip cap</span></div>) : <p className="exec-empty">No requests received yet.</p>}</section>)}</div>
    <div className="exec-actions"><button className="btn btn-secondary" onClick={propagate}>Share A’s requests with B <ArrowRight size={14} /></button><button className="btn btn-primary" onClick={build}><Layers size={14} /> Select & include from {node}</button></div>
    {block.length > 0 && <div className="exec-payload"><span className="eyebrow">LAST TOY EXECUTION PAYLOAD · 2 TRANSFERS MAX</span><div>{block.map((tx, index) => <span key={tx.id}>{index + 1}. {tx.sender} #{tx.nonce}</span>)}</div></div>}
    <ExecStatus warning={warning}>{status}</ExecStatus><p className="lab-note">Local teaching model. Signatures are a switch, not cryptography. A future nonce waits here; real pools have richer affordability, eviction, replacement, and fee policies. These policies are not consensus rules. We apply one selected payload directly to the shared chain state and omit consensus, private order flow, and reorgs. The next block can contain at most two transfers.</p>
  </div>;
}
