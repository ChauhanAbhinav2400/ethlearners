import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RollupLab, BridgeLab, OracleLab, SmartAccountLab } from './index';

describe('rollup settlement', () => {
  it('shows shared overhead per transfer and the effect of compression', async () => {
    const user = userEvent.setup();
    render(<RollupLab onDiscover={vi.fn()} />);
    expect(screen.getByText('24.0 units / transfer')).toBeInTheDocument();
    expect(screen.getByText('384 → 160 B')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('slider', { name: 'Transfers per batch' }), { target: { value: '8' } });
    expect(screen.getByText('12.0 units / transfer')).toBeInTheDocument();
    expect(screen.getByText('768 → 272 B')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Compress repeated fields' }));
    expect(screen.getByText('768 → 768 B')).toBeInTheDocument();
  });

  it('cannot sequence offline or publish without the underlying data', async () => {
    const user = userEvent.setup();
    render(<RollupLab onDiscover={vi.fn()} />);
    await user.click(screen.getByRole('checkbox', { name: 'Sequencer online' }));
    await user.click(screen.getByRole('button', { name: /Sequence batch/ }));
    expect(screen.getByRole('status', { name: 'Rollup experiment result' })).toHaveTextContent('sequencer is unavailable');
    expect(screen.queryByRole('button', { name: /Publish data to L1/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Sequencer online' }));
    await user.click(screen.getByRole('checkbox', { name: 'Batch data available to publish' }));
    await user.click(screen.getByRole('button', { name: /Sequence batch/ }));
    await user.click(screen.getByRole('button', { name: /Publish data to L1/ }));
    expect(screen.getByRole('status', { name: 'Rollup experiment result' })).toHaveTextContent('Publication blocked');
    expect(screen.getByText('Not published')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Batch data available to publish' }));
    await user.click(screen.getByRole('button', { name: /Publish data to L1/ }));
    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.getByText('Not accepted')).toBeInTheDocument();
    expect(screen.getByText('Not finalized')).toBeInTheDocument();
  });

  it('rejects an incorrect claim when an optimistic challenger acts in time', async () => {
    const user = userEvent.setup();
    render(<RollupLab onDiscover={vi.fn()} />);
    await user.click(screen.getByRole('checkbox', { name: 'Claim an incorrect result' }));
    await user.click(screen.getByRole('button', { name: /Sequence batch/ }));
    expect(screen.getByText('Bob: 24 credits')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Publish data to L1/ }));
    await user.click(screen.getByRole('button', { name: 'Challenge result' }));
    expect(screen.getByText('Rejected')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Rollup experiment result' })).toHaveTextContent('able to challenge in time');
    expect(screen.queryByRole('button', { name: /Advance L1 finality/ })).not.toBeInTheDocument();
  });

  it('makes the missing-challenger assumption visible instead of silently treating a bad claim as valid', async () => {
    const user = userEvent.setup();
    const discover = vi.fn();
    render(<RollupLab onDiscover={discover} />);
    await user.click(screen.getByRole('checkbox', { name: 'Claim an incorrect result' }));
    await user.click(screen.getByRole('button', { name: /Sequence batch/ }));
    await user.click(screen.getByRole('button', { name: /Publish data to L1/ }));
    await user.click(screen.getByRole('button', { name: 'Advance challenge clock' }));
    expect(screen.getByText('Not accepted')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Advance challenge clock' }));
    expect(screen.getByText('Unsafely accepted')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Rollup experiment result' })).toHaveTextContent('Unsafe outcome');
    expect(discover).toHaveBeenLastCalledWith(expect.stringContaining('without a challenge'));
    expect(screen.getByText('Not finalized')).toBeInTheDocument();
  });

  it('rejects an incorrect validity claim, and keeps acceptance separate from L1 finality for a correct one', async () => {
    const user = userEvent.setup();
    render(<RollupLab onDiscover={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Validity proof' }));
    await user.click(screen.getByRole('checkbox', { name: 'Claim an incorrect result' }));
    await user.click(screen.getByRole('button', { name: /Sequence batch/ }));
    await user.click(screen.getByRole('button', { name: /Publish data to L1/ }));
    await user.click(screen.getByRole('button', { name: /Verify toy proof/ }));
    expect(screen.getByRole('status', { name: 'Rollup experiment result' })).toHaveTextContent('verifier rejects');
    expect(screen.getByText('Rejected')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try another batch' }));
    await user.click(screen.getByRole('checkbox', { name: 'Claim an incorrect result' }));
    await user.click(screen.getByRole('button', { name: /Sequence batch/ }));
    await user.click(screen.getByRole('button', { name: /Publish data to L1/ }));
    await user.click(screen.getByRole('button', { name: /Verify toy proof/ }));
    expect(screen.getByText('Accepted')).toBeInTheDocument();
    expect(screen.getByText('Not finalized')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Advance L1 finality/ }));
    expect(screen.getByText('Finalized in model')).toBeInTheDocument();
  });
});

describe('bridge message acceptance', () => {
  it('rejects early, tampered, and replayed messages, then conserves originals through the return', async () => {
    const user = userEvent.setup();
    render(<BridgeLab onDiscover={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /Lock source tokens/ }));
    expect(screen.getByTestId('bridge-source')).toHaveTextContent('90');
    expect(screen.getByTestId('bridge-vault')).toHaveTextContent('10');
    expect(screen.getByTestId('bridge-wrapped')).toHaveTextContent(/^0/);
    await user.click(screen.getByRole('button', { name: /Validate & relay mint/ }));
    expect(screen.getByRole('status')).toHaveTextContent('requires finalized source evidence');
    await user.click(screen.getByRole('button', { name: 'Advance source finality' }));
    await user.click(screen.getByRole('checkbox', { name: 'Tamper with the relayed amount' }));
    await user.click(screen.getByRole('button', { name: /Validate & relay mint/ }));
    expect(screen.getByRole('status')).toHaveTextContent('different amount');
    expect(screen.getByTestId('bridge-wrapped')).toHaveTextContent(/^0/);
    await user.click(screen.getByRole('checkbox', { name: 'Tamper with the relayed amount' }));
    await user.click(screen.getByRole('button', { name: /Validate & relay mint/ }));
    expect(screen.getByTestId('bridge-wrapped')).toHaveTextContent(/^10/);
    await user.click(screen.getByRole('button', { name: 'Replay deposit message' }));
    expect(screen.getByRole('status')).toHaveTextContent('Replay rejected');
    expect(screen.getByTestId('bridge-wrapped')).toHaveTextContent(/^10/);
    await user.click(screen.getByRole('button', { name: /Burn wrapped tokens/ }));
    expect(screen.getByTestId('bridge-wrapped')).toHaveTextContent(/^0/);
    expect(screen.getByTestId('bridge-vault')).toHaveTextContent('10');
    await user.click(screen.getByRole('button', { name: /Validate & unlock/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Unlock rejected');
    await user.click(screen.getByRole('button', { name: 'Advance return settlement' }));
    await user.click(screen.getByRole('button', { name: /Validate & unlock/ }));
    expect(screen.getByTestId('bridge-source')).toHaveTextContent(/^100/);
    expect(screen.getByTestId('bridge-vault')).toHaveTextContent(/^0$/);
    expect(screen.getByTestId('bridge-wrapped')).toHaveTextContent(/^0/);
  });

  it('rejects a lock larger than the source balance without changing either chain', async () => {
    const user = userEvent.setup();
    render(<BridgeLab onDiscover={vi.fn()} />);
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Amount to bridge' }), { target: { value: '101' } });
    await user.click(screen.getByRole('button', { name: /Lock source tokens/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Lock rejected');
    expect(screen.getByTestId('bridge-source')).toHaveTextContent(/^100/);
    expect(screen.getByTestId('bridge-vault')).toHaveTextContent(/^0$/);
  });
});

describe('oracle observations', () => {
  it('resists one outlier with a median but exposes the failure of correlated reports', async () => {
    const user = userEvent.setup();
    render(<OracleLab onDiscover={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /Read into contract/ }));
    expect(screen.getByTestId('oracle-reading')).toHaveTextContent(/^100/);
    await user.click(screen.getByRole('button', { name: 'Manipulate publisher A' }));
    await user.click(screen.getByRole('button', { name: /Read into contract/ }));
    expect(screen.getByTestId('oracle-reading')).toHaveTextContent(/^600/);
    await user.click(screen.getByRole('button', { name: 'Three-source median' }));
    await user.click(screen.getByRole('button', { name: /Read into contract/ }));
    expect(screen.getByTestId('oracle-reading')).toHaveTextContent(/^102/);
    await user.click(screen.getByRole('button', { name: 'Correlate all reports' }));
    await user.click(screen.getByRole('button', { name: /Read into contract/ }));
    expect(screen.getByTestId('oracle-reading')).toHaveTextContent(/^600/);
    expect(screen.getByRole('status')).toHaveTextContent('agree on the wrong observation');
  });

  it('rejects stale data, retains the historical reading, and recovers only when selected reports are fresh', async () => {
    const user = userEvent.setup();
    render(<OracleLab onDiscover={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /Read into contract/ }));
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: 'Advance 30 seconds' }));
    await user.click(screen.getByRole('button', { name: /Read into contract/ }));
    expect(screen.getByRole('status')).toHaveTextContent('60-second freshness limit');
    expect(screen.getByTestId('oracle-reading')).toHaveTextContent(/^100/);
    expect(screen.getByText(/oldest underlying report is now 90s old/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Refresh report A' }));
    await user.click(screen.getByRole('button', { name: /Read into contract/ }));
    expect(screen.getByRole('status')).toHaveTextContent('accepted publisher A');
    await user.click(screen.getByRole('button', { name: 'Three-source median' }));
    await user.click(screen.getByRole('button', { name: /Read into contract/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Read rejected');
    await user.click(screen.getByRole('button', { name: 'Restore independent reports' }));
    await user.click(screen.getByRole('button', { name: /Read into contract/ }));
    expect(screen.getByRole('status')).toHaveTextContent('median is 100');
  });

  it('does not treat a missing observation as a valid zero price', async () => {
    const user = userEvent.setup();
    render(<OracleLab onDiscover={vi.fn()} />);
    await user.clear(screen.getByRole('spinbutton', { name: 'Publisher A reported price' }));
    await user.click(screen.getByRole('button', { name: /Read into contract/ }));
    expect(screen.getByRole('status')).toHaveTextContent('missing or nonpositive');
    expect(screen.getByTestId('oracle-reading')).toHaveTextContent('—');
  });
});

describe('programmable account policies', () => {
  it('separates sponsorship approval from execution and charges the sponsor on inclusion', async () => {
    const user = userEvent.setup();
    render(<SmartAccountLab onDiscover={vi.fn()} />);
    await user.click(screen.getByRole('checkbox', { name: 'Paymaster accepts sponsorship' }));
    await user.click(screen.getByRole('button', { name: 'Prepare user operation' }));
    await user.click(screen.getByRole('button', { name: /Validate user operation/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Sponsorship rejected');
    expect(screen.getByTestId('smart-alice')).toHaveTextContent('20 tokens');
    await user.click(screen.getByRole('checkbox', { name: 'Paymaster accepts sponsorship' }));
    await user.click(screen.getByRole('button', { name: /Validate user operation/ }));
    expect(screen.getByTestId('smart-nonce')).toHaveTextContent('0');
    await user.click(screen.getByRole('button', { name: /Bundle & submit/ }));
    expect(screen.getByTestId('smart-bob')).toHaveTextContent('0 tokens');
    await user.click(screen.getByRole('button', { name: /Include & execute/ }));
    expect(screen.getByTestId('smart-alice')).toHaveTextContent('15 tokens');
    expect(screen.getByTestId('smart-bob')).toHaveTextContent('5 tokens');
    expect(screen.getByTestId('smart-nonce')).toHaveTextContent('1');
    expect(screen.getByTestId('smart-sponsor-gas')).toHaveTextContent('4 gas credits');
    expect(screen.getByTestId('smart-account-gas')).toHaveTextContent('5 gas credits');
  });

  it('revalidates a sponsorship that changed after the initial simulation', async () => {
    const user = userEvent.setup();
    render(<SmartAccountLab onDiscover={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Prepare user operation' }));
    await user.click(screen.getByRole('button', { name: /Validate user operation/ }));
    await user.click(screen.getByRole('button', { name: /Bundle & submit/ }));
    await user.click(screen.getByRole('checkbox', { name: 'Paymaster accepts sponsorship' }));
    await user.click(screen.getByRole('button', { name: /Include & execute/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Revalidation failed');
    expect(screen.getByTestId('smart-alice')).toHaveTextContent('20 tokens');
    expect(screen.getByTestId('smart-nonce')).toHaveTextContent('0');
  });

  it('charges a self-funded included revert without moving application tokens', async () => {
    const user = userEvent.setup();
    render(<SmartAccountLab onDiscover={vi.fn()} />);
    await user.click(screen.getByRole('checkbox', { name: 'Request paymaster sponsorship' }));
    await user.click(screen.getByRole('checkbox', { name: 'Make the transfer call revert' }));
    await user.click(screen.getByRole('button', { name: 'Prepare user operation' }));
    await user.click(screen.getByRole('button', { name: /Validate user operation/ }));
    await user.click(screen.getByRole('button', { name: /Bundle & submit/ }));
    await user.click(screen.getByRole('button', { name: /Include & execute/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Included operation reverted');
    expect(screen.getByTestId('smart-alice')).toHaveTextContent('20 tokens');
    expect(screen.getByTestId('smart-bob')).toHaveTextContent('0 tokens');
    expect(screen.getByTestId('smart-nonce')).toHaveTextContent('1');
    expect(screen.getByTestId('smart-account-gas')).toHaveTextContent('4 gas credits');
    expect(screen.getByTestId('smart-sponsor-gas')).toHaveTextContent('5 gas credits');
  });

  it('requires the configured recovery quorum and delay before a new signer can authorize the same account', async () => {
    const user = userEvent.setup();
    render(<SmartAccountLab onDiscover={vi.fn()} />);
    await user.click(screen.getByText('What if Alice loses her signing key?'));
    await user.click(screen.getByRole('button', { name: 'Simulate lost owner key' }));
    await user.click(screen.getByRole('button', { name: 'Prepare user operation' }));
    await user.click(screen.getByRole('button', { name: /Validate user operation/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Authorization rejected');
    expect(screen.getByRole('button', { name: 'Start recovery delay' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /Guardian 1/ }));
    expect(screen.getByRole('button', { name: 'Start recovery delay' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /Guardian 2/ }));
    await user.click(screen.getByRole('button', { name: 'Start recovery delay' }));
    expect(screen.queryByRole('button', { name: 'Activate replacement signer' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Advance recovery delay' }));
    await user.click(screen.getByRole('button', { name: 'Activate replacement signer' }));
    expect(screen.getByText('Owner key 2')).toBeInTheDocument();
    expect(screen.getByText('account.demo.alice')).toBeInTheDocument();
    expect(screen.getByTestId('smart-alice')).toHaveTextContent('20 tokens');
    await user.click(screen.getByRole('button', { name: 'Prepare user operation' }));
    await user.click(screen.getByRole('button', { name: /Validate user operation/ }));
    await user.click(screen.getByRole('button', { name: /Bundle & submit/ }));
    await user.click(screen.getByRole('button', { name: /Include & execute/ }));
    expect(screen.getByTestId('smart-bob')).toHaveTextContent('5 tokens');
  });

  it('rejects an unrecognized signer even when sponsorship is available', async () => {
    const user = userEvent.setup();
    render(<SmartAccountLab onDiscover={vi.fn()} />);
    await user.click(screen.getByRole('checkbox', { name: 'Use the recognized owner signer' }));
    await user.click(screen.getByRole('button', { name: 'Prepare user operation' }));
    await user.click(screen.getByRole('button', { name: /Validate user operation/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Authorization rejected');
    expect(screen.queryByRole('button', { name: /Bundle & submit/ })).not.toBeInTheDocument();
    expect(screen.getByTestId('smart-sponsor-gas')).toHaveTextContent('5 gas credits');
  });

  it('does not retroactively erase authorization from a request prepared before key loss', async () => {
    const user = userEvent.setup();
    render(<SmartAccountLab onDiscover={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Prepare user operation' }));
    await user.click(screen.getByText('What if Alice loses her signing key?'));
    await user.click(screen.getByRole('button', { name: 'Simulate lost owner key' }));
    await user.click(screen.getByRole('button', { name: /Validate user operation/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Simulation passed');
    expect(screen.getByRole('button', { name: /Bundle & submit/ })).toBeEnabled();
  });
});
