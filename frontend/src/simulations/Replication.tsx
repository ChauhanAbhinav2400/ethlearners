import { useState } from 'react';
import { ArrowRight, Check, Copy, Network, Server, ShieldAlert, Unplug } from 'lucide-react';
import type { SimulationProps } from '../content/types';

export function Replication({ onDiscover }: SimulationProps) {
  const [balances, setBalances] = useState([1000, 1000, 1000, 1000, 1000]);
  const [offline, setOffline] = useState(false);
  const [changed, setChanged] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState('Five computers. Five copies of Alice’s balance.');
  const agreement = balances.every(n => n === balances[0]);
  const tamper = () => { setBalances(v => v.map((b, i) => i === 1 ? 5000 : b)); setChanged(true); setCopied(false); setMessage('Node 2 now stores ₹5,000. The other copies have not changed. The network disagrees.'); onDiscover('Replication gives you copies. It does not decide which update is valid.'); };
  const copy = () => { setBalances(v => v.map((b,i) => i === 4 && offline ? b : 5000)); setCopied(true); setMessage(offline ? 'Four copies match. Node 5 is offline and still has ₹1,000.' : 'All five copies match at ₹5,000. But nobody proved that this change was authorized.'); onDiscover('Matching records do not prove a legitimate update. We need shared validation rules.'); };
  return <div className="replication-simulation"><div className="simulation-toolbar"><span className="stage-label"><Network size={15} />A shared record</span><span className="live-label"><i />5 simulated nodes</span></div>
    <div className="network-canvas"><div className={`network-status ${agreement ? '' : 'disagrees'}`}><span className="status-orb" />{agreement ? copied ? 'Copies match · validity unproven' : 'All copies match' : 'Copies disagree'}</div>
      <div className="replica-grid">{balances.map((balance, i) => <div className={`replica-node ${balance === 5000 ? 'modified' : ''} ${i === 4 && offline ? 'offline' : ''}`} key={i}><div className="replica-top"><span className="mono">NODE 0{i + 1}</span><span className="node-dot" /></div><span className="replica-icon"><Server size={27} /></span><span className="replica-caption">Alice’s balance</span><strong data-testid={`node-balance-${i + 1}`}>₹{balance.toLocaleString('en-IN')}</strong><div className="replica-bottom">{i === 4 && offline ? <><Unplug size={11} />Offline</> : balance === 5000 ? <><ShieldAlert size={11} />Changed record</> : <><Check size={11} />Local copy</>}</div></div>)}</div>
      <div className="replication-line"><span />{copied ? 'Copied ≠ verified' : 'Each node keeps its own record'}<span /></div>
      <div className="replication-actions"><button className="btn btn-primary" disabled={changed} onClick={tamper}>Change Node 2 to ₹5,000<ArrowRight size={15} /></button><button className="btn btn-secondary" disabled={!changed || (copied && agreement)} onClick={copy}><Copy size={15} />Copy ₹5,000 to peers</button></div>
      <button className="offline-toggle" aria-pressed={offline} onClick={() => { setOffline(v => !v); setMessage(offline ? 'Node 5 reconnected. Its record stays unchanged until you copy again.' : 'Node 5 is offline. It keeps its local record but cannot receive updates.'); }}><Unplug size={13} />{offline ? 'Reconnect Node 5' : 'Take Node 5 offline'}</button>
    </div><div className={`simulation-feedback ${changed ? 'warning' : ''}`} role="status"><ShieldAlert size={17} /><span>{message}</span></div>
    <p className="lab-note replica-note">A teaching model, not a replication protocol. Real databases coordinate updates and recover from failures. Copying a record here deliberately skips validation.</p>
  </div>;
}
