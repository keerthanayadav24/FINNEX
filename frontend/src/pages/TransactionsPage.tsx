import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Trash2, Pencil, ArrowUpRight, ArrowDownRight, ArrowLeftRight, FileSpreadsheet, Sparkles, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Transaction, Account, Category, TransactionType, TransactionSource } from '../types';
import { transactionService } from '../services/transactionService';
import { categoryService } from '../services/categoryService';
import { CsvImportModal } from '../components/CsvImportModal';
import { formatCurrency, formatSignedCurrency } from '../utils/formatters';
import { DateRangePicker } from '../components/DateRangePicker';
import { DateRange, getDateRangeBounds } from '../utils/dateRanges';

interface TransactionsPageProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  onRefresh: () => void;
}

export const TransactionsPage: React.FC<TransactionsPageProps> = ({
  transactions,
  accounts,
  categories,
  onRefresh,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Search, Filter, Sorting & Pagination State
  const [dateRange, setDateRange] = useState<DateRange>({ preset: 'THIS_MONTH' });
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterSource, setFilterSource] = useState('ALL');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Form State for Quick Entry / Editing
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [transferAccountId, setTransferAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [merchant, setMerchant] = useState('');
  const [source, setSource] = useState<TransactionSource>('MANUAL');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [txDate, setTxDate] = useState<string>('');
  const [suggestedCategoryName, setSuggestedCategoryName] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Auto-category suggestion when merchant changes
  useEffect(() => {
    if (merchant && merchant.trim().length >= 3 && !editingTransaction) {
      categoryService.suggestCategory(merchant).then((res) => {
        if (res && res.categoryId) {
          setCategoryId(res.categoryId);
          setSuggestedCategoryName(res.categoryName);
        } else {
          setSuggestedCategoryName(null);
        }
      });
    } else {
      setSuggestedCategoryName(null);
    }
  }, [merchant, editingTransaction]);

  // Handlers for modal
  const handleOpenCreate = () => {
    setEditingTransaction(null);
    setAccountId(accounts[0]?.id || '');
    setTransferAccountId('');
    setAmount('');
    setType('EXPENSE');
    setCategoryId(categories[0]?.id || '');
    setMerchant('');
    setSource('MANUAL');
    setDescription('');
    setTagsInput('');
    setTxDate(new Date().toISOString().split('T')[0]);
    setError('');
    setSuccessMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tx: Transaction) => {
    setEditingTransaction(tx);
    setAccountId(tx.accountId);
    setTransferAccountId(tx.transferAccountId || '');
    setAmount(Math.abs(Number(tx.amount)).toString());
    setType(tx.type);
    setCategoryId(tx.categoryId || categories[0]?.id || '');
    setMerchant(tx.merchant || '');
    setSource(tx.source || 'MANUAL');
    setDescription(tx.description || '');
    setTagsInput((tx.tags || []).join(', '));
    setTxDate(new Date(tx.date).toISOString().split('T')[0]);
    setError('');
    setSuccessMsg('');
    setIsModalOpen(true);
  };

  // Client-side filtering & sorting for smooth UX
  const filteredTransactions = transactions
    .filter((t) => {
      const bounds = getDateRangeBounds(dateRange);
      const tTime = new Date(t.date).getTime();
      const sTime = new Date(bounds.startDate).getTime();
      const eTime = new Date(bounds.endDate).getTime();
      if (tTime < sTime || tTime > eTime) return false;

      if (filterType !== 'ALL' && t.type !== filterType) return false;
      if (filterSource !== 'ALL' && t.source !== filterSource) return false;
      if (search.trim()) {
        const query = search.toLowerCase();
        const m = (t.merchant || '').toLowerCase();
        const d = (t.description || '').toLowerCase();
        if (!m.includes(query) && !d.includes(query)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        const dA = new Date(a.date).getTime();
        const dB = new Date(b.date).getTime();
        return sortOrder === 'desc' ? dB - dA : dA - dB;
      } else {
        const aA = Number(a.amount);
        const aB = Number(b.amount);
        return sortOrder === 'desc' ? aB - aA : aA - aB;
      }
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const parsedTags = tagsInput
        ? tagsInput
            .split(',')
            .map((t) => t.trim().toLowerCase().replace(/^#/, ''))
            .filter(Boolean)
        : [];

      const dateObj = txDate ? new Date(txDate).toISOString() : new Date().toISOString();

      const payload = {
        accountId: accountId || accounts[0]?.id,
        transferAccountId: type === 'TRANSFER' ? transferAccountId || null : null,
        amount: parseFloat(amount) || 0,
        type,
        categoryId: type === 'TRANSFER' ? null : categoryId || null,
        merchant: merchant || null,
        date: dateObj,
        source,
        description: description || null,
        tags: parsedTags,
      };

      if (editingTransaction) {
        await transactionService.updateTransaction(editingTransaction.id, payload);
        setSuccessMsg('Transaction updated successfully.');
      } else {
        await transactionService.createTransaction(payload);
        setSuccessMsg('Transaction recorded successfully.');
      }

      setTimeout(() => {
        setIsModalOpen(false);
        setEditingTransaction(null);
        onRefresh();
      }, 400);
    } catch (err: any) {
      if (editingTransaction) {
        setError("We couldn't update this transaction. Please try again.");
      } else {
        setError(err.message || 'Failed to record transaction');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this transaction?')) return;
    try {
      await transactionService.deleteTransaction(id);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete transaction');
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Transactions History</h1>
          <p className="text-sm text-slate-400">Search, filter, and manage your normalized financial ledger</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-cyan-400" /> Import CSV
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/20 transition-all"
          >
            <Plus className="w-4 h-4" /> Quick Record
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-2xl glass-card border border-slate-800/80 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search merchant or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <DateRangePicker value={dateRange} onChange={setDateRange} />

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-medium text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Types</option>
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
              <option value="TRANSFER">Transfer</option>
            </select>

            {/* Source Filter */}
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-medium text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Sources</option>
              <option value="MANUAL">Manual</option>
              <option value="CSV">CSV</option>
            </select>

            {/* Sort Order */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split('-');
                setSortBy(sb as any);
                setSortOrder(so as any);
              }}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-medium text-slate-200 focus:outline-none"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount-desc">Amount: High to Low</option>
              <option value="amount-asc">Amount: Low to High</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-2xl glass-card border border-slate-800/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/80 border-b border-slate-800/80 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Transaction</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Source</th>
                <th className="px-6 py-4">Account</th>
                <th className="px-6 py-4">Category / Tags</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{tx.merchant || tx.description || 'Transaction'}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{new Date(tx.date).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          tx.type === 'INCOME'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : tx.type === 'EXPENSE'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                        }`}
                      >
                        {tx.type === 'INCOME' ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : tx.type === 'EXPENSE' ? (
                          <ArrowDownRight className="w-3 h-3" />
                        ) : (
                          <ArrowLeftRight className="w-3 h-3" />
                        )}
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px] border border-slate-700">
                        {tx.source}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      <div>{tx.account?.name || 'Account'}</div>
                      {tx.type === 'TRANSFER' && tx.transferAccount && (
                        <div className="text-[11px] text-cyan-400 font-mono">➜ {tx.transferAccount.name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-300">{tx.category?.name || 'Uncategorized'}</div>
                      {tx.tags && tx.tags.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
                          {tx.tags.map((tag) => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td
                      className={`px-6 py-4 text-right font-bold font-mono ${
                        tx.type === 'INCOME' ? 'text-emerald-400' : tx.type === 'EXPENSE' ? 'text-rose-400' : 'text-cyan-400'
                      }`}
                    >
                      {formatSignedCurrency(tx.type === 'EXPENSE' ? -Math.abs(Number(tx.amount)) : Math.abs(Number(tx.amount)))}
                    </td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleOpenEdit(tx)}
                        className="p-1.5 text-slate-400 hover:text-cyan-400 transition-colors"
                        title="Edit Transaction"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(tx.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No transactions match your current search or filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CSV Import Modal */}
      <CsvImportModal
        accounts={accounts}
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onSuccess={onRefresh}
      />

      {/* Transaction Entry & Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white">
              {editingTransaction ? 'Edit Transaction' : 'Record Transaction'}
            </h3>

            {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">{error}</div>}
            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Transaction Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as TransactionType)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 text-sm"
                  >
                    <option value="EXPENSE">Expense</option>
                    <option value="INCOME">Income</option>
                    <option value="TRANSFER">Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Merchant / Payee</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Swiggy, Uber, Netflix"
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 text-sm"
                  />
                  {suggestedCategoryName && (
                    <div className="text-[11px] text-cyan-400 flex items-center gap-1 mt-1 font-medium">
                      <Sparkles className="w-3 h-3" /> Auto-suggested category: {suggestedCategoryName}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Primary Account</label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 text-sm"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatCurrency(acc.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              {type === 'TRANSFER' && (
                <div>
                  <label className="block text-xs font-semibold text-cyan-400 uppercase mb-1">Destination Account (Transfer To)</label>
                  <select
                    value={transferAccountId}
                    onChange={(e) => setTransferAccountId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-cyan-800 text-white focus:outline-none focus:border-cyan-500 text-sm"
                  >
                    <option value="">Select destination account...</option>
                    {accounts
                      .filter((acc) => acc.id !== accountId)
                      .map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({formatCurrency(acc.currentBalance)})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="500"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 text-sm"
                  />
                </div>

                {type !== 'TRANSFER' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Category</label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 text-sm"
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Transaction Date</label>
                <input
                  type="date"
                  required
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Dinner with team"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Tags (Comma-separated)</label>
                <input
                  type="text"
                  placeholder="food, delivery, team"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingTransaction(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-sm font-semibold hover:bg-cyan-400 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editingTransaction ? 'Save Changes' : 'Record Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
