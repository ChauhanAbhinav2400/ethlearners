import { useState } from 'react';
import { ArrowRight, Code2, FileCheck2, Fuel, RotateCcw } from 'lucide-react';
import type { SimulationProps } from '../../content/types';
import { effectivePrice, GWEI, gwei, nextBaseFee } from './models';
import './evolution.css';

const stages = [
  { name: 'Draft', text: 'An author writes down a problem, a proposed change, and its tradeoffs. A numbered proposal is not a feature you can assume every node supports.' },
  { name: 'Review', text: 'People examine the technical design and give feedback. The proposal can change, stall, or be withdrawn. Client code and tests are separate work.' },
  { name: 'Last Call', text: 'A stable proposal gets a final review window. Significant changes can send it back for further review; moving forward is not automatic.' },
  { name: 'Final', text: 'The specification is considered final. This status alone does not prove activation on a particular network. Core changes require coordinated implementation and a network upgrade; ERC interfaces are adopted by applications.' },
];
type FeeSample = { block: number; base: bigint; fill: number };

export function UpgradeLab({ onDiscover }: SimulationProps) {
  const [market, setMarket] = useState<'old' | 'new'>('new');
  const [format, setFormat] = useState<'legacy' | 'typed'>('typed');
  const [base, setBase] = useState(20n * GWEI);
  const [fill, setFill] = useState(100);
  const [samples, setSamples] = useState<FeeSample[]>([]);
  const [cap, setCap] = useState('30');
  const [tip, setTip] = useState('2');
  const [stage, setStage] = useState(0);
  const [message, setMessage] = useState('Set block demand, then produce a block. Its gas usage determines the next block’s base fee.');
  const usesTyped = market === 'new' && format === 'typed';
  const validInput = /^\d+$/.test(cap) && Number(cap) <= 1000 && (!usesTyped || /^\d+$/.test(tip) && Number(tip) <= 1000);
  const capWei = validInput ? BigInt(cap) * GWEI : 0n;
  const tipWei = validInput && usesTyped ? BigInt(tip) * GWEI : 0n;
  const price = !validInput ? null : market === 'old' ? capWei : effectivePrice(base, capWei, usesTyped ? tipWei : capWei - base);
  const next = nextBaseFee(base, BigInt(fill) * 10_000n, 1_000_000n);
  const fee = price === null ? null : price * 21_000n;
  function produce() {
    setSamples(items => [...items, { block: items.length + 1, base, fill }]);
    setBase(next);
    const text = fill > 100 ? 'Above-target demand raised the next base fee. At twice the target, the EIP-1559 rule raises it by 12.5%, with integer rounding.' : fill < 100 ? 'Below-target demand lowered the next base fee. Empty blocks lower it by 12.5%, with integer rounding.' : 'The block exactly met its gas target, so the next base fee stays unchanged.';
    setMessage(text); onDiscover(text);
  }
  return <div className="evo-lab"><div className="evo-caption"><span><Fuel size={17} />A CHANGE WITH A REASON</span><p>Compare the fee mechanism before and after EIP-1559.</p></div>
    <div className="evo-toggle evo-wide" aria-label="Fee mechanism"><button aria-pressed={market === 'old'} onClick={() => { setMarket('old'); setMessage('Historical first-price fee model: users bid a gas price. There is no protocol base fee in this comparison.'); }}>Before EIP-1559</button><button aria-pressed={market === 'new'} onClick={() => { setMarket('new'); setMessage('EIP-1559 adds a changing base fee and flexible per-unit fee caps. It does not remove gas costs.'); }}>With EIP-1559</button></div>
    <div className="evo-grid evo-spaced"><section className="evo-card"><span className="evo-label">BLOCK DEMAND</span><h3>{market === 'new' ? 'Demand changes the next base fee' : 'Users choose a bid'}</h3>{market === 'new' ? <><label className="evo-field">Gas used in the block: {fill}% of target<input aria-label="Block demand" type="range" min="0" max="200" step="25" value={fill} onChange={e => setFill(Number(e.target.value))} /></label><div className="evo-range-labels"><span>Empty</span><span>Target</span><span>2× target</span></div><div className="evo-fee-transition"><div><small>This block</small><strong>{gwei(base)}</strong><span>gwei / gas</span></div><ArrowRight size={20} /><div><small>Next block</small><strong data-testid="next-base-fee">{gwei(next)}</strong><span>gwei / gas</span></div></div><button className="btn btn-primary" disabled={samples.length >= 32} onClick={produce}>Produce this block</button><p className="evo-small">Example target: 1,000,000 gas. Maximum: twice the target. The next fee uses the previous block’s gas usage, not an instant auction reading.</p></> : <><div className="evo-stat"><strong>{validInput ? cap : '—'}</strong><span>Your bid in gwei per gas</span></div><p>Higher bids can make a request more attractive to a block producer. Guessing an adequate bid can be difficult when demand changes.</p><p className="evo-small">This comparison does not simulate transaction selection. A bid is not a guarantee of inclusion.</p></>}</section>
    <section className="evo-card"><span className="evo-label">TRANSACTION FORMAT & PRICE</span>{market === 'new' && <div className="evo-toggle evo-spaced" aria-label="Transaction envelope"><button aria-pressed={format === 'legacy'} onClick={() => setFormat('legacy')}>Legacy</button><button aria-pressed={format === 'typed'} onClick={() => setFormat('typed')}>Type 0x02</button></div>}<label className="evo-field">{usesTyped ? 'Maximum fee' : 'Gas price'} · whole gwei per gas<input inputMode="numeric" value={cap} onChange={e => setCap(e.target.value)} /></label>{usesTyped && <label className="evo-field">Maximum priority fee · whole gwei per gas<input inputMode="numeric" value={tip} onChange={e => setTip(e.target.value)} /></label>}<div className="evo-price-result"><span>Effective price</span><strong data-testid="effective-price">{price === null ? 'Not eligible' : `${gwei(price)} gwei`}</strong><small>{!validInput ? 'Use whole numbers from 0 to 1,000.' : price === null ? capWei < base ? 'The cap is below this block’s base fee.' : 'The cap cannot be lower than the maximum priority fee.' : usesTyped ? 'min(max fee, base fee + max priority fee)' : market === 'new' ? 'Legacy gas price includes both the base fee and its remaining tip.' : 'The offered gas price is charged for each unit used.'}</small></div><p className="evo-small">Illustrative 21,000-gas execution fee: <strong>{fee === null ? 'not included at this price' : `${gwei(fee)} gwei`}</strong></p>{market === 'new' && price !== null && <div className="evo-chip-row"><span>Base fee burned: {gwei(base)} / gas</span><span>Priority: {gwei(price - base)} / gas</span></div>}<code className="evo-code">{usesTyped ? '0x02 || encode(chainId, nonce, maxPriorityFee, maxFee, gasLimit, …)' : 'encode(nonce, gasPrice, gasLimit, to, value, data, signature)'}</code></section></div>
    {samples.length > 0 && <div className="evo-history" aria-label="Recent block fee history">{samples.slice(-5).map(sample => <div key={sample.block}><span>Block {sample.block}</span><strong>{gwei(sample.base)}</strong><small>gwei · {sample.fill}% target</small></div>)}</div>}
    <div className="evo-actions"><button className="btn btn-secondary" onClick={() => { setBase(20n * GWEI); setSamples([]); setMessage('Fee history reset to 20 gwei. Change demand and compare another path.'); }}><RotateCcw size={14} />Reset fee history</button></div>
    <div className="evo-status" role="status">{message}</div>
    <section className="evo-card evo-spaced"><span className="evo-label"><FileCheck2 size={15} />HOW A PROPOSAL BECOMES A SPECIFICATION</span><div className="evo-lifecycle" aria-label="Proposal lifecycle">{stages.map((item, i) => <button key={item.name} aria-pressed={stage === i} onClick={() => { setStage(i); if (i === 3) onDiscover('A Final EIP is a stable specification. Network activation and adoption are separate questions.'); }}><span>{i + 1}</span>{item.name}</button>)}</div><h3>{stages[stage].name}</h3><p>{stages[stage].text}</p><p className="evo-small"><Code2 size={13} /> EIP-2718 defines a typed envelope: a type identifier tells software how to interpret the payload. Type 0x02 is EIP-1559’s format; a type number alone is not a fee policy.</p></section>
    <p className="evo-note">Historical mechanism comparison. EIP-1559 base-fee arithmetic uses exact integer wei and its original 1/8 adjustment denominator; the target, fee inputs, and demand are invented. Up to 32 manual blocks; no live fee estimate, blob fees, signatures, network activation, or complete proposal workflow. Legacy transactions remain usable after EIP-1559.</p>
  </div>;
}
