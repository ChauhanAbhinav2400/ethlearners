import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Fingerprint, KeyRound, Link2, Link2Off, LockKeyhole, Radio, RefreshCw, ShieldCheck, ShieldX, WifiOff } from 'lucide-react';
import type { SimulationProps } from '../content/types';
import './foundations.css';

const peerNames = ['A', 'B', 'C', 'D', 'E'];
const peerPositions = [[50, 17], [83, 40], [71, 78], [29, 78], [17, 40]];
const peerEdges = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]];

export function PeersLab({ onDiscover }: SimulationProps) {
  const [received, setReceived] = useState([true, false, false, false, false]);
  const [isolated, setIsolated] = useState(false);
  const [round, setRound] = useState(0);
  const [status, setStatus] = useState('Peer A has a new message. Its neighbors have not received it yet.');
  const receivedCount = received.filter(Boolean).length;

  function gossip() {
    const next = [...received];
    for (const [a, b] of peerEdges) {
      if (isolated && (a === 2 || b === 2)) continue;
      if (received[a]) next[b] = true;
      if (received[b]) next[a] = true;
    }
    const newPeers = next.flatMap((hasMessage, index) => hasMessage && !received[index] ? [peerNames[index]] : []);
    setReceived(next);
    setRound(value => value + 1);
    const nextStatus = newPeers.length
      ? `One hop delivered the message to ${newPeers.map(name => `peer ${name}`).join(' and ')}.`
      : isolated && !next[2]
        ? 'The connected peers have the message. Peer C is isolated and cannot receive it.'
        : 'Every peer already has the message. There is nothing new to deliver.';
    setStatus(nextStatus);
    onDiscover(next.every(Boolean)
      ? 'The message traveled neighbor to neighbor. Receiving a message does not prove that it is valid.'
      : isolated && next.filter(Boolean).length === 4
        ? 'A disconnected peer misses updates. Reconnect peer C, then gossip again to let it catch up.'
        : 'Each step reaches only direct neighbors. Peer-to-peer communication does not require a central sender.');
  }

  function toggleConnection() {
    setIsolated(value => !value);
    setStatus(isolated
      ? 'Peer C is connected again. A gossip step can deliver any message it missed.'
      : 'Peer C is disconnected. It keeps any message it already received, but cannot receive new messages.');
  }

  function reset() {
    setReceived([true, false, false, false, false]);
    setRound(0);
    setStatus('A fresh message starts at peer A. Step through its journey.');
  }

  return <div className="fnd-lab">
    <div className="fnd-stage-heading"><span className="eyebrow">PEER NETWORK</span><span className="fnd-round mono">ROUND {String(round).padStart(2, '0')}</span></div>
    <div className="fnd-network" aria-label="Five peers connected in a ring">
      <svg className="fnd-network-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {peerEdges.map(([a, b]) => <line key={`${a}-${b}`} x1={peerPositions[a][0]} y1={peerPositions[a][1]} x2={peerPositions[b][0]} y2={peerPositions[b][1]} className={isolated && (a === 2 || b === 2) ? 'fnd-edge-off' : received[a] && received[b] ? 'fnd-edge-active' : ''} />)}
      </svg>
      <div className="fnd-network-center"><span className="mono">{receivedCount}<span> / 5</span></span><small>message received</small></div>
      {peerNames.map((name, index) => <div key={name} data-testid={`peer-${name}`} className={`fnd-peer ${received[index] ? 'has-message' : ''} ${isolated && index === 2 ? 'is-isolated' : ''}`} style={{ left: `${peerPositions[index][0]}%`, top: `${peerPositions[index][1]}%` }}>
        <div className="fnd-peer-icon">{isolated && index === 2 ? <WifiOff size={24} /> : <Radio size={24} />}</div>
        <strong>Peer {name}</strong><span>{isolated && index === 2 ? received[index] ? 'Offline · saved copy' : 'Offline · no message' : received[index] ? 'Message received' : 'Waiting for message'}</span>
      </div>)}
    </div>
    <div className="fnd-packet mono"><span className="fnd-dot" /> MESSAGE 0x7a2f <span>“Alice sends 5 to Bob”</span></div>
    <div className="fnd-controls"><button className="btn btn-primary" onClick={gossip}>Gossip one hop <ArrowRight size={16} /></button><button className="btn btn-secondary" onClick={toggleConnection}>{isolated ? 'Reconnect' : 'Disconnect'} peer C</button><button className="fnd-icon-btn" aria-label="Start a fresh message" title="Start a fresh message" onClick={reset}><RefreshCw size={17} /></button></div>
    <p className="status-line" role="status">{status}</p>
    <p className="lab-note">A toy network with fixed neighbors and manual delivery. Real peer networks have changing connections, delays, and message-validation rules.</p>
  </div>;
}

