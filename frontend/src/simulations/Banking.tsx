import { useReducer, useState } from 'react';
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Check, CircleCheck, Database, Globe2, LockKeyhole, Server, ShieldCheck, Terminal, TriangleAlert, Wallet } from 'lucide-react';
import type { SimulationProps } from '../content/types';
import { bankReducer, initialBankState } from './bankingModel';

const format = (n: number) => `₹${n.toLocaleString('en-IN')}`;
export function Banking({ onDiscover }: SimulationProps) {
  const [state, dispatch] = useReducer(bankReducer, initialBankState);
  const [view, setView] = useState<'website' | 'backend' | 'database'>('website');
  const [amount, setAmount] = useState('500');
  const transfer = () => {
    const value = Number(amount);
    dispatch({ type: 'transfer', amount: value });
    if (Number.isInteger(value) && value > 0 && value <= state.balance) onDiscover('A transfer changed the database. The website now shows its updated record.');
  };
  return <div className="bank-simulation">
    <div className="simulation-toolbar"><div className="view-tabs" aria-label="System view">{[
      { id: 'website', label: 'Website', icon: Globe2 }, { id: 'backend', label: 'Backend', icon: Server }, { id: 'database', label: 'Database', icon: Database },
    ].map(({ id, label, icon: Icon }) => <button key={id} aria-pressed={view === id} className={view === id ? 'selected' : ''} onClick={() => setView(id as typeof view)}><Icon size={14} />{label}</button>)}</div><span className="live-label"><i />Local simulation</span></div>
    <div className="bank-canvas">
      <div className="flow-diagram" aria-label="Website requests pass through the backend to the database">
        {[{ id: 'website', icon: Globe2, title: 'Your browser', detail: 'React frontend' }, { id: 'backend', icon: Server, title: 'App server', detail: 'Node.js backend' }, { id: 'database', icon: Database, title: 'Database', detail: 'Source of truth' }].map(({ id, icon: Icon, title, detail }, i) => <div className="flow-part" key={id}>
          {i > 0 && <div className="flow-connector"><span /><ArrowRight size={13} /></div>}
          <button className={`flow-node ${view === id ? 'is-active' : ''}`} onClick={() => setView(id as typeof view)} aria-label={`Inspect ${title}`}><span className="flow-icon"><Icon size={21} /></span><strong>{title}</strong><small>{detail}</small></button>
        </div>)}
      </div>
      {view === 'website' ? <div className="bank-app">
        <div className="bank-app-bar"><div><span className="bank-logo"><Wallet size={16} /></span><strong>pocket<span>pay</span></strong></div><span className="toy-pill">DEMO APP</span><span className="avatar">A</span></div>
        <div className="bank-app-body"><div className="bank-greeting">Hey Alice <span>↗</span></div><div className="balance-label">Your available balance</div><div className={`bank-balance ${state.tampered ? 'tampered' : ''}`} data-testid="bank-balance">{format(state.balance)}<span>.00</span></div>
          <div className="transfer-box"><div className="friend-avatar">B</div><div><strong>Send to Bob</strong><small>Your friend</small></div><label className="amount-input"><span>₹</span><input aria-label="Transfer amount in rupees" type="number" min="1" step="1" value={amount} onChange={e => setAmount(e.target.value)} /></label></div>
          <button className="transfer-button" onClick={transfer} disabled={!amount || Number(amount) <= 0}>Send {amount && Number(amount) > 0 ? format(Number(amount)) : 'money'}<ArrowUpRight size={17} /></button>
          <div className="bank-smallprint"><LockKeyhole size={11} />A pretend payment. No real money.</div>
        </div>
        <div className="bank-app-footer"><span><ArrowDownLeft size={13} />Bob’s balance</span><strong>{format(state.friendBalance)}</strong></div>
      </div> : view === 'backend' ? <div className="code-panel bank-inspector"><div className="code-title"><Terminal size={15} /><span>server / transfer.ts</span><span className="toy-pill">PSEUDOCODE</span></div><pre><span className="code-comment">{'// The server checks the request.'}</span>{'\n'}<span className="code-purple">{'if'}</span>{' (amount <= alice.balance) {\n  db.transaction(() => {\n    alice.balance -= amount;\n    bob.balance += amount;\n  });\n}\n\n'}<span className="code-comment">{'// Return the stored balance.'}</span>{'\nresponse.json({ balance: '}<span className="code-green">{state.balance}</span>{' });'}</pre><div className="backend-state"><Check size={15} />{state.transfers} accepted transfers · current balance {format(state.balance)}</div><p className="lab-note">A real transfer also needs authentication, authorization, concurrency controls, and a durable audit trail.</p></div> : <div className="database-panel bank-inspector"><div className="code-title"><Database size={16} /><span>payments / accounts</span><span className="toy-pill">TOY DATA</span></div><table><caption className="sr-only">Stored account balances</caption><thead><tr><th>account</th><th>balance</th><th>currency</th></tr></thead><tbody><tr className={state.tampered ? 'changed-record' : ''}><td><span className="table-dot" />Alice</td><td data-testid="database-balance">{state.balance.toLocaleString('en-IN')}</td><td>INR</td></tr><tr><td><span className="table-dot muted" />Bob</td><td>{state.friendBalance.toLocaleString('en-IN')}</td><td>INR</td></tr></tbody></table><div className="tamper-box"><div><TriangleAlert size={17} /><strong>What if this record changes?</strong></div><p>Simulate a change that bypasses the app’s transfer rules.</p><button className="btn btn-warning" disabled={state.tampered} onClick={() => { dispatch({ type: 'tamper' }); onDiscover('Even an unauthorized stored value appears in the app. One authority controls this source of truth.'); }}> {state.tampered ? 'Record changed to ₹5,000' : 'Simulate an unauthorized database change'}<ArrowUpRight size={14} /></button></div></div>}
      <div className="under-stage-note"><ShieldCheck size={14} /><span>One organization operates this whole system.</span></div>
    </div>
    <div className={`simulation-feedback ${state.tampered ? 'warning' : ''}`} role="status"><CircleCheck size={16} /><span>{state.message}</span></div>
  </div>;
}
