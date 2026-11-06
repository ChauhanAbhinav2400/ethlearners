import { useState } from 'react';
import { ArrowRight, Check, Database, GitMerge, Pickaxe, ShieldCheck } from 'lucide-react';
import type { SimulationProps } from '../../content/types';
import './evolution.css';

const startingState = { alice: 10, bob: 0, counter: 7, height: 100 };
export function MergeLab({ onDiscover }: SimulationProps) {
  const [era, setEra] = useState<'pow' | 'pos'>('pow');
  const [state, setState] = useState(startingState);
  const [pending, setPending] = useState(false);
  const [hasStakeHead, setHasStakeHead] = useState(false);
  const [attested, setAttested] = useState(false);
  const [message, setMessage] = useState('Before the Merge, miners produced blocks. Run the toy transfer, then change the consensus mechanism and inspect the same accounts.');
  function execute() { setState(s => ({ alice: s.alice - 1, bob: s.bob + 1, counter: s.counter + 1, height: s.height + 1 })); }
  function changeEra() {
    setEra('pos');
    const text = 'Consensus changed. Alice’s balance, Bob’s balance, contract storage, and existing history did not reset. No “new ETH” conversion is required.';
    setMessage(text); onDiscover(text);
  }
  function block() {
    if (era === 'pow') { execute(); setMessage('A toy mined block passed validation: transfer 1 coin and increment the contract counter. The result is now in this selected chain.'); onDiscover('Before the Merge, Ethereum already had accounts, smart contracts, EVM execution, and transaction fees.'); }
    else { setPending(true); setAttested(false); setMessage('A selected validator proposed the next payload. Accounts remain unchanged until our node validates and selects this block.'); }
  }
  function include() { execute(); setPending(false); setHasStakeHead(true); const text = 'The execution client checked the same transfer and counter rules. The valid proposal is now this node’s selected head; inclusion is still not finality.'; setMessage(text); onDiscover(text); }
  return <div className="evo-lab"><div className="evo-caption"><span><GitMerge size={17} />A HISTORICAL CHANGE · 15 SEPTEMBER 2022</span><p>Change how blocks are agreed on. Keep the application’s state.</p></div>
    <div className="evo-era-track"><div className={era === 'pow' ? 'evo-era active' : 'evo-era'}><Pickaxe size={24} /><strong>Before the Merge</strong><span>Mining · proof of work</span></div><ArrowRight size={23} /><div className={era === 'pos' ? 'evo-era active' : 'evo-era'}><ShieldCheck size={24} /><strong>After the Merge</strong><span>Proposals · stake · attestations</span></div></div>
    <section className="evo-card"><div className="evo-card-heading"><span className="evo-label"><Database size={15} />THE SAME EXECUTION STATE</span><span className="evo-tag">Toy block #{state.height}</span></div><div className="evo-metrics"><div><span>Alice</span><strong data-testid="merge-alice">{state.alice}</strong><small>toy coins</small></div><div><span>Bob</span><strong data-testid="merge-bob">{state.bob}</strong><small>toy coins</small></div><div><span>Contract counter</span><strong data-testid="merge-counter">{state.counter}</strong><small>persistent storage</small></div></div><p className="evo-small">Our next transaction sends 1 coin to Bob and increases the counter by 1. Its meaning stays the same across the transition.</p></section>
    <div className="evo-grid evo-spaced"><section className="evo-card"><span className="evo-label">WHAT CHANGED</span><h3>{era === 'pow' ? 'Miners search for qualifying work' : 'Validators propose and attest'}</h3><p>{era === 'pow' ? 'A miner offers a block with proof of work. Other nodes still check every rule; a successful hash search cannot excuse an invalid transfer.' : 'A selected validator proposes a block. Other validators attest with stake-weighted votes. Full nodes independently validate execution and consensus.'}</p><div className="evo-chip-row"><span>{era === 'pow' ? 'Work-based fork choice' : 'Stake-weighted fork choice'}</span><span>{era === 'pow' ? 'Probabilistic settlement' : 'Checkpoint finality'}</span></div></section><section className="evo-card"><span className="evo-label">WHAT DID NOT DISAPPEAR</span><ul className="evo-checklist"><li><Check size={14} />Existing accounts and contracts</li><li><Check size={14} />Transaction execution and gas charges</li><li><Check size={14} />Independent validation of each block</li><li><Check size={14} />History leading up to the transition</li></ul><p className="evo-small">The Merge did not make execution free or multiply network capacity. Scaling is a separate part of the story.</p></section></div>
    <div className="evo-actions"><button className="btn btn-primary" disabled={state.alice === 0 || pending} onClick={block}>{era === 'pow' ? 'Mine and validate toy block' : 'Propose next toy block'}</button>{era === 'pow' ? <button className="btn btn-secondary" onClick={changeEra}><GitMerge size={15} />Apply historical Merge</button> : <><button className="btn btn-secondary" disabled={!pending} onClick={include}>Validate and select proposal</button><button className="btn btn-secondary" disabled={!hasStakeHead || pending || attested} onClick={() => { setAttested(true); setMessage('Attestations now support the selected head. This compressed scene does not finalize it: Casper checkpoint rules require additional conditions across epochs.'); onDiscover('A proposal, execution validation, a head vote, and finality are distinct steps.'); }}>Record attestations</button></>}</div>
    <p className="evo-status" role="status">{message}</p><p className="evo-note">Historical architecture model, not a replay of the actual transition blocks. Block numbers, balances, transfers, and timing are invented. Fees are omitted from this counter display but still existed before and after the Merge. Some consensus-related block fields and EVM semantics also changed; the account state remained continuous.</p>
  </div>;
}
