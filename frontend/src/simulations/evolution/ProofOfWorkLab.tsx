import { useState } from 'react';
import { Check, Cpu, Pickaxe, RotateCcw, ShieldCheck, X } from 'lucide-react';
import type { SimulationProps } from '../../content/types';
import { searchWork } from './models';
import type { WorkAttempt } from './models';
import './evolution.css';

export function ProofOfWorkLab({ onDiscover }: SimulationProps) {
  const [difficulty, setDifficulty] = useState(1);
  const [amount, setAmount] = useState(5);
  const [attempts, setAttempts] = useState(0);
  const [recent, setRecent] = useState<WorkAttempt[]>([]);
  const [winner, setWinner] = useState<WorkAttempt | null>(null);
  const [result, setResult] = useState<'accepted' | 'rejected' | null>(null);
  const [message, setMessage] = useState('Try a nonce: an extra number you can change without changing the transfer. Search until the hash meets the target.');
  function clear() { setAttempts(0); setRecent([]); setWinner(null); setResult(null); }
  function search(count: number) {
    const batch = searchWork(amount, difficulty, attempts, count);
    const found = batch.find(item => item.meetsTarget);
    setRecent(current => [...current, ...batch].slice(-6)); setAttempts(n => n + batch.length);
    if (found) { setWinner(found); setMessage(`Nonce ${found.nonce} meets the work target. Now ask an independent node to check both the work and the transfer.`); onDiscover('Finding a qualifying hash takes repeated guesses. Checking the winning hash takes one computation.'); }
    else setMessage(`Tried ${batch.length} more ${batch.length === 1 ? 'nonce' : 'nonces'}. None met the target. Each click is bounded; there is no background mining.`);
  }
  function validate() {
    if (!winner) return;
    const valid = amount <= 10;
    setResult(valid ? 'accepted' : 'rejected');
    const text = valid ? 'Both checks passed: the proof meets the target and Alice can afford the transfer. This is only a candidate block; fork-choice rules would still select a chain.' : 'Proof passes. Transfer fails: Alice has 10, not 50. An honest node rejects this block even though someone found work for it.';
    setMessage(text); onDiscover(text);
  }
  return <div className="evo-lab">
    <div className="evo-caption"><span><Pickaxe size={17} />HISTORICAL ETHEREUM · BEFORE THE MERGE</span><p>Search for work. Then check the rules.</p></div>
    <div className="evo-grid"><section className="evo-card"><span className="evo-label">1 / CHOOSE THE CANDIDATE</span><h3>Alice has 10 toy coins</h3><div className="evo-toggle" aria-label="Candidate transfer"><button aria-pressed={amount === 5} onClick={() => { setAmount(5); clear(); setMessage('A new candidate needs new work. Alice proposes sending 5 of her 10 coins.'); }}>Send 5 to Bob</button><button aria-pressed={amount === 50} onClick={() => { setAmount(50); clear(); setMessage('This candidate overspends. You can still search for its proof; validation is a separate check.'); }}>Try sending 50</button></div><label className="evo-field">Work difficulty<select value={difficulty} onChange={event => { setDifficulty(Number(event.target.value)); clear(); setMessage('A tighter target accepts fewer hash values. The expected number of guesses increases; a particular run can still get lucky.'); }}><option value={1}>Easy · 1 leading zero</option><option value={2}>Medium · 2 leading zeros</option><option value={3}>Hard · 3 leading zeros</option></select></label><p className="evo-small">Expected guesses in an ideal uniform model: about {16 ** difficulty}. Not a guaranteed number of attempts.</p><code className="evo-code">target: hash &lt; {`0x${(2 ** (32 - difficulty * 4)).toString(16).padStart(8, '0')}`}</code></section>
    <section className="evo-card"><span className="evo-label">2 / SEARCH A NONCE</span><div className="evo-stat"><strong data-testid="pow-attempts">{attempts.toLocaleString()}</strong><span>hash attempts made</span></div><div className="evo-attempt-head"><span>Nonce</span><span>Toy hash</span><span>Target</span></div><div className="evo-attempts">{recent.length === 0 ? <p>No guesses yet. Start below.</p> : recent.map(item => <div className={item.meetsTarget ? 'evo-hit' : ''} key={item.nonce}><code>{item.nonce}</code><code>{item.hash.toString(16).padStart(8, '0')}</code>{item.meetsTarget ? <Check aria-label="Meets target" size={15} /> : <X aria-label="Misses target" size={13} />}</div>)}</div></section></div>
    <div className="evo-actions"><button className="btn btn-primary" disabled={!!winner} onClick={() => search(1)}><Cpu size={15} />Try 1 nonce</button><button className="btn btn-secondary" disabled={!!winner} onClick={() => search(64)}>Try up to 64</button><button className="btn btn-secondary" disabled={!!winner} onClick={() => search(512)}>Try up to 512</button><button className="btn btn-secondary" onClick={() => { clear(); setMessage('Search reset. The candidate and difficulty stay the same, so this deterministic search repeats the same guesses.'); }}><RotateCcw size={14} />Reset search</button></div>
    <div className="evo-validation"><ShieldCheck size={21} /><div><strong>3 / Independent validation</strong><p>Work target: {winner ? 'passed' : 'not found'} · Transfer rule: {result ? amount <= 10 ? 'passed' : 'failed — overspending' : 'not checked'}</p></div><button className="btn btn-primary" disabled={!winner || result !== null} onClick={validate}>Validate candidate</button></div>
    <p className={`evo-status ${result === 'rejected' ? 'evo-warning' : ''}`} role="status">{message}</p>
    <p className="evo-note">Toy 32-bit noncryptographic hash; no real mining. Historical Ethereum used Ethash and cumulative-work chain selection. More hash power never made an invalid transaction valid. Ethereum now uses proof of stake.</p>
  </div>;
}