const initialRecord = 'Alice pays Bob 5 ETH';
const bytesToHex = (value: ArrayBuffer) => Array.from(new Uint8Array(value), byte => byte.toString(16).padStart(2, '0')).join('');
const encodeMessage = (value: string) => new TextEncoder().encode(value);

export function HashLab({ onDiscover }: SimulationProps) {
  const [record, setRecord] = useState(initialRecord);
  const [digest, setDigest] = useState('');
  const [baseline, setBaseline] = useState('');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const discovered = useRef(false);
  const discoverRef = useRef(onDiscover);
  discoverRef.current = onDiscover;

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    setError('');
    async function calculate() {
      try {
        if (!globalThis.crypto?.subtle) throw new Error('Browser cryptography is unavailable. Open this app on localhost or HTTPS to run the hash experiment.');
        const [currentHash, originalHash] = await Promise.all([
          crypto.subtle.digest('SHA-256', encodeMessage(record)),
          crypto.subtle.digest('SHA-256', encodeMessage(initialRecord)),
        ]);
        if (cancelled) return;
        setDigest(bytesToHex(currentHash));
        setBaseline(bytesToHex(originalHash));
        if (record !== initialRecord && !discovered.current) {
          discovered.current = true;
          discoverRef.current('A tiny edit changes the fingerprint. A hash helps detect a changed record; it does not tell you who changed it or which version to trust.');
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'The browser could not calculate this hash. Try reloading the experiment.');
      } finally {
        if (!cancelled) setBusy(false);
      }
    }
    void calculate();
    return () => { cancelled = true; };
  }, [record]);

  const changed = !busy && !error && digest !== baseline;
  const changedDigits = changed ? Array.from(digest).filter((value, index) => value !== baseline[index]).length : 0;
  return <div className="fnd-lab">
    <div className="fnd-stage-heading"><span className="eyebrow">THE FINGERPRINT EXPERIMENT</span><span className="fnd-round mono">SHA-256</span></div>
    <div className="fnd-hash-flow">
      <div className="fnd-record"><label className="eyebrow" htmlFor="hash-record">01 / THE RECORD</label><textarea className="field mono" id="hash-record" value={record} onChange={event => setRecord(event.target.value)} maxLength={5000} spellCheck={false} /><div className="fnd-record-meta"><span>{encodeMessage(record).length} bytes in</span><button className="fnd-text-btn" onClick={() => setRecord(record === initialRecord ? 'Alice pays Bob 6 ETH' : initialRecord)}>{record === initialRecord ? 'Change one character' : 'Restore original'}</button></div></div>
      <div className="fnd-hash-machine" aria-hidden="true"><span /><Fingerprint size={40} /><span /><small className="mono">SHA-256</small></div>
      <div className={`fnd-hash-output ${changed ? 'is-changed' : ''}`} aria-busy={busy}>
        <div className="fnd-stage-heading"><span className="eyebrow">02 / THE FINGERPRINT</span><span className="mono">256 bits</span></div>
        <div className="fnd-digest mono" data-testid="hash-digest" aria-label={busy ? 'Calculating hash' : `Current SHA-256 hash: ${digest}`}>{busy ? <span className="fnd-calculating">Calculating…</span> : error ? <span className="fnd-calculating">Hash unavailable</span> : Array.from(digest).map((char, index) => <span className={changed && char !== baseline[index] ? 'fnd-digit-changed' : ''} key={index}>{char}</span>)}</div>
        <div className="fnd-record-meta"><span>32 bytes out, for any input length</span>{changed && <strong>{changedDigits}/64 digits changed</strong>}</div>
      </div>
    </div>
    {changed && <div className="fnd-baseline"><span className="eyebrow">ORIGINAL FINGERPRINT</span><code>{baseline}</code></div>}
    <p className="status-line" role={error ? 'alert' : 'status'}>{error || (busy ? 'Computing with your browser’s cryptography API…' : changed ? 'Same length. Different fingerprint. Highlighted digits differ from the original record.' : 'Edit the record above. The same exact bytes always produce the same fingerprint.')}</p>
    <p className="lab-note">This experiment computes real SHA-256 locally. Ethereum commonly uses Keccak-256, a different hash function. Neither function makes a record impossible to change.</p>
  </div>;
}

