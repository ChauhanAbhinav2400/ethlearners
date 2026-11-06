import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { advanceEpoch, calculateGas, ConsensusLab, EvmLab, GasLab, initialConsensus, initialTrace, NodeLab, stepTrace, WalletLab } from './EthereumLabs';

afterEach(cleanup);

describe('EIP-1559 teaching arithmetic', () => {
  const inputs = { limit: 50000, needed: 30000, base: 20, priority: 2, max: 30, revert: false };
  it('charges used gas, splits burn and tip, and leaves unused gas uncharged', () => {
    expect(calculateGas(inputs)).toMatchObject({ outcome: 'success', used: 30000, effective: 22, fee: 660000, burn: 600000, tip: 60000, unused: 20000 });
  });
  it('caps the actual tip when base plus priority exceeds the max fee', () => {
    expect(calculateGas({ ...inputs, max: 21 })).toMatchObject({ effective: 21, tip: 30000, fee: 630000 });
  });
  it('rejects an ineligible fee cap before charging gas', () => {
    expect(calculateGas({ ...inputs, max: 19 })).toMatchObject({ outcome: 'rejected', used: 0, fee: 0 });
    expect(calculateGas({ ...inputs, max: 1, priority: 2 })).toMatchObject({ outcome: 'rejected', fee: 0 });
  });
  it('distinguishes intrinsic rejection, top-level out of gas, and REVERT', () => {
    expect(calculateGas({ ...inputs, limit: 20000 })).toMatchObject({ outcome: 'rejected', fee: 0 });
    expect(calculateGas({ ...inputs, limit: 25000 })).toMatchObject({ outcome: 'out-of-gas', used: 25000, unused: 0, fee: 550000 });
    expect(calculateGas({ ...inputs, revert: true })).toMatchObject({ outcome: 'reverted', used: 30000, unused: 20000, fee: 660000 });
  });
  it('rejects malformed arithmetic rather than returning an invalid fee', () => {
    for (const base of [NaN, Infinity, -1, 0.5, 10001]) expect(calculateGas({ ...inputs, base }).outcome).toBe('rejected');
    expect(calculateGas({ ...inputs, needed: 100 })).toMatchObject({ outcome: 'rejected', fee: 0 });
  });
  it('rejects an empty input in the UI and can recover with a working preset', () => {
    render(<GasLab onDiscover={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Gas limit'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /run transaction/i }));
    expect(screen.getByRole('status').textContent).toContain('Enter non-negative whole numbers');
    fireEvent.click(screen.getByRole('button', { name: /try out of gas/i }));
    expect(screen.getByRole('status').textContent).toContain('OUT OF GAS');
    fireEvent.click(screen.getByRole('button', { name: /try revert/i }));
    expect(screen.getByRole('status').textContent).toContain('REVERTED');
  });
});

describe('deterministic EVM-like execution', () => {
  it('adds values, writes a memory word, then writes storage and halts', () => {
    let trace = initialTrace();
    trace = stepTrace(stepTrace(stepTrace(trace, false), false), false);
    expect(trace.stack).toEqual([5]);
    trace = stepTrace(stepTrace(trace, false), false);
    expect(trace.memory).toBe(5);
    expect(trace.stack).toEqual([]);
    while (!trace.halted) trace = stepTrace(trace, false);
    expect(trace).toMatchObject({ storage: 5, gas: 18, halted: true, reverted: false });
    expect(stepTrace(trace, false)).toBe(trace);
  });
  it('restores storage on revert without restoring the consumed gas', () => {
    let trace = initialTrace();
    for (let i = 0; i < 8; i++) trace = stepTrace(trace, true);
    expect(trace.storage).toBe(5);
    while (!trace.halted) trace = stepTrace(trace, true);
    expect(trace).toMatchObject({ storage: 0, memory: null, stack: [], gas: 20, halted: true, reverted: true });
  });
  it('lets a learner run, switch to the revert path, and reset the trace', () => {
    render(<EvmLab onDiscover={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /run to end/i }));
    expect(screen.getByTestId('storage-value').textContent).toBe('5');
    fireEvent.click(screen.getByRole('checkbox', { name: /end with revert/i }));
    fireEvent.click(screen.getByRole('button', { name: /run to end/i }));
    expect(screen.getByTestId('storage-value').textContent).toBe('0');
    expect(screen.getByRole('status').textContent).toContain('Consumed gas was not restored');
    fireEvent.click(screen.getByRole('button', { name: /reset trace/i }));
    expect(screen.getByRole('status').textContent).toContain('Ready');
  });
});

describe('simplified stake-weighted checkpoint transitions', () => {
  it('requires a later consecutive justified checkpoint to finalize a non-genesis checkpoint', () => {
    const first = advanceEpoch(initialConsensus(), { A: 70, B: 30 });
    expect(first.justified).toEqual({ epoch: 1, branch: 'A' });
    expect(first.finalized).toEqual({ epoch: 0, branch: 'root' });
    const second = advanceEpoch(first, { A: 70, B: 30 });
    expect(second.justified).toEqual({ epoch: 2, branch: 'A' });
    expect(second.finalized).toEqual({ epoch: 1, branch: 'A' });
  });
  it('keeps the threshold tied to total registered stake when participation falls', () => {
    const stalled = advanceEpoch(initialConsensus(), { A: 60, B: 0 });
    expect(stalled.epoch).toBe(1);
    expect(stalled.justified.epoch).toBe(0);
    expect(stalled.history[0].branch).toBeNull();
  });
  it('does not finalize across competing branches or a gap in epochs', () => {
    const first = advanceEpoch(initialConsensus(), { A: 70, B: 30 });
    const otherBranch = advanceEpoch(first, { A: 20, B: 80 });
    expect(otherBranch.finalized.epoch).toBe(0);
    const stalled = advanceEpoch(first, { A: 60, B: 40 });
    const resumed = advanceEpoch(stalled, { A: 70, B: 30 });
    expect(resumed.justified.epoch).toBe(3);
    expect(resumed.finalized.epoch).toBe(0);
    expect(advanceEpoch(resumed, { A: 70, B: 30 }).finalized.epoch).toBe(3);
  });
  it('does not justify a branch conflicting with a finalized checkpoint', () => {
    const finalized = advanceEpoch(advanceEpoch(initialConsensus(), { A: 70, B: 30 }), { A: 70, B: 30 });
    const invalidFork = advanceEpoch(finalized, { A: 0, B: 100 });
    expect(invalidFork.finalized).toEqual({ epoch: 1, branch: 'A' });
    expect(invalidFork.justified).toEqual({ epoch: 2, branch: 'A' });
  });
  it('changes head votes independently from the epoch and finality controls', () => {
    render(<ConsensusLab onDiscover={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Validator 1 vote B' }));
    expect(screen.getByTestId('justified-checkpoint').textContent).toBe('Genesis');
    fireEvent.click(screen.getByRole('button', { name: /advance one epoch/i }));
    expect(screen.getByTestId('justified-checkpoint').textContent).toBe('B1');
    expect(screen.getByTestId('finalized-checkpoint').textContent).toBe('Genesis');
    fireEvent.click(screen.getByRole('button', { name: /advance one epoch/i }));
    expect(screen.getByTestId('finalized-checkpoint').textContent).toBe('B1');
  });
  it('shows a missed proposal when the toy proposer is offline without finalizing a checkpoint', () => {
    render(<ConsensusLab onDiscover={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect validator 1' }));
    fireEvent.click(screen.getByRole('button', { name: /advance one slot/i }));
    expect(screen.getByText(/This slot has no proposed block/)).toBeTruthy();
    expect(screen.getByTestId('justified-checkpoint').textContent).toBe('Genesis');
    expect(screen.getByTestId('finalized-checkpoint').textContent).toBe('Genesis');
  });
});

describe('wallet and paired-node state boundaries', () => {
  it('invalidates a signature when the signed fields change', () => {
    render(<WalletLab onDiscover={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /sign transaction/i }));
    expect((screen.getByRole('button', { name: /submit to local pool/i }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.change(screen.getByLabelText(/transaction nonce/i), { target: { value: '8' } });
    expect((screen.getByRole('button', { name: /submit to local pool/i }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toContain('previous toy signature no longer matches');
  });
  it('keeps state unchanged while pending and updates the nonce only on inclusion', () => {
    render(<WalletLab onDiscover={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /sign transaction/i }));
    fireEvent.click(screen.getByRole('button', { name: /submit to local pool/i }));
    expect(screen.getByRole('status').textContent).toContain('balance and nonce have not changed');
    expect((screen.getByLabelText(/transaction nonce/i) as HTMLInputElement).value).toBe('7');
    fireEvent.click(screen.getByRole('button', { name: /include in toy block/i }));
    expect((screen.getByLabelText(/transaction nonce/i) as HTMLInputElement).value).toBe('8');
    expect(screen.getByRole('status').textContent).toContain('Inclusion is not protocol finality');
  });
  it('stalls local chain advancement without both clients', () => {
    render(<NodeLab onDiscover={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /disconnect execution/i }));
    fireEvent.click(screen.getByRole('button', { name: /process next payload/i }));
    expect(screen.getByRole('status').textContent).toContain('Stalled');
    expect(screen.getByText('head #1,042')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^connect execution/i }));
    fireEvent.click(screen.getByRole('button', { name: /process next payload/i }));
    expect(screen.getByText('head #1,043')).toBeTruthy();
  });
});
