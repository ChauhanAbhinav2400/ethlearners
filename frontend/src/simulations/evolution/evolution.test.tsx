import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProofOfWorkLab, MergeLab, UpgradeLab, StandardsLab } from './index';
import { applyTokenAction, effectivePrice, GWEI, initialTokenState, nextBaseFee, searchWork } from './models';
import { evolutionLessons } from '../../content/evolutionLessons';

describe('proof-of-work history experiment', () => {
  it('finds checkable toy work and bounds every batch', () => {
    const attempts = searchWork(5, 1, 0, 512);
    const winner = attempts.at(-1)!;
    expect(winner.meetsTarget).toBe(true);
    expect(winner.hash).toBeLessThan(2 ** 28);
    expect(attempts.every((attempt, index) => attempt.nonce === index)).toBe(true);
    expect(searchWork(5, 3, 0, 99999).length).toBeLessThanOrEqual(512);
    expect(searchWork(5, 1, winner.nonce, 1)[0]).toEqual(winner);
  });

  it('rejects an overspend even when the candidate has a qualifying proof', () => {
    render(<ProofOfWorkLab onDiscover={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Try sending 50' }));
    fireEvent.click(screen.getByRole('button', { name: 'Try up to 512' }));
    expect(screen.getByRole('button', { name: 'Validate candidate' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Validate candidate' }));
    expect(screen.getByRole('status')).toHaveTextContent('Proof passes. Transfer fails');
    fireEvent.change(screen.getByLabelText('Work difficulty'), { target: { value: '2' } });
    expect(screen.getByTestId('pow-attempts')).toHaveTextContent('0');
    expect(screen.getByRole('button', { name: 'Validate candidate' })).toBeDisabled();
  });
});

describe('Merge continuity', () => {
  it('keeps execution state across the transition and separates a proposal from inclusion', () => {
    render(<MergeLab onDiscover={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Mine and validate toy block' }));
    expect(screen.getByTestId('merge-alice')).toHaveTextContent('9');
    expect(screen.getByTestId('merge-counter')).toHaveTextContent('8');
    fireEvent.click(screen.getByRole('button', { name: 'Apply historical Merge' }));
    expect(screen.getByRole('button', { name: 'Record attestations' })).toBeDisabled();
    expect(screen.getByTestId('merge-alice')).toHaveTextContent('9');
    expect(screen.getByTestId('merge-bob')).toHaveTextContent('1');
    expect(screen.getByTestId('merge-counter')).toHaveTextContent('8');
    fireEvent.click(screen.getByRole('button', { name: 'Propose next toy block' }));
    expect(screen.getByTestId('merge-counter')).toHaveTextContent('8');
    fireEvent.click(screen.getByRole('button', { name: 'Validate and select proposal' }));
    expect(screen.getByTestId('merge-alice')).toHaveTextContent('8');
    expect(screen.getByTestId('merge-bob')).toHaveTextContent('2');
    expect(screen.getByTestId('merge-counter')).toHaveTextContent('9');
    expect(screen.getByRole('status')).toHaveTextContent('inclusion is still not finality');
    expect(screen.getByRole('button', { name: 'Record attestations' })).toBeEnabled();
  });
});

describe('EIP-1559 and proposal lifecycle', () => {
  it('uses exact integer adjustment, minimum increase, unchanged target and fee caps', () => {
    expect(nextBaseFee(20n * GWEI, 2_000_000n, 1_000_000n)).toBe(22_500_000_000n);
    expect(nextBaseFee(20n * GWEI, 0n, 1_000_000n)).toBe(17_500_000_000n);
    expect(nextBaseFee(20n * GWEI, 1_000_000n, 1_000_000n)).toBe(20n * GWEI);
    expect(nextBaseFee(1n, 1_000_001n, 1_000_000n)).toBe(2n);
    expect(effectivePrice(20n * GWEI, 21n * GWEI, 2n * GWEI)).toBe(21n * GWEI);
    expect(effectivePrice(20n * GWEI, 19n * GWEI, 2n * GWEI)).toBeNull();
    expect(effectivePrice(20n * GWEI, 21n * GWEI, 22n * GWEI)).toBeNull();
  });

  it('moves demand into the next block fee and preserves the historical comparison', () => {
    render(<UpgradeLab onDiscover={vi.fn()} />);
    expect(screen.getByTestId('effective-price')).toHaveTextContent('22 gwei');
    fireEvent.change(screen.getByRole('slider', { name: 'Block demand' }), { target: { value: '200' } });
    expect(screen.getByTestId('next-base-fee')).toHaveTextContent('22.5');
    expect(screen.getByTestId('effective-price')).toHaveTextContent('22 gwei');
    fireEvent.click(screen.getByRole('button', { name: 'Produce this block' }));
    expect(screen.getByTestId('effective-price')).toHaveTextContent('24.5 gwei');
    fireEvent.change(screen.getByLabelText('Maximum fee · whole gwei per gas'), { target: { value: '21' } });
    expect(screen.getByTestId('effective-price')).toHaveTextContent('Not eligible');
    fireEvent.click(screen.getByRole('button', { name: 'Before EIP-1559' }));
    expect(screen.getByTestId('effective-price')).toHaveTextContent('21 gwei');
    fireEvent.click(screen.getByRole('button', { name: /Final/ }));
    expect(screen.getByText(/This status alone does not prove activation/)).toBeInTheDocument();
  });
});

describe('token standards and bounded permissions', () => {
  it('preserves balances on a failed spend and replaces approvals without moving tokens', () => {
    const initial = initialTokenState();
    const failed = applyTokenAction(initial, { kind: 'transferFrom', amount: 10 });
    expect(failed.ok).toBe(false); expect(failed.state).toBe(initial);
    const approved = applyTokenAction(initial, { kind: 'approve', amount: 10 }).state;
    expect(approved.alice).toBe(100); expect(approved.vault).toBe(0);
    const spent = applyTokenAction(approved, { kind: 'transferFrom', amount: 6 }).state;
    expect(spent).toMatchObject({ alice: 94, vault: 6, allowance: 4 });
    const revoked = applyTokenAction(spent, { kind: 'approve', amount: 0 }).state;
    expect(revoked).toMatchObject({ alice: 94, vault: 6, allowance: 0 });
    expect(revoked.alice + revoked.bob + revoked.vault).toBe(100);
    expect(applyTokenAction(initial, { kind: 'transfer', amount: 0 }).state.events[0]).toBe('Transfer(Alice, Bob, 0)');
  });

  it('connects a standard interface, enforces allowance, and emits distinct events', () => {
    render(<StandardsLab onDiscover={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Custom names' }));
    fireEvent.click(screen.getByRole('button', { name: 'Read token through wallet' }));
    expect(screen.getByRole('status')).toHaveTextContent('cannot read it without an adapter');
    expect(screen.getByRole('button', { name: 'Alice: transfer to Bob' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Standard methods' }));
    fireEvent.click(screen.getByRole('button', { name: 'Read token through wallet' }));
    fireEvent.click(screen.getByRole('button', { name: 'Vault: transferFrom Alice' }));
    expect(screen.getByRole('status')).toHaveTextContent('Approve an allowance first');
    fireEvent.click(screen.getByRole('button', { name: 'Alice: approve Vault' }));
    expect(screen.getByTestId('token-alice')).toHaveTextContent('100');
    expect(screen.getByTestId('token-allowance')).toHaveTextContent('10 LEARN');
    fireEvent.click(screen.getByRole('button', { name: 'Vault: transferFrom Alice' }));
    expect(screen.getByTestId('token-alice')).toHaveTextContent('90');
    expect(screen.getByTestId('token-vault')).toHaveTextContent('10');
    expect(screen.getByTestId('token-allowance')).toHaveTextContent('0 LEARN');
    expect(screen.getByText('Approval(Alice, Vault, 10)')).toBeInTheDocument();
    expect(screen.getByText('Transfer(Alice, Vault, 10)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'ERC-721 · individual IDs' }));
    fireEvent.click(screen.getByRole('button', { name: 'Owner: send #42 to Bob' }));
    expect(screen.getByTestId('nft-owner')).toHaveTextContent('Bob');
  });
});

describe('evolution lesson content', () => {
  it('connects all four complete lessons to distinct interactive labs and reviewable sources', () => {
    expect(evolutionLessons.map(lesson => lesson.simulation)).toEqual(['pow', 'merge', 'upgrades', 'standards']);
    for (const lesson of evolutionLessons) {
      expect(lesson.intro.length).toBeGreaterThan(1);
      expect(lesson.boundary.length).toBeGreaterThan(40);
      expect(lesson.deepDive.length).toBeGreaterThan(2);
      expect(lesson.sources.every(item => new URL(item.url).protocol === 'https:')).toBe(true);
      expect(lesson.related.every(id => !!lesson.relatedWhy?.[id])).toBe(true);
      for (const question of [lesson.question, lesson.check]) expect(question.options[question.answer]).toBeTruthy();
    }
  });
});
