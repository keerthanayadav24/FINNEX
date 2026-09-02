import React, { useState } from 'react';
import { Plus, Wallet, Trash2, Edit3, ShieldAlert } from 'lucide-react';
import { Account, AccountType } from '../types';
import { accountService } from '../services/accountService';
import { formatCurrency } from '../utils/formatters';

interface AccountsPageProps {
  accounts: Account[];
  onRefresh: () => void;
}

export const AccountsPage: React.FC<AccountsPageProps> = ({ accounts, onRefresh }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('CHECKING');
  const [balance, setBalance] = useState('');
  const [currency, setCurrency] = useState('INR');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleOpenCreate = () => {
    setEditingAccount(null);
    setName('');
    setType('CHECKING');
    setBalance('0');
    setCurrency('INR');
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (account: Account) => {
    setEditingAccount(account);
    setName(account.name);
    setType(account.type);
    setBalance(String(account.currentBalance));
    setCurrency(account.currency || 'INR');
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (editingAccount) {
        await accountService.updateAccount(editingAccount.id, { name, type, currency });
      } else {
        await accountService.createAccount({
          name,
          type,
          currency,
          currentBalance: parseFloat(balance) || 0,
        });
      }

      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to save account');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete account '${name}'?`)) return;

    try {
      await accountService.deleteAccount(id);
      onRefresh();
    } catch (err: any) {
      alert(`Safe Deletion Protection: ${err.message}`);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Financial Accounts</h1>
          <p className="text-sm text-slate-400">Asset and Liability accounts with transaction safety constraints</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm shadow-lg shadow-cyan-500/20 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Account
        </button>
      </div>

      {/* Account Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map((acc) => {
          const isLiability = ['CREDIT_CARD', 'LOAN'].includes(acc.type);

          return (
            <div
              key={acc.id}
              className="p-6 rounded-2xl glass-card border border-slate-800/80 relative group hover:border-slate-700 transition-all space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                      isLiability
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                    }`}
                  >
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{acc.name}</h3>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 uppercase font-mono">
                      {acc.type} • {isLiability ? 'Liability' : 'Asset'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleOpenEdit(acc)}
                    className="p-1.5 text-slate-400 hover:text-white transition-colors"
                    title="Edit Account"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(acc.id, acc.name)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
                    title="Delete Account"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-400 font-medium">Current Balance</div>
                <div className={`text-2xl font-bold mt-1 font-mono ${isLiability ? 'text-rose-400' : 'text-cyan-400'}`}>
                  {formatCurrency(acc.currentBalance)}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                <span>{acc._count?.transactions || 0} Transactions linked</span>
                <span className="text-slate-400">Synced &amp; Protected</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Account Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
            <h3 className="text-xl font-bold text-white">{editingAccount ? 'Edit Account' : 'Add Financial Account'}</h3>

            {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Account Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Primary Checking"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Account Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as AccountType)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 text-sm"
                >
                  <option value="CHECKING">Checking (Asset)</option>
                  <option value="SAVINGS">Savings (Asset)</option>
                  <option value="CASH">Cash (Asset)</option>
                  <option value="INVESTMENT">Investment (Asset)</option>
                  <option value="CREDIT_CARD">Credit Card (Liability)</option>
                  <option value="LOAN">Loan (Liability)</option>
                </select>
              </div>

              {!editingAccount && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Initial Balance (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="50000"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 text-sm"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-sm font-semibold hover:bg-cyan-400 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editingAccount ? 'Update Account' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
