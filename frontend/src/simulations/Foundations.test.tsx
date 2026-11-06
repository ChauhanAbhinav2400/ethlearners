import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BlockLab, HashLab, PeersLab, SignatureLab } from './Foundations';

beforeEach(() => { vi.stubGlobal('crypto', webcrypto); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('peer gossip', () => {
  it('delivers one hop at a time and catches up an isolated peer only after reconnecting', async () => {
    const user = userEvent.setup();
    const discover = vi.fn();
    render(<PeersLab onDiscover={discover} />);
    await user.click(screen.getByRole('button', { name: 'Disconnect peer C' }));
    await user.click(screen.getByRole('button', { name: /Gossip one hop/ }));
    expect(screen.getByTestId('peer-B')).toHaveTextContent('Message received');
    expect(screen.getByTestId('peer-D')).toHaveTextContent('Waiting for message');
    expect(screen.getByTestId('peer-C')).toHaveTextContent('Offline · no message');
    await user.click(screen.getByRole('button', { name: /Gossip one hop/ }));
    expect(screen.getByTestId('peer-D')).toHaveTextContent('Message received');
    expect(screen.getByTestId('peer-C')).toHaveTextContent('Offline · no message');
    await user.click(screen.getByRole('button', { name: 'Reconnect peer C' }));
    expect(screen.getByTestId('peer-C')).toHaveTextContent('Waiting for message');
    await user.click(screen.getByRole('button', { name: /Gossip one hop/ }));
    expect(screen.getByTestId('peer-C')).toHaveTextContent('Message received');
    expect(discover).toHaveBeenLastCalledWith(expect.stringContaining('does not prove that it is valid'));
  });

  it('retains an already received message when a peer disconnects', async () => {
    const user = userEvent.setup();
    render(<PeersLab onDiscover={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /Gossip one hop/ }));
    await user.click(screen.getByRole('button', { name: /Gossip one hop/ }));
    await user.click(screen.getByRole('button', { name: 'Disconnect peer C' }));
    expect(screen.getByTestId('peer-C')).toHaveTextContent('Offline · saved copy');
    await user.click(screen.getByRole('button', { name: 'Start a fresh message' }));
    expect(screen.getByTestId('peer-C')).toHaveTextContent('Offline · no message');
    expect(screen.getByTestId('peer-A')).toHaveTextContent('Message received');
  });
});

describe('browser hash experiment', () => {
  it('computes a real SHA-256 digest and shows the effect of an edit and restoration', async () => {
    const user = userEvent.setup();
    const discover = vi.fn();
    render(<HashLab onDiscover={discover} />);
    await waitFor(() => expect(screen.getByTestId('hash-digest').textContent).toMatch(/^[0-9a-f]{64}$/));
    const originalDigest = screen.getByTestId('hash-digest').textContent;
    await user.click(screen.getByRole('button', { name: 'Change one character' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Different fingerprint'));
    expect(screen.getByTestId('hash-digest').textContent).not.toBe(originalDigest);
    expect(discover).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: 'Restore original' }));
    await waitFor(() => expect(screen.getByTestId('hash-digest').textContent).toBe(originalDigest));
    fireEvent.change(screen.getByLabelText('01 / THE RECORD'), { target: { value: '' } });
    await waitFor(() => expect(screen.getByTestId('hash-digest').textContent).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'));
  });

  it('reports unavailable cryptography without inventing a digest', async () => {
    vi.stubGlobal('crypto', {});
    render(<HashLab onDiscover={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Browser cryptography is unavailable');
    expect(screen.getByTestId('hash-digest')).toHaveTextContent('Hash unavailable');
  });
});

describe('signature experiment', () => {
  it('verifies the original, rejects tampering, and verifies the restored message', async () => {
    const user = userEvent.setup();
    const discover = vi.fn();
    render(<SignatureLab onDiscover={discover} />);
    expect(screen.getByRole('button', { name: 'Sign message' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Create demo key pair' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign message' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Sign message' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Verify signature/ })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: /Verify signature/ }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Signature valid:'));
    await user.click(screen.getByRole('button', { name: 'Tamper with message' }));
    expect(screen.queryByText('SIGNATURE VALID')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Verify signature/ }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Signature invalid:'));
    expect(discover).toHaveBeenLastCalledWith(expect.stringContaining('Changing the message breaks verification'));
    await user.click(screen.getByRole('button', { name: 'Restore signed message' }));
    await user.click(screen.getByRole('button', { name: /Verify signature/ }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Signature valid:'));
    await user.click(screen.getByRole('button', { name: 'New demo key pair' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Verify signature/ })).toBeDisabled());
    expect(screen.getByText('AWAITING SIGNATURE')).toBeInTheDocument();
  });

  it('reports unavailable cryptography without claiming keys were generated', async () => {
    vi.stubGlobal('crypto', {});
    const user = userEvent.setup();
    render(<SignatureLab onDiscover={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Create demo key pair' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Browser cryptography is unavailable');
    expect(screen.getByRole('button', { name: 'Sign message' })).toBeDisabled();
  });
});

describe('hash-linked history', () => {
  it('reveals broken downstream history and can rebuild links around a changed record', async () => {
    const user = userEvent.setup();
    const discover = vi.fn();
    render(<BlockLab onDiscover={discover} />);
    expect(screen.getByRole('button', { name: /Recompute all links/ })).toBeDisabled();
    const firstBlock = screen.getByRole('article', { name: 'Block 1' });
    const secondBlock = screen.getByRole('article', { name: 'Block 2' });
    const originalHash = firstBlock.querySelectorAll('code')[1].textContent;
    await user.click(screen.getByRole('button', { name: 'Tamper with block 01' }));
    expect(within(firstBlock).getByText('Alice → Bob: 50')).toBeInTheDocument();
    expect(firstBlock.querySelectorAll('code')[1].textContent).not.toBe(originalHash);
    expect(secondBlock.querySelectorAll('code')[0].textContent).toBe(originalHash);
    expect(within(secondBlock).getByText('Reference does not match')).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Block 3' })).toHaveTextContent('Depends on broken history');
    await user.click(screen.getByRole('button', { name: /Recompute all links/ }));
    expect(secondBlock.querySelectorAll('code')[0].textContent).toBe(firstBlock.querySelectorAll('code')[1].textContent);
    expect(screen.getByText('LINKS MATCH')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('not proof of an accepted or authorized history');
    expect(discover).toHaveBeenLastCalledWith(expect.stringContaining('Validation and consensus are still needed'));
  });
});
