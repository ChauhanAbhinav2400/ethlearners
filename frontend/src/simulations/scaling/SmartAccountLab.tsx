import { useState } from 'react';
import { ArrowRight, Check, Fingerprint, KeyRound, ShieldCheck, Users, Wallet } from 'lucide-react';
import type { SimulationProps } from '../../content/types';

type Operation = { nonce: number; signer: number; sponsored: boolean; recognized: boolean; signed: boolean };
type OperationStage = 'draft' | 'prepared' | 'validated' | 'bundled' | 'included' | 'failed';
export function SmartAccountLab({ onDiscover }: SimulationProps) {
  const [stage, setStage] = useState<OperationStage>('draft');
  const [operation, setOperation] = useState<Operation | null>(null);
  const [nonce, setNonce] = useState(0);
  const [balance, setBalance] = useState(20);
  const [recipient, setRecipient] = useState(0);
  const [sponsorBudget, setSponsorBudget] = useState(5);
  const [accountBudget, setAccountBudget] = useState(5);
  const [sponsored, setSponsored] = useState(true);
  const [sponsorAvailable, setSponsorAvailable] = useState(true);
  const [recognized, setRecognized] = useState(true);
  const [shouldRevert, setShouldRevert] = useState(false);
  const [ownerVersion, setOwnerVersion] = useState(1);
  const [lost, setLost] = useState(false);
  const [guardians, setGuardians] = useState([false, false, false]);
  const [recovery, setRecovery] = useState<'idle' | 'waiting' | 'ready'>('idle');
  const [message, setMessage] = useState('Alice’s smart account holds 20 demo tokens. Prepare a request to send 5 to Bob, then inspect who authorizes it and who pays.');
  function report(text: string) { setMessage(text); onDiscover(text); }
  function invalidateDraft() { setOperation(null); setStage('draft'); }
  function failure(op: Operation) {
    if (!op.signed || !op.recognized || op.signer !== ownerVersion) return 'Authorization rejected: this operation does not have valid authorization from the recognized current signer.';
    if (op.nonce !== nonce) return 'Nonce rejected: the operation does not match the account’s next sequence number.';
    if (op.sponsored && (!sponsorAvailable || sponsorBudget < 1)) return 'Sponsorship rejected: the paymaster declines or lacks a demo gas credit. Someone must still pay for execution.';
    if (!op.sponsored && accountBudget < 1) return 'Gas funding rejected: the account has no demo gas credits left.';
    return '';
  }
  function prepare() {
    setOperation({ nonce, signer: ownerVersion, sponsored, recognized, signed: !lost }); setStage('prepared');
    report(lost ? 'The request was assembled without owner authorization because the key is unavailable. Validation will reject it until recovery lets you prepare a new authorized request.' : 'A UserOperation request with simulated authorization is prepared. It is not an included Ethereum transaction. A bundler must check it and submit a transaction through EntryPoint.');
  }
  function validate() {
    if (!operation) return;
    const error = failure(operation);
    if (error) return report(`${error} The operation stays unexecuted.`);
    setStage('validated'); report('The toy account accepts the authorization and the gas payer accepts the cost. Simulation passed; state can still change before inclusion.');
  }
  function execute() {
    if (!operation) return;
    const error = failure(operation);
    if (error) { setStage('failed'); return report(`${error} Revalidation failed before this operation executed. This model omits the bundler’s failed-transaction cost.`); }
    setNonce(value => value + 1);
    if (operation.sponsored) setSponsorBudget(value => value - 1); else setAccountBudget(value => value - 1);
    setStage('included');
    if (shouldRevert || balance < 5) return report('Included operation reverted. The transfer changed no token balances, but the nonce advanced and its gas payer spent one toy gas credit. Inclusion is not finality.');
    setBalance(value => value - 5); setRecipient(value => value + 5);
    report('The included bundle executed Alice’s request: 5 demo tokens moved to Bob. The selected payer spent one gas credit. Inclusion is not a finality guarantee.');
  }
  const approvalCount = guardians.filter(Boolean).length;
  const progress = stage === 'prepared' ? 1 : stage === 'validated' ? 2 : stage === 'bundled' ? 3 : stage === 'included' ? 4 : 0;
  return <div className="scale-lab">
    <div className="scale-heading"><span className="eyebrow">ONE ACCOUNT. PROGRAMMABLE RULES.</span><span className="scale-chip">ERC-4337 MODEL</span></div>
    <div className="scale-account"><div className="scale-account-title"><Wallet size={24} /><span><strong>Alice’s smart account</strong><code>account.demo.alice</code></span><span className="scale-chip">NONCE <b data-testid="smart-nonce">{nonce}</b></span></div><div className="scale-status-grid"><span>Alice<strong data-testid="smart-alice">{balance} tokens</strong></span><span>Bob<strong data-testid="smart-bob">{recipient} tokens</strong></span><span>Signer<strong>{lost ? 'Unavailable' : `Owner key ${ownerVersion}`}</strong></span></div></div>
    <div className="scale-operation-path" aria-label="User operation progress">{['Prepare', 'Validate', 'Bundle', 'Include'].map((label, i) => <div className={i < progress ? 'done' : ''} key={label}><span>{i < progress ? <Check size={16} /> : i + 1}</span><strong>{label}</strong></div>)}</div>
    <div className="scale-message"><span className="eyebrow">USER OPERATION</span><code>{operation ? `send(Bob, 5)  •  nonce: ${operation.nonce}  •  signer: ${!operation.signed ? 'missing authorization' : operation.recognized ? `owner-${operation.signer}` : 'unknown'}  •  gas: ${operation.sponsored ? 'paymaster' : 'account'}` : 'No request prepared yet'}</code><span>Account policy checks authorization. EntryPoint coordinates validation and execution.</span></div>
    <div className="scale-options"><label><input type="checkbox" checked={sponsored} onChange={event => { setSponsored(event.target.checked); invalidateDraft(); }} />Request paymaster sponsorship</label><label><input type="checkbox" checked={recognized} onChange={event => { setRecognized(event.target.checked); invalidateDraft(); }} />Use the recognized owner signer</label><label><input type="checkbox" checked={sponsorAvailable} onChange={event => { setSponsorAvailable(event.target.checked); setMessage('Paymaster availability changed. Validation must check the current state, even if an earlier simulation passed.'); }} />Paymaster accepts sponsorship</label><label><input type="checkbox" checked={shouldRevert} onChange={event => setShouldRevert(event.target.checked)} />Make the transfer call revert</label></div>
    <div className="scale-metrics"><span><strong data-testid="smart-sponsor-gas">{sponsorBudget} gas credits</strong>Paymaster budget</span><span><strong data-testid="smart-account-gas">{accountBudget} gas credits</strong>Account’s own budget</span></div>
    <div className="scale-actions"><button className={`btn ${['draft', 'included', 'failed'].includes(stage) ? 'btn-primary' : 'btn-secondary'}`} onClick={prepare}>{stage === 'included' || stage === 'failed' ? 'Prepare another operation' : 'Prepare user operation'}</button>{stage === 'prepared' && <button className="btn btn-primary" onClick={validate}>Validate user operation <Fingerprint size={16} /></button>}{stage === 'validated' && <button className="btn btn-primary" onClick={() => { setStage('bundled'); report('The bundler submitted an outer transaction to EntryPoint. Alice’s UserOperation is inside it; nothing has executed in this model yet.'); }}>Bundle & submit <ArrowRight size={16} /></button>}{stage === 'bundled' && <button className="btn btn-primary" onClick={execute}>Include & execute <ShieldCheck size={16} /></button>}</div>
    <details className="scale-recovery"><summary><KeyRound size={17} />What if Alice loses her signing key?</summary><p>This account has a preconfigured, toy two-of-three guardian recovery policy. It changes the allowed signer, while preserving the account address and balances.</p>{!lost ? <button className="btn btn-secondary" onClick={() => { setLost(true); setGuardians([false, false, false]); setRecovery('idle'); report('The owner key is unavailable. The account and its tokens still exist. Recovery only works because this account already has a recovery policy.'); }}>Simulate lost owner key</button> : <><div className="scale-guardians" aria-label="Recovery guardian approvals">{guardians.map((approved, i) => <button aria-pressed={approved} disabled={recovery !== 'idle'} key={i} onClick={() => setGuardians(current => current.map((value, index) => index === i ? !value : value))}><Users size={17} />Guardian {i + 1}<small>{approved ? 'Approved' : 'Awaiting approval'}</small></button>)}</div><p>{approvalCount}/3 guardians approved · threshold: 2</p><div className="scale-actions">{recovery === 'idle' && <button className="btn btn-secondary" disabled={approvalCount < 2} onClick={() => { setRecovery('waiting'); report('Recovery is queued after two guardian approvals. This account’s teaching delay must pass before the replacement signer becomes active.'); }}>Start recovery delay</button>}{recovery === 'waiting' && <button className="btn btn-secondary" onClick={() => { setRecovery('ready'); report('The toy recovery delay has passed. Activate the replacement signer to complete this policy.'); }}>Advance recovery delay</button>}{recovery === 'ready' && <button className="btn btn-primary" onClick={() => { setOwnerVersion(value => value + 1); setLost(false); invalidateDraft(); report('The replacement signer is active. The account address and balances did not move. Old prepared requests were discarded; prepare a new operation with the new signer.'); }}>Activate replacement signer</button>}</div></>}</details>
    <p className="status-line" role="status">{message}</p>
    <p className="lab-note">No real keys, signatures, EntryPoint, bundler, or wallet connection. Credits and delays are invented. Recovery is this toy account’s policy, not an ERC-4337 guarantee. Smart accounts still depend on secure code, signers, configured permissions, gas funding, and recovery assumptions.</p>
  </div>;
}
