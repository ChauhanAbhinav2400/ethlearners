import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { executionLessons } from '../../content/executionLessons';
import { ContractLab, ReceiptsLab, RpcLab, TxPoolLab } from './index';
import { checkAdmission, decodeUint, encodeSet, encodeUint, executeIncluded, initialAccounts, initialReceiptState, poolLabel, selectBlock, SET_SELECTOR, whole } from './models';
import type { PoolTx } from './models';

const alice = (nonce = 0, extra: Partial<PoolTx> = {}): PoolTx => ({ id: `a-${nonce}`, sender: 'Alice', nonce, value: 100000, maxFee: 30, tip: 2, signed: true, ...extra });
const bob = (extra: Partial<PoolTx> = {}): PoolTx => ({ ...alice(0), id: 'b-0', sender: 'Bob', value: 50000, maxFee: 35, tip: 6, ...extra });

describe('pool admission and block selection', () => {
  it('holds a future nonce without making it executable', () => {
    const accounts = initialAccounts(); const future = alice(2);
    expect(checkAdmission(future, accounts, [], 0)).toBeNull();
    expect(poolLabel(future, accounts)).toContain('waiting for nonce 0');
    expect(selectBlock([future], accounts).selected).toEqual([]);
  });
  it('checks signatures, up-front affordability, fee fields, and used nonces', () => {
    const accounts = initialAccounts();
    expect(checkAdmission(alice(0, { signed: false }), accounts, [], 0)).toContain('Invalid signature');
    expect(checkAdmission(alice(0, { sender: 'Carol' }), accounts, [], 0)).toContain('Insufficient balance');
    expect(checkAdmission(alice(0, { tip: 40 }), accounts, [], 0)).toContain('Invalid fee fields');
    accounts.Alice.nonce = 1;
    expect(checkAdmission(alice(0), accounts, [], 0)).toContain('Nonce already used');
  });
  it('keeps local policy separate from basic admission validity', () => {
    expect(checkAdmission(alice(), initialAccounts(), [], 0)).toBeNull();
    expect(checkAdmission(alice(), initialAccounts(), [], 4)).toContain('Local policy');
    expect(checkAdmission(alice(), initialAccounts(), [alice()], 0)).toContain('already holds');
  });
  it('parks a fee cap below the current base without charging or using a nonce', () => {
    const tx = bob({ maxFee: 15, tip: 2 }); const before = initialAccounts();
    expect(checkAdmission(tx, before, [], 0)).toBeNull();
    expect(poolLabel(tx, before)).toContain('fee below base');
    const result = selectBlock([tx], before);
    expect(result.accounts).toEqual(before); expect(result.fees).toBe(0);
  });
  it('chooses by effective tip but respects sender order and the two-transfer limit', () => {
    const before = initialAccounts();
    const result = selectBlock([alice(1, { tip: 8 }), alice(), bob()], before);
    expect(result.selected.map(tx => tx.id)).toEqual(['b-0', 'a-0']);
    expect(result.accounts.Alice.nonce).toBe(1); expect(result.accounts.Bob.nonce).toBe(1);
    expect(before.Alice.nonce).toBe(0);
    expect(result.accounts.Bob.balance).toBe(404000);
  });
  it('unlocks the next sender nonce within a block and rechecks the remaining balance', () => {
    const result = selectBlock([alice(1), alice()], initialAccounts());
    expect(result.selected.map(tx => tx.nonce)).toEqual([0, 1]);
    expect(result.accounts.Alice.balance).toBe(876000);
    const poor = initialAccounts(); poor.Alice.balance = 1000000;
    expect(selectBlock([alice(1), alice()], poor).selected).toHaveLength(1);
  });
  it('rejects invalid numeric input', () => {
    for (const text of ['', '-1', '1.5', '1e2', 'NaN', 'Infinity']) expect(whole(text)).toBeNull();
    expect(whole(' 42 ')).toBe(42);
    expect(checkAdmission(alice(0, { value: NaN }), initialAccounts(), [], 0)).toContain('whole numbers');
  });
  it('lets a learner fill a nonce gap and compare the two nodes’ policies', () => {
    render(<TxPoolLab onDiscover={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Alice · nonce 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send to Node A' }));
    expect(screen.getByRole('status')).toHaveTextContent('waiting for nonce 0');
    fireEvent.click(screen.getByRole('button', { name: 'Select & include from A' }));
    expect(screen.getByRole('status')).toHaveTextContent('No request is ready');
    fireEvent.click(screen.getByRole('button', { name: 'Alice · nonce 0' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send to Node A' }));
    fireEvent.click(screen.getByRole('button', { name: /Share A’s requests with B/ }));
    expect(screen.getByRole('status')).toHaveTextContent('B accepted 0');
    fireEvent.click(screen.getByRole('checkbox', { name: /B requires a 4 gwei tip/ }));
    fireEvent.click(screen.getByRole('button', { name: /Share A’s requests with B/ }));
    expect(screen.getByRole('status')).toHaveTextContent('B accepted 2');
    fireEvent.click(screen.getByRole('button', { name: 'Select & include from A' }));
    expect(screen.getByRole('status')).toHaveTextContent('Included Alice #0');
  });
  it('blocks propagation and direct delivery while B is disconnected', () => {
    render(<TxPoolLab onDiscover={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect B' }));
    fireEvent.click(screen.getByRole('button', { name: /Share A’s requests with B/ }));
    expect(screen.getByRole('status')).toHaveTextContent('connection to Node B is down');
    fireEvent.change(screen.getByLabelText('Deliver to'), { target: { value: 'B' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send to Node B' }));
    expect(screen.getByRole('status')).toHaveTextContent('Nothing was delivered');
  });
});

describe('included transaction outcomes', () => {
  it('commits a successful write and event while charging gas and consuming a nonce', () => {
    expect(executeIncluded(initialReceiptState(), 3, 50000, false)).toMatchObject({ status: '0x1', used: 42000, fee: 924000, logs: [{ name: 'Changed', value: 8 }], after: { count: 8, nonce: 1, balance: 9076000, block: 101 } });
  });
  it('rolls back writes and logs on REVERT without restoring gas or nonce', () => {
    expect(executeIncluded(initialReceiptState(), 3, 50000, true)).toMatchObject({ status: '0x0', used: 28000, logs: [], reason: 'revert', after: { count: 5, nonce: 1, balance: 9384000 } });
  });
  it('charges the whole top-level gas limit when execution runs out of gas', () => {
    expect(executeIncluded(initialReceiptState(), 3, 30000, false)).toMatchObject({ status: '0x0', used: 30000, logs: [], reason: 'out-of-gas', after: { count: 5, nonce: 1, balance: 9340000 } });
    expect(executeIncluded(initialReceiptState(), 3, 21000, false)).toMatchObject({ draft: null, used: 21000, status: '0x0' });
  });
  it('rejects an unaffordable or malformed attempt before inclusion', () => {
    const before = { ...initialReceiptState(), balance: 20 };
    expect(executeIncluded(before, 3, 50000, false)).toMatch(/Not included/);
    expect(before.nonce).toBe(0);
    expect(executeIncluded(initialReceiptState(), 3, 20000, false)).toMatch(/gas limit/);
  });
  it('makes success, revert, and out-of-gas consequences visible', () => {
    render(<ReceiptsLab onDiscover={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Try success' }));
    expect(screen.getByTestId('receipt-counter')).toHaveTextContent('8');
    fireEvent.click(screen.getByRole('button', { name: 'Try revert' }));
    expect(screen.getByTestId('receipt-counter')).toHaveTextContent('8');
    expect(screen.getByTestId('receipt-nonce')).toHaveTextContent('2');
    fireEvent.click(screen.getByRole('button', { name: 'Try out of gas' }));
    expect(screen.getByTestId('receipt-counter')).toHaveTextContent('8');
    expect(screen.getByTestId('receipt-nonce')).toHaveTextContent('3');
    expect(screen.getByRole('status')).toHaveTextContent('whole gas limit');
  });
});

describe('contract workflow', () => {
  function deploy() { fireEvent.click(screen.getByRole('button', { name: 'Build teaching model' })); fireEvent.click(screen.getByRole('button', { name: 'Deploy locally' })); }
  it('requires a valid build before deployment', () => {
    render(<ContractLab onDiscover={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Deploy locally' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Starting counter value'), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Build teaching model' }));
    expect(screen.getByRole('button', { name: 'Deploy locally' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('no larger than');
  });
  it('discards simulated writes and only commits the included transaction', () => {
    render(<ContractLab onDiscover={vi.fn()} />); deploy();
    fireEvent.click(screen.getByRole('button', { name: 'Simulate set()' }));
    expect(screen.getByTestId('contract-count')).toHaveTextContent('5');
    expect(screen.getByRole('status')).toHaveTextContent('temporary changes are discarded');
    fireEvent.click(screen.getByRole('button', { name: 'Send set() transaction' }));
    expect(screen.getByTestId('contract-count')).toHaveTextContent('5');
    fireEvent.click(screen.getByRole('button', { name: 'Include pending request' }));
    expect(screen.getByTestId('contract-count')).toHaveTextContent('8');
  });
  it('keeps the deployed rule when source changes and rejects a later invalid write', () => {
    render(<ContractLab onDiscover={vi.fn()} />); deploy();
    fireEvent.change(screen.getByLabelText('Largest value set() accepts'), { target: { value: '20' } });
    expect(screen.getByRole('button', { name: 'Deploy locally' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Value for set(uint256)'), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send set() transaction' }));
    fireEvent.click(screen.getByRole('button', { name: 'Include pending request' }));
    expect(screen.getByTestId('contract-count')).toHaveTextContent('5');
    expect(screen.getByRole('status')).toHaveTextContent('Included but reverted');
    fireEvent.click(screen.getByRole('button', { name: 'Build teaching model' }));
    fireEvent.click(screen.getByRole('button', { name: 'Deploy locally' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send set() transaction' }));
    fireEvent.click(screen.getByRole('button', { name: 'Include pending request' }));
    expect(screen.getByTestId('contract-count')).toHaveTextContent('15');
  });
});

describe('ABI words and frontend state', () => {
  it('encodes a selector plus an unsigned 32-byte word and decodes return data', () => {
    expect(encodeUint(8)).toBe(`0x${'0'.repeat(63)}8`);
    expect(encodeSet(8)).toBe(`${SET_SELECTOR}${'0'.repeat(63)}8`);
    expect(decodeUint(encodeUint(2n ** 255n))).toBe(2n ** 255n);
    expect(() => encodeUint(-1)).toThrow();
    expect(() => encodeUint(2n ** 256n)).toThrow();
    expect(() => encodeUint(Number.MAX_SAFE_INTEGER + 1)).toThrow();
    expect(() => decodeUint('0x08')).toThrow();
  });
  it('keeps submission, receipt inclusion, and indexed events separate', () => {
    render(<RpcLab onDiscover={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Send toy transaction' }));
    expect(screen.getByTestId('rpc-count')).toHaveTextContent('5');
    fireEvent.click(screen.getByRole('button', { name: 'Poll receipt' }));
    expect(screen.getByRole('status')).toHaveTextContent('response is null');
    fireEvent.click(screen.getByRole('button', { name: 'Include pending transaction' }));
    expect(screen.getByTestId('rpc-count')).toHaveTextContent('8');
    expect(screen.getByTestId('rpc-lag')).toHaveTextContent('1');
    const events = screen.getByLabelText('Indexed events');
    expect(events).toHaveTextContent('No matching event');
    fireEvent.click(screen.getByRole('button', { name: 'Poll receipt' }));
    expect(screen.getByRole('status')).toHaveTextContent('reports inclusion');
    fireEvent.click(screen.getByRole('button', { name: 'Scan next block' }));
    expect(within(events).getByText('Changed(8)')).toBeInTheDocument();
    expect(screen.getByTestId('rpc-lag')).toHaveTextContent('0');
  });
  it('lets an indexer filter out events and backfill them after changing the filter', () => {
    render(<RpcLab onDiscover={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Send toy transaction' }));
    fireEvent.click(screen.getByRole('button', { name: 'Include pending transaction' }));
    fireEvent.change(screen.getByLabelText('Contract address filter'), { target: { value: '0x000000000000000000000000000000000000c002' } });
    fireEvent.click(screen.getByRole('button', { name: 'Scan next block' }));
    expect(screen.getByLabelText('Indexed events')).toHaveTextContent('No matching event');
    fireEvent.change(screen.getByLabelText('Contract address filter'), { target: { value: '0x000000000000000000000000000000000000c001' } });
    expect(screen.getByTestId('rpc-lag')).toHaveTextContent('1');
    fireEvent.click(screen.getByRole('button', { name: 'Scan next block' }));
    expect(screen.getByLabelText('Indexed events')).toHaveTextContent('Changed(8)');
  });
  it('includes failed requests without changing the value or producing an event', () => {
    render(<RpcLab onDiscover={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('New value for set(uint256)'), { target: { value: '101' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send toy transaction' }));
    fireEvent.click(screen.getByRole('button', { name: 'Include pending transaction' }));
    expect(screen.getByTestId('rpc-count')).toHaveTextContent('5');
    expect(screen.getByRole('status')).toHaveTextContent('status 0x0');
    fireEvent.click(screen.getByRole('button', { name: 'Scan next block' }));
    expect(screen.getByLabelText('Indexed events')).toHaveTextContent('No matching event');
    expect(screen.getByTestId('rpc-lag')).toHaveTextContent('0');
  });
  it('resets cleanly on remount', () => {
    const view = render(<RpcLab onDiscover={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Send toy transaction' }));
    fireEvent.click(screen.getByRole('button', { name: 'Include pending transaction' }));
    view.unmount(); render(<RpcLab onDiscover={vi.fn()} />);
    expect(screen.getByTestId('rpc-count')).toHaveTextContent('5');
    expect(screen.getByTestId('rpc-lag')).toHaveTextContent('0');
    expect(screen.getByRole('button', { name: 'Poll receipt' })).toBeDisabled();
  });
});

describe('new execution and developer lessons', () => {
  it('includes complete teaching content, examples, and reasons for related links', () => {
    expect(executionLessons.map(lesson => lesson.id)).toEqual(['transaction-pool', 'receipts-and-logs', 'contract-workshop', 'frontend-rpc']);
    for (const lesson of executionLessons) {
      expect(lesson.sources.length).toBeGreaterThanOrEqual(3);
      expect(lesson.intro.length).toBeGreaterThanOrEqual(3);
      expect(lesson.deepDive.length).toBeGreaterThanOrEqual(5);
      for (const detail of lesson.deepDive) expect(detail.example?.length).toBeGreaterThan(30);
      for (const related of lesson.related) expect(lesson.relatedWhy?.[related]).toBeTruthy();
      for (const question of [lesson.question, lesson.check]) { expect(question.options[question.answer]).toBeTruthy(); expect(question.explanation.length).toBeGreaterThan(40); }
    }
  });
});
