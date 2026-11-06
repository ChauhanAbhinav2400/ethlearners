import { useState } from 'react';
import { ArrowDown, Check, Database, Layers3, ShieldCheck, X } from 'lucide-react';
import type { SimulationProps } from '../../content/types';

type Phase = 'draft' | 'sequenced' | 'posted' | 'accepted' | 'finalized' | 'rejected';
export function RollupLab({ onDiscover }: SimulationProps) {
  const [count, setCount] = useState(4);
  const [kind, setKind] = useState<'optimistic' | 'validity'>('optimistic');
  const [compressed, setCompressed] = useState(true);
  const [online, setOnline] = useState(true);
  const [dataReady, setDataReady] = useState(true);
  const [incorrect, setIncorrect] = useState(false);
  const [phase, setPhase] = useState<Phase>('draft');
  const [ticks, setTicks] = useState(0);
  const [challenged, setChallenged] = useState(false);
  const [message, setMessage] = useState('Four transfers are waiting. Give them an order, then follow the batch to Ethereum.');
  const frozen = phase !== 'draft';
  const rawBytes = count * 96;
  const postedBytes = compressed ? 48 + count * 28 : rawBytes;
  const published = ['posted', 'accepted', 'finalized'].includes(phase);
  const unsafe = incorrect && ['accepted', 'finalized'].includes(phase);
  function report(text: string) { setMessage(text); onDiscover(text); }
  function sequence() {
    if (!online) return report('The sequencer is unavailable. These requests stay queued; no L1 record has changed. Real systems differ in their fallback and forced-inclusion paths.');
    setPhase('sequenced');
    report('The sequencer ordered the transfers and reported an L2 result. That early acknowledgement is not L1 settlement or finality.');
  }
  function publish() {
    if (!dataReady) return report('Publication blocked: the batch data is missing. A commitment alone cannot give other participants the data needed to reconstruct this rollup.');
    setPhase('posted');
    report(kind === 'optimistic' ? 'Data and a claimed result are included on L1. The challenge period is still open.' : 'Data and a claimed result are included on L1. The verifier has not accepted a validity proof yet.');
  }
  function challenge() {
    if (incorrect) { setPhase('rejected'); report('The toy challenger replayed the batch and found the extra 20 credits. The incorrect claim is rejected. Optimistic security needs someone able to challenge in time.'); }
    else { setChallenged(true); report('Replay matches the claimed result. There is no incorrect transition to challenge, but the challenge period still has to pass.'); }
  }
  function advanceChallenge() {
    setTicks(value => value + 1);
    if (ticks + 1 === 2) {
      setPhase('accepted');
      report(incorrect ? 'Unsafe outcome: the incorrect claim passed this toy deadline without a challenge. This is why available data and an honest, timely challenger matter.' : 'The toy challenge period ended with no successful challenge. The settlement contract accepts the result; L1 finality is a separate next step.');
    } else report('One of two teaching clock steps has passed. The result can still be challenged. These steps are not a real withdrawal time.');
  }
  function verifyProof() {
    setPhase(incorrect ? 'rejected' : 'accepted');
    report(incorrect ? 'The toy verifier rejects the incorrect transition. There is no valid proof for the claim under these rules.' : 'The toy verifier accepts the transition. A validity-proof system checks a proof; it does not wait for someone to challenge this result. L1 finality still matters.');
  }
  function reset() { setPhase('draft'); setTicks(0); setChallenged(false); setMessage('Fresh batch. Change a condition and compare the result.'); }
  return <div className="scale-lab">
    <div className="scale-heading"><span className="eyebrow">FROM MANY REQUESTS TO ONE BATCH</span><span className="scale-chip">LOCAL MODEL</span></div>
    <div className="scale-segment" aria-label="Rollup verification model"><button aria-pressed={kind === 'optimistic'} disabled={frozen} onClick={() => setKind('optimistic')}>Optimistic</button><button aria-pressed={kind === 'validity'} disabled={frozen} onClick={() => setKind('validity')}>Validity proof</button></div>
    <div className="scale-batch-stage">
      <div className="scale-batch-top"><Layers3 size={22} /><div><strong>L2 sequencer</strong><span>{online ? 'Available to order requests' : 'Unavailable · requests queued'}</span></div><span className={`scale-signal ${online ? '' : 'off'}`} /></div>
      <div className="scale-packets">{Array.from({ length: count }, (_, i) => <div className={phase === 'draft' ? '' : 'ordered'} key={i}><small>TX 0{i + 1}</small><span>Alice → Bob</span><strong>1 credit</strong></div>)}</div>
      <div className="scale-batch-result"><span>{phase === 'draft' ? 'Expected result' : 'Sequencer’s claimed result'}</span><strong>Bob: {count + (incorrect && phase !== 'draft' ? 20 : 0)} credits</strong>{incorrect && phase !== 'draft' && <span className="scale-warning">20 invented credits</span>}</div>
    </div>
    <div className="scale-connection"><ArrowDown size={20} /><span>{postedBytes} toy bytes · {compressed ? 'shared header + compact records' : 'full records'}</span><ArrowDown size={20} /></div>
    <div className={`scale-settlement ${unsafe || phase === 'rejected' ? 'warning' : ''}`}>
      <div><Database size={22} /><span><strong>Ethereum settlement contract</strong><small>{published ? 'Batch data published in a simulated blob' : phase === 'rejected' ? 'Claim rejected' : 'No published batch yet'}</small></span></div>
      <div className="scale-status-grid"><span>Data<strong>{published || phase === 'rejected' ? 'Published' : 'Not published'}</strong></span><span>Result<strong>{phase === 'rejected' ? 'Rejected' : ['accepted', 'finalized'].includes(phase) ? unsafe ? 'Unsafely accepted' : 'Accepted' : 'Not accepted'}</strong></span><span>L1 history<strong>{phase === 'finalized' ? 'Finalized in model' : 'Not finalized'}</strong></span></div>
      {kind === 'optimistic' && phase === 'posted' && <div className="scale-clock"><span>Challenge window</span><progress aria-label="Teaching challenge clock" value={ticks} max={2} /><span>{ticks}/2 steps</span></div>}
    </div>
    <fieldset className="scale-options" disabled={frozen}><legend>Set up the batch</legend><label className="scale-range">Transfers per batch <output>{count}</output><input aria-label="Transfers per batch" type="range" min={1} max={8} value={count} onChange={event => setCount(Number(event.target.value))} /></label><label><input type="checkbox" checked={compressed} onChange={event => setCompressed(event.target.checked)} />Compress repeated fields</label><label><input type="checkbox" checked={incorrect} onChange={event => setIncorrect(event.target.checked)} />Claim an incorrect result</label></fieldset>
    <div className="scale-options scale-inline-options"><label><input type="checkbox" checked={online} disabled={frozen} onChange={event => setOnline(event.target.checked)} />Sequencer online</label><label><input type="checkbox" checked={dataReady} disabled={published || phase === 'rejected'} onChange={event => setDataReady(event.target.checked)} />Batch data available to publish</label></div>
    <div className="scale-metrics"><span><strong>{rawBytes} → {postedBytes} B</strong>Toy publication size</span><span><strong>{(96 / count).toFixed(1)} units / transfer</strong>96-unit shared overhead ÷ {count}</span></div>
    <div className="scale-actions">
      {phase === 'draft' && <button className="btn btn-primary" onClick={sequence}>Sequence batch <Layers3 size={16} /></button>}
      {phase === 'sequenced' && <button className="btn btn-primary" onClick={publish}>Publish data to L1 <ArrowDown size={16} /></button>}
      {phase === 'posted' && (kind === 'validity' ? <button className="btn btn-primary" onClick={verifyProof}>Verify toy proof <ShieldCheck size={16} /></button> : <><button className="btn btn-secondary" onClick={challenge} disabled={challenged}>Challenge result</button><button className="btn btn-primary" onClick={advanceChallenge}>Advance challenge clock</button></>)}
      {phase === 'accepted' && <button className="btn btn-primary" onClick={() => { setPhase('finalized'); report(incorrect ? 'L1 finalized a history in which this toy contract accepted an unchallenged bad claim. Finality does not repair a failed rollup security assumption.' : 'The L1 record is now finalized in this teaching model. Sequencer acknowledgement, settlement acceptance, and finality were different events.'); }}>Advance L1 finality <Check size={16} /></button>}
      {frozen && <button className="btn btn-secondary" onClick={reset}>Try another batch</button>}
    </div>
    <p className="status-line" role="status" aria-label="Rollup experiment result">{phase === 'rejected' && <X size={16} />}{message}</p>
    <p className="lab-note">No compression library, proof system, or real clock runs here. Bytes, credits, overhead, and two-step delays are invented. Blobs provide temporary data availability, not permanent storage. Real rollups differ in upgrade keys, sequencers, provers, challenge rules, and escape paths.</p>
  </div>;
}
