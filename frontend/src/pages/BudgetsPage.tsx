import React, { useState } from 'react';
import { Plus, PieChart, AlertTriangle, AlertCircle, ShieldCheck } from 'lucide-react';
import { Budget, Category } from '../types';
import { budgetService } from '../services/budgetService';
import { formatCurrency } from '../utils/formatters';

interface BudgetsPageProps {
  budgets: Budget[];
  categories: Category[];
  onRefresh: () => void;
}

export const BudgetsPage: React.FC<BudgetsPageProps> = ({ budgets, categories, onRefresh }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await budgetService.createBudget({
        name,
        categoryId: categoryId || undefined,
        amount: parseFloat(amount) || 0,
        period: 'MONTHLY',
        startDate: new Date().toISOString(),
      });
      setName('');
      setAmount('');
      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to create budget');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Budgets & Pacing</h1>
          <p className="text-sm text-slate-400">Category spending limits calculated directly from your recorded transactions</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-white font-semibold text-sm shadow-lg"
        >
          <Plus className="w-4 h-4" /> Add Budget
        </button>
      </div>

      {budgets.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-4 max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mx-auto">
            <PieChart className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white">No Active Budgets</h3>
          <p className="text-xs text-slate-400">
            Create category budgets to set spending allocations and track real-time usage from your transactions.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {budgets.map((b) => {
            const limit = Number(b.amount);
            const spent = b.spentAmount ?? 0;
            const remaining = b.remainingAmount ?? Math.max(0, limit - spent);
            const usagePct = b.usagePercentage ?? (limit > 0 ? Math.round((spent / limit) * 100) : 0);
            const isExceeded = b.isExceeded ?? (usagePct >= 100);
            const isWarning = b.isWarning ?? (usagePct >= 80 && usagePct < 100);

            return (
              <div key={b.id} className="p-6 rounded-2xl glass-card border border-slate-800/80 space-y-5 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
                        isExceeded
                          ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                          : isWarning
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                          : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                      }`}
                    >
                      <PieChart className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">{b.name}</h3>
                      <div className="text-xs text-slate-400">
                        {b.category && b.category.name ? b.category.name : 'All Spending Categories'}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                      isExceeded
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : isWarning
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}
                  >
                    {isExceeded ? 'Exceeded' : isWarning ? 'Near Limit' : 'On Track'}
                  </span>
                </div>

                {/* Progress Bar & Spending Breakdown */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      Spent: <span className="font-mono font-bold text-white">{formatCurrency(spent)}</span>
                    </span>
                    <span className="text-slate-400">
                      Limit: <span className="font-mono font-bold text-slate-200">{formatCurrency(limit)}</span>
                    </span>
                  </div>

                  <div className="w-full h-3 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isExceeded
                          ? 'bg-gradient-to-r from-rose-500 to-red-600'
                          : isWarning
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-500'
                          : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                      }`}
                      style={{ width: `${Math.min(100, usagePct)}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-400 font-mono">{usagePct}% used</span>
                    <span className={`font-mono font-semibold ${isExceeded ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {isExceeded
                        ? `Over by ${formatCurrency(spent - limit)}`
                        : `Remaining: ${formatCurrency(remaining)}`}
                    </span>
                  </div>
                </div>

                {/* Status Alert Note */}
                {isExceeded && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2 text-xs text-rose-300">
                    <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <span>Your spending in this category has exceeded the monthly budget limit.</span>
                  </div>
                )}
                {isWarning && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-xs text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>You have consumed {usagePct}% of your allocated budget for this period.</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
            <h3 className="text-xl font-bold text-white">Create Category Budget</h3>

            {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">{error}</div>}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Budget Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly Grocery Limit"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 text-sm"
                />
              </div>

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

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Budget Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="5000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-sm font-semibold hover:bg-cyan-400 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Create Budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