type Verification = 'valid' | 'invalid' | null;

export function SignatureLab({ onDiscover }: SimulationProps) {
  const [message, setMessage] = useState(initialRecord);
  const [keys, setKeys] = useState<CryptoKeyPair | null>(null);
  const [signature, setSignature] = useState<ArrayBuffer | null>(null);
  const [signedMessage, setSignedMessage] = useState('');
  const [verification, setVerification] = useState<Verification>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Create a temporary key pair to start. No wallet or real keys are needed.');
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  async function run(operation: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      if (!globalThis.crypto?.subtle) throw new Error('Browser cryptography is unavailable. Open this app on localhost or HTTPS to use the signing experiment.');
      await operation();
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : 'The cryptographic operation failed. Please try again.');
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  function generate() {
    void run(async () => {
      const generated = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
      if (!mounted.current) return;
      setKeys(generated);
      setSignature(null);
      setVerification(null);
      setStatus('Your temporary signing key stays in browser memory. Now sign the message.');
    });
  }

  function sign() {
    if (!keys || !message.trim()) return;
    void run(async () => {
      const result = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, keys.privateKey, encodeMessage(message));
      if (!mounted.current) return;
      setSignature(result);
      setSignedMessage(message);
      setVerification(null);
      setStatus('Signature created for these exact message bytes. Verify it, then try changing the message.');
    });
  }

  function verify() {
    if (!keys || !signature) return;
    void run(async () => {
      const valid = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, keys.publicKey, signature, encodeMessage(message));
      if (!mounted.current) return;
      setVerification(valid ? 'valid' : 'invalid');
      setStatus(valid ? 'Signature valid: this message matches the signature under the public key.' : 'Signature invalid: the saved signature does not authenticate this changed message.');
      onDiscover(valid ? 'Verification uses the public key. It checks a signature for exact message bytes; it does not prove a real-world identity or sufficient funds.' : 'Changing the message breaks verification. Only the holder of the signing key can produce a valid new signature for that key.');
    });
  }

  function changeMessage(value: string) {
    setMessage(value);
    setVerification(null);
    if (signature) setStatus(value === signedMessage ? 'Original signed message restored. Verify the saved signature again.' : 'Message changed. The saved signature still belongs to the original message; verify to test it.');
  }

  const messageChanged = signature !== null && message !== signedMessage;
  return <div className="fnd-lab">
    <div className="fnd-stage-heading"><span className="eyebrow">PROVE WHO AUTHORIZED IT</span><span className="fnd-round mono">LOCAL DEMO</span></div>
    <div className="fnd-key-pair">
      <div className={`fnd-key ${keys ? 'is-ready' : ''}`}><LockKeyhole size={26} /><div><strong>Signing key</strong><span>{keys ? 'In memory · non-exportable' : 'Not generated yet'}</span></div><span className="fnd-key-tag">PRIVATE</span></div>
      <div className={`fnd-key ${keys ? 'is-ready' : ''}`}><KeyRound size={26} /><div><strong>Verification key</strong><span>{keys ? 'Ready to check signatures' : 'Not generated yet'}</span></div><span className="fnd-key-tag">PUBLIC</span></div>
    </div>
    <div className="fnd-signing-record"><label htmlFor="signature-message" className="eyebrow">MESSAGE TO AUTHORIZE</label><textarea id="signature-message" className="field mono" value={message} onChange={event => changeMessage(event.target.value)} disabled={busy} spellCheck={false} maxLength={5000} /><div className="fnd-record-meta"><span>{messageChanged ? 'Modified since signing' : signature ? 'Matches the signed message' : 'Unsigned message'}</span>{signature && <button className="fnd-text-btn" disabled={busy} onClick={() => changeMessage(messageChanged ? signedMessage : `${signedMessage} (changed)`)}>{messageChanged ? 'Restore signed message' : 'Tamper with message'}</button>}</div></div>
    <div className={`fnd-signature-result ${verification === 'invalid' ? 'is-invalid' : verification === 'valid' ? 'is-valid' : ''}`}>
      {verification === 'valid' ? <ShieldCheck size={32} /> : verification === 'invalid' ? <ShieldX size={32} /> : <Fingerprint size={32} />}
      <div><span className="eyebrow">{verification === 'valid' ? 'SIGNATURE VALID' : verification === 'invalid' ? 'SIGNATURE INVALID' : signature ? 'SIGNATURE CREATED' : 'AWAITING SIGNATURE'}</span><code>{signature ? bytesToHex(signature) : 'Sign the message to create a verifiable proof.'}</code></div>
    </div>
    <div className="fnd-controls"><button className={`btn ${keys ? 'btn-secondary' : 'btn-primary'}`} onClick={generate} disabled={busy}>{keys ? 'New demo key pair' : 'Create demo key pair'}</button><button className={`btn ${keys && !signature ? 'btn-primary' : 'btn-secondary'}`} onClick={sign} disabled={!keys || busy || !message.trim()}>Sign message</button><button className={`btn ${signature ? 'btn-primary' : 'btn-secondary'}`} onClick={verify} disabled={!signature || busy}>Verify signature <Check size={16} /></button></div>
    <p className="status-line" role={error ? 'alert' : 'status'}>{error || (busy ? 'Running browser cryptography…' : status)}</p>
    <p className="lab-note">Real browser ECDSA with P-256 and SHA-256; Ethereum EOA signatures use secp256k1. Demo keys stay only in this page’s memory. This is a message-signing experiment, not an Ethereum transaction.</p>
  </div>;
}

