import { useState } from 'react';
import { ArrowRight, Braces, Code2, Eye, Layers, Play, Send } from 'lucide-react';
import type { SimulationProps } from '../../content/types';
import { counterAbi, encodeUint, whole } from './models';
import { ExecCode, ExecHeader, ExecStatus } from './shared';

type Build = { initial: number; ceiling: number };
type Deployed = Build & { address: string; count: number };
export function ContractLab({ onDiscover }: SimulationProps) {
  const [initial, setInitial] = useState('5'); const [ceiling, setCeiling] = useState('10'); const [build, setBuild] = useState<Build | null>(null); const [contract, setContract] = useState<Deployed | null>(null);
  const [deployment, setDeployment] = useState(0); const [nextValue, setNextValue] = useState('8'); const [pending, setPending] = useState<number | null>(null); const [included, setIncluded] = useState(0); const [output, setOutput] = useState('No request yet.');
  const [message, setMessage] = useState('Choose the starting value and rule. Build the model, then deploy a local instance.');
  const source = `// Teaching template · Solidity\npragma solidity ^0.8.0;\ncontract Counter {\n  uint256 private count = ${initial || '?'};\n  event Changed(uint256 value);\n\n  function get() external view returns (uint256) {\n    return count;\n  }\n\n  function set(uint256 next) external {\n    require(next <= ${ceiling || '?'}, "Too large");\n    count = next;\n    emit Changed(next);\n  }\n}`;
  function report(text: string) { setMessage(text); onDiscover(text); }
  function compile() {
    const start = whole(initial, 0, 100); const max = whole(ceiling, 0, 100);
    if (start === null || max === null || start > max) { report('Use whole numbers from 0 to 100, with a starting value no larger than the allowed maximum.'); return; }
    setBuild({ initial: start, ceiling: max }); report('Teaching build ready: the interface describes get(), set(uint256), and Changed(uint256). The instruction sketch is illustrative, not real bytecode.');
  }
  function deploy() {
    if (!build || pending !== null) return; const id = deployment + 1; setDeployment(id); setContract({ ...build, count: build.initial, address: `0x${(0xc000 + id).toString(16).padStart(40, '0')}` }); setIncluded(included + 1); setOutput('Deployment included locally. A new contract instance now has its own state.');
    report('The toy creation transaction was included. This instance keeps the rules from this build even if you later edit the source template.');
  }
  function getValue(): number | null { const value = whole(nextValue, 0, 1000); if (value === null) report('Enter a whole value from 0 to 1,000.'); return value; }
  function read() { if (!contract) return; setOutput(`get() returned ${contract.count}\nABI return bytes: ${encodeUint(contract.count)}`); report('A read call ran against this node’s state. It did not create a transaction or charge an onchain fee. Provider usage limits can still apply in real apps.'); }
  function simulate() {
    if (!contract) return; const value = getValue(); if (value === null) return;
    setOutput(value > contract.ceiling ? `eth_call → revert: Too large\nStored count remains ${contract.count}.` : `eth_call → 0x (no return value)\nA temporary execution set count to ${value}; it was discarded.\nStored count remains ${contract.count}.`);
    report(value > contract.ceiling ? 'The simulation hit require() and reverted. No transaction was sent.' : 'Even a write function can be simulated with eth_call. Its temporary changes are discarded; the stored value stays the same.');
  }
  function send() { if (!contract || pending !== null) return; const value = getValue(); if (value === null) return; setPending(value); setOutput(`Pending: set(${value})\nStored count remains ${contract.count}.`); report('The local wallet model submitted a request. Wait for inclusion before treating its state change as real.'); }
  function include() {
    if (!contract || pending === null) return; const success = pending <= contract.ceiling;
    setContract({ ...contract, count: success ? pending : contract.count }); setIncluded(included + 1); setOutput(success ? `Receipt status: 0x1\nChanged(${pending}) emitted\nStored count: ${pending}` : `Receipt status: 0x0\nrequire() reverted; no surviving event\nStored count: ${contract.count}`); setPending(null);
    report(success ? 'Included successfully: the stored value changed and the event survived. The receipt does not claim finality.' : 'Included but reverted: the stored value stayed the same. Real included failures still use a nonce and pay gas; fees are omitted here.');
  }
  return <div className="exec-lab"><ExecHeader eyebrow="A SMALL CONTRACT, END TO END">Turn a rule into an interface, then watch a deployed instance keep state.</ExecHeader>
    <div className="exec-workflow" aria-label="Contract workflow"><span className="is-ready"><Code2 size={15} /> Source</span><ArrowRight size={15} /><span className={build ? 'is-ready' : ''}><Braces size={15} /> Build</span><ArrowRight size={15} /><span className={contract ? 'is-ready' : ''}><Layers size={15} /> Deployed</span></div>
    <div className="exec-fields"><label className="field">Starting counter value<input inputMode="numeric" value={initial} onChange={e => { setInitial(e.target.value); setBuild(null); }} /></label><label className="field">Largest value set() accepts<input inputMode="numeric" value={ceiling} onChange={e => { setCeiling(e.target.value); setBuild(null); }} /></label></div>
    <ExecCode label="SOLIDITY SOURCE · EDIT USING THE TWO FIELDS ABOVE" value={source} />
    <div className="exec-actions"><button className="btn btn-primary" onClick={compile}><Braces size={15} /> Build teaching model</button><button className="btn btn-secondary" onClick={deploy} disabled={!build || pending !== null}><Layers size={15} /> Deploy locally</button></div>
    {build && <details className="exec-details"><summary>Inspect build output and ABI</summary><ExecCode label="TOY INSTRUCTION SKETCH · NOT EVM BYTECODE" value={`CREATE instance with count = ${build.initial}\nGET: read storage slot 0 → encode uint256\nSET(next): require next <= ${build.ceiling}\n  write slot 0 → emit Changed(next)`} /><ExecCode label="ABI · THE CONTRACT’S MACHINE-READABLE INTERFACE" value={counterAbi} /></details>}
    <section className="exec-card exec-deployed"><div className="exec-card-title"><Layers size={18} /><h3>{contract ? 'Your deployed instance' : 'No contract deployed yet'}</h3>{contract && <span className="exec-tag">LOCAL MODEL</span>}</div>{contract ? <><p className="mono exec-address">{contract.address}</p><div className="exec-metrics"><div><span>Stored counter</span><strong data-testid="contract-count">{contract.count}</strong><small>persistent state</small></div><div><span>Deployed limit</span><strong>{contract.ceiling}</strong><small>rule frozen at deployment</small></div><div><span>Included requests</span><strong>{included}</strong><small>includes deployments</small></div></div><label className="field">Value for set(uint256)<input inputMode="numeric" value={nextValue} onChange={e => setNextValue(e.target.value)} disabled={pending !== null} /></label><div className="exec-actions"><button className="btn btn-secondary" onClick={read}><Eye size={14} /> Read get()</button><button className="btn btn-secondary" onClick={simulate}><Play size={14} /> Simulate set()</button><button className="btn btn-primary" onClick={send} disabled={pending !== null}><Send size={14} /> Send set() transaction</button>{pending !== null && <button className="btn btn-primary" onClick={include}>Include pending request <ArrowRight size={14} /></button>}</div><ExecCode label="REQUEST RESULT" value={output} /></> : <p className="exec-empty">Build the template and deploy it to make the controls available.</p>}</section>
    <ExecStatus>{message}</ExecStatus><p className="lab-note">This is a constrained teaching model, not solc or an EVM. It accepts only the template above and emits an instruction sketch. A real compiler produces deployment and runtime bytecode plus an ABI. Addresses are synthetic; deployment gas, signing, account balances, and consensus are omitted. No browser wallet or network is accessed.</p>
  </div>;
}
