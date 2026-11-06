export type BankState = { balance: number; friendBalance: number; transfers: number; tampered: boolean; message: string };
export const initialBankState: BankState = { balance: 1000, friendBalance: 0, transfers: 0, tampered: false, message: 'Your app is connected. Try sending ₹500 to a friend.' };
export function bankReducer(state: BankState, action: { type: 'transfer'; amount: number } | { type: 'tamper' } | { type: 'reset' }): BankState {
  if (action.type === 'reset') return initialBankState;
  if (action.type === 'tamper') return { ...state, balance: 5000, tampered: true, message: 'The stored balance is now ₹5,000. The website reads and displays that same record.' };
  if (!Number.isInteger(action.amount) || action.amount <= 0) return { ...state, message: 'Enter a positive whole-rupee amount.' };
  if (action.amount > state.balance) return { ...state, message: 'Transfer rejected: there is not enough balance. No records changed.' };
  return { ...state, balance: state.balance - action.amount, friendBalance: state.friendBalance + action.amount, transfers: state.transfers + 1, message: `Transfer complete. The backend updated both records. Your friend received ₹${action.amount.toLocaleString('en-IN')}.` };
}