type ToyBlock = { number: number; record: string; previousHash: string; hash: string };

function toyHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function hashBlock(block: Omit<ToyBlock, 'hash'>) {
  return toyHash(JSON.stringify([block.number, block.previousHash, block.record]));
}

function initialBlocks(): ToyBlock[] {
  const result: ToyBlock[] = [];
  for (const [index, record] of ['Alice → Bob: 5', 'Bob → Carol: 2', 'Carol → Dan: 1'].entries()) {
    const block = { number: index + 1, record, previousHash: result[index - 1]?.hash ?? '00000000' };
    result.push({ ...block, hash: hashBlock(block) });
  }
  return result;
}

export function BlockLab({ onDiscover }: SimulationProps) {
  const [blocks, setBlocks] = useState(initialBlocks);
  const [edited, setEdited] = useState(false);
  const [repaired, setRepaired] = useState(false);
  const firstBrokenLink = blocks.findIndex((block, index) => index > 0 && block.previousHash !== blocks[index - 1].hash);
  const broken = firstBrokenLink !== -1;

  function changeRecord(record: string) {
    setBlocks(current => {
      const first = { ...current[0], record };
      return [{ ...first, hash: hashBlock(first) }, ...current.slice(1)];
    });
    setEdited(true);
    setRepaired(false);
    onDiscover('The first block gets a new fingerprint, but the next block still points to the old one. Later history depends on that broken link.');
  }

  function repairLinks() {
    setBlocks(current => {
      const repairedBlocks: ToyBlock[] = [];
      for (const item of current) {
        const block = { ...item, previousHash: repairedBlocks.at(-1)?.hash ?? '00000000' };
        repairedBlocks.push({ ...block, hash: hashBlock(block) });
      }
      return repairedBlocks;
    });
    setRepaired(true);
    onDiscover('You rebuilt every hash link around a changed record. Hashes alone cannot decide which history the network should accept. Validation and consensus are still needed.');
  }

  return <div className="fnd-lab">
    <div className="fnd-stage-heading"><span className="eyebrow">A HISTORY THAT LEAVES TRACES</span><span className={`fnd-chain-state ${broken ? 'is-broken' : ''}`}>{broken ? <Link2Off size={14} /> : <Link2 size={14} />}{broken ? 'BROKEN HISTORY' : 'LINKS MATCH'}</span></div>
    <div className="fnd-chain">
      {blocks.map((block, index) => <div className="fnd-chain-item" key={block.number}>
        {index > 0 && <div className={`fnd-chain-arrow ${broken && index >= firstBrokenLink ? 'is-broken' : ''}`} aria-hidden="true">{broken && index === firstBrokenLink ? <Link2Off size={23} /> : <ArrowRight size={23} />}</div>}
        <article className={`fnd-block ${broken && index >= firstBrokenLink ? 'is-broken' : ''} ${index === 0 && edited ? 'is-edited' : ''}`} aria-label={`Block ${block.number}`}>
          <div className="fnd-block-head"><span className="mono">BLOCK 0{block.number}</span><span className="fnd-block-cube" aria-hidden="true">◇</span></div>
          <div className="fnd-block-record"><span className="eyebrow">RECORD</span><strong>{block.record || '(empty record)'}</strong></div>
          <div className="fnd-block-hash"><span>Previous hash</span><code className={broken && index === firstBrokenLink ? 'fnd-hash-mismatch' : ''}>{block.previousHash}</code></div>
          <div className="fnd-block-hash"><span>This hash</span><code>{block.hash}</code></div>
          <div className="fnd-block-status">{broken && index === firstBrokenLink ? 'Reference does not match' : broken && index > firstBrokenLink ? 'Depends on broken history' : index === 0 && edited ? 'Record fingerprint updated' : 'Reference matches'}</div>
        </article>
      </div>)}
    </div>
    <div className="fnd-block-edit"><label htmlFor="block-record" className="eyebrow">EDIT THE RECORD IN BLOCK 01</label><input id="block-record" className="field mono" value={blocks[0].record} onChange={event => changeRecord(event.target.value)} maxLength={80} /></div>
    <div className="fnd-controls"><button className="btn btn-secondary" onClick={() => changeRecord(blocks[0].record === 'Alice → Bob: 50' ? 'Alice → Bob: 5' : 'Alice → Bob: 50')}>Tamper with block 01</button><button className="btn btn-primary" onClick={repairLinks} disabled={!broken}>Recompute all links <RefreshCw size={16} /></button></div>
    <p className="status-line" role="status">{broken ? 'Block 02 points to the old hash. Its link is broken, and Block 03 inherits that broken history.' : repaired ? 'Every link matches again—even though the record changed. A consistent hash chain is not proof of an accepted or authorized history.' : 'Each block contains the previous block’s fingerprint. Change the first record and follow the effect.'}</p>
    <p className="lab-note">Uses an explicitly noncryptographic, 32-bit toy hash so the links are easy to inspect. Ethereum uses cryptographic hashes and consensus rules; this demo implements neither.</p>
  </div>;
}
