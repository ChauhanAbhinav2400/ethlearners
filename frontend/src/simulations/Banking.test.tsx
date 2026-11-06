import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Banking } from './Banking';
import { Replication } from './Replication';

describe('banking source of truth', () => {
  it('moves a valid transfer through the website, backend, and both stored account records', async () => {
    const user = userEvent.setup();
    const discover = vi.fn();
    render(<Banking onDiscover={discover} />);
    expect(screen.getByTestId('bank-balance')).toHaveTextContent('₹1,000.00');
    await user.click(screen.getByRole('button', { name: 'Send ₹500' }));
    expect(screen.getByTestId('bank-balance')).toHaveTextContent('₹500.00');
    expect(screen.getByRole('status')).toHaveTextContent('Your friend received ₹500');
    await user.click(screen.getByRole('button', { name: 'Backend' }));
    expect(screen.getByText(/1 accepted transfers/)).toHaveTextContent('current balance ₹500');
    await user.click(screen.getByRole('button', { name: 'Database' }));
    const accounts = screen.getByRole('table', { name: 'Stored account balances' });
    expect(within(accounts).getByRole('row', { name: 'Alice 500 INR' })).toBeInTheDocument();
    expect(within(accounts).getByRole('row', { name: 'Bob 500 INR' })).toBeInTheDocument();
    expect(discover).toHaveBeenCalledWith(expect.stringContaining('website now shows its updated record'));
  });

  it('reflects an unauthorized database change when the learner returns to the website', async () => {
    const user = userEvent.setup();
    const discover = vi.fn();
    render(<Banking onDiscover={discover} />);
    await user.click(screen.getByRole('button', { name: 'Database' }));
    await user.click(screen.getByRole('button', { name: 'Simulate an unauthorized database change' }));
    expect(screen.getByTestId('database-balance')).toHaveTextContent('5,000');
    expect(screen.getByRole('row', { name: 'Bob 0 INR' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Website' }));
    expect(screen.getByTestId('bank-balance')).toHaveTextContent('₹5,000.00');
    expect(discover).toHaveBeenCalledWith(expect.stringContaining('unauthorized stored value appears in the app'));
  });

  it('rejects overspending without changing records or claiming a successful transfer', async () => {
    const user = userEvent.setup();
    const discover = vi.fn();
    render(<Banking onDiscover={discover} />);
    const amount = screen.getByRole('spinbutton', { name: 'Transfer amount in rupees' });
    await user.clear(amount);
    await user.type(amount, '1500');
    await user.click(screen.getByRole('button', { name: 'Send ₹1,500' }));
    expect(screen.getByRole('status')).toHaveTextContent('Transfer rejected: there is not enough balance. No records changed.');
    expect(screen.getByTestId('bank-balance')).toHaveTextContent('₹1,000.00');
    expect(discover).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Database' }));
    expect(screen.getByRole('row', { name: 'Alice 1,000 INR' })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: 'Bob 0 INR' })).toBeInTheDocument();
  });

  it('rejects fractional rupees in this whole-rupee model', async () => {
    const user = userEvent.setup();
    render(<Banking onDiscover={vi.fn()} />);
    const amount = screen.getByRole('spinbutton', { name: 'Transfer amount in rupees' });
    await user.clear(amount);
    await user.type(amount, '0.5');
    await user.click(screen.getByRole('button', { name: 'Send ₹0.5' }));
    expect(screen.getByRole('status')).toHaveTextContent('Enter a positive whole-rupee amount');
    expect(screen.getByTestId('bank-balance')).toHaveTextContent('₹1,000.00');
  });
});

describe('replicated records', () => {
  it('shows divergence and then agreement without presenting the copied change as authorized', async () => {
    const user = userEvent.setup();
    const discover = vi.fn();
    render(<Replication onDiscover={discover} />);
    expect(screen.getByRole('button', { name: 'Copy ₹5,000 to peers' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Change Node 2 to ₹5,000' }));
    expect(screen.getByTestId('node-balance-2')).toHaveTextContent('₹5,000');
    for (const node of [1, 3, 4, 5]) expect(screen.getByTestId(`node-balance-${node}`)).toHaveTextContent('₹1,000');
    expect(screen.getByText('Copies disagree')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Copy ₹5,000 to peers' }));
    for (const node of [1, 2, 3, 4, 5]) expect(screen.getByTestId(`node-balance-${node}`)).toHaveTextContent('₹5,000');
    expect(screen.getByText('Copies match · validity unproven')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('nobody proved that this change was authorized');
    expect(discover).toHaveBeenLastCalledWith(expect.stringContaining('Matching records do not prove a legitimate update'));
  });

  it('keeps an offline copy stale until it reconnects and receives another update', async () => {
    const user = userEvent.setup();
    render(<Replication onDiscover={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Take Node 5 offline' }));
    await user.click(screen.getByRole('button', { name: 'Change Node 2 to ₹5,000' }));
    await user.click(screen.getByRole('button', { name: 'Copy ₹5,000 to peers' }));
    for (const node of [1, 2, 3, 4]) expect(screen.getByTestId(`node-balance-${node}`)).toHaveTextContent('₹5,000');
    expect(screen.getByTestId('node-balance-5')).toHaveTextContent('₹1,000');
    expect(screen.getByRole('status')).toHaveTextContent('Node 5 is offline');
    await user.click(screen.getByRole('button', { name: 'Reconnect Node 5' }));
    expect(screen.getByTestId('node-balance-5')).toHaveTextContent('₹1,000');
    expect(screen.getByRole('button', { name: 'Copy ₹5,000 to peers' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Copy ₹5,000 to peers' }));
    expect(screen.getByTestId('node-balance-5')).toHaveTextContent('₹5,000');
    expect(screen.getByText('Copies match · validity unproven')).toBeInTheDocument();
  });
});
