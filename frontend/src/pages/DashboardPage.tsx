import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Wallet, ArrowUpRight, ArrowDownRight, ShieldCheck, PieChart, TrendingUp, RefreshCw, AlertCircle } from 'lucide-react';
import { Account, Transaction, User } from '../types';
import { dashboardService, DashboardSummary, CategorySpending, SpendingTrendItem } from '../services/dashboardService';
import { formatCurrency, formatSignedCurrency } from '../utils/formatters';
import { DateRangePicker } from '../components/DateRangePicker';
import { DateRange, getDateRangeBounds } from '../utils/dateRanges';

interface DashboardPageProps {
  accounts: Account[];
  transactions: Transaction[];
  onRefresh?: () => Promise<void>;
  user?: User | null;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ accounts, transactions, onRefresh, user }) => {
  const [dateRange, setDateRange] = useState<DateRange>({ preset: 'THIS_MONTH' });
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [categorySpending, setCategorySpending] = useState<CategorySpending | null>(null);
  const [spendingTrend, setSpendingTrend] = useState<SpendingTrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };
  const displayName = user?.name || 'Rohan';

  const fetchDashboardData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const bounds = getDateRangeBounds(dateRange);

      const [sumData, catData, trendData] = await Promise.all([
        dashboardService.getSummary(bounds.startDate, bounds.endDate),
        dashboardService.getSpendingByCategory(bounds.startDate, bounds.endDate),
        dashboardService.getSpendingTrend(bounds.startDate, bounds.endDate),
      ]);

      setSummary(sumData);
      setCategorySpending(catData);
      setSpendingTrend(trendData);

      if (isManualRefresh && onRefresh) {
        await onRefresh();
      }
    } catch (err: any) {
      console.error('Dashboard data load error:', err);
      setError(err.message || 'Failed to refresh dashboard metrics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange, onRefresh]);

  useEffect(() => {
    fetchDashboardData(false);
  }, [transactions, accounts, dateRange]);

  const handleRefresh = () => {
    if (refreshing) return;
    fetchDashboardData(true);
  };

  const filteredTransactions = useMemo(() => {
    const bounds = getDateRangeBounds(dateRange);
    const sTime = new Date(bounds.startDate).getTime();
    const eTime = new Date(bounds.endDate).getTime();
    return transactions.filter((tx) => {
      const tTime = new Date(tx.date).getTime();
      return tTime >= sTime && tTime <= eTime;
    });
  }, [transactions, dateRange]);

  const totalIncome = summary?.totalIncome ?? 0;
  const totalExpense = summary?.totalExpense ?? 0;
  const netChange = summary?.netChange ?? 0;

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-slate-800 relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none rounded-2xl overflow-hidden"></div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <ShieldCheck className="w-4 h-4" /> Smart Wealth Overview
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              {getGreeting()}, {displayName} 👋
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-xl">
              Real-time summary of your income, expenses, and accounts across all connected financial sources.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <DateRangePicker value={dateRange} onChange={setDateRange} />
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 text-xs font-semibold text-slate-300 hover:text-cyan-400 transition-all disabled:opacity-50"
              title="Update latest metrics"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-xs text-rose-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-6 rounded-2xl glass-card border border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Income</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-4 font-mono">
            {formatCurrency(totalIncome)}
          </div>
          <div className="text-xs text-slate-400 mt-1">Excludes transfers</div>
        </div>

        <div className="p-6 rounded-2xl glass-card border border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">TOTAL SPENDING</span>
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-4 font-mono">
            {formatCurrency(totalExpense)}
          </div>
          <div className="text-xs text-slate-400 mt-1">Across your recorded transactions</div>
        </div>

        <div className="p-6 rounded-2xl glass-card border border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Net Change</span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${netChange >= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}>
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-bold mt-4 font-mono ${netChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatSignedCurrency(netChange)}
          </div>
          <div className="text-xs text-slate-400 mt-1">Income minus Expenses</div>
        </div>

        <div className="p-6 rounded-2xl glass-card border border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Accounts</span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-4">{accounts.length} Accounts</div>
          <div className="text-xs text-slate-400 mt-1">Synced &amp; Protected</div>
        </div>
      </div>

      {/* Grid: Spending Breakdown & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Category Spending Breakdown (1 column) */}
        <div className="p-6 rounded-2xl glass-card border border-slate-800/80 space-y-6">
          <div className="border-b border-slate-800/80 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <PieChart className="w-5 h-5 text-cyan-400" /> Spending Breakdown
              </h3>
              <p className="text-xs text-slate-400">Expense allocation by category</p>
            </div>
          </div>

          <div className="space-y-4">
            {categorySpending?.categories && categorySpending.categories.length > 0 ? (
              categorySpending.categories.map((cat) => (
                <div key={cat.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-200">{cat.name}</span>
                    <span className="text-slate-400 font-mono">{formatCurrency(cat.amount)} ({cat.percentage}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                      style={{ width: `${cat.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-500 text-center py-6">No categorized expenses recorded yet.</div>
            )}
          </div>
        </div>

        {/* Recent Transactions List (2 columns) */}
        <div className="lg:col-span-2 p-6 rounded-2xl glass-card border border-slate-800/80 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white">Recent Transactions</h3>
              <p className="text-xs text-slate-400">Normalized source-agnostic ledger</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {filteredTransactions.length} Recorded
            </span>
          </div>

          <div className="space-y-3">
            {filteredTransactions.length > 0 ? (
              filteredTransactions.slice(0, 5).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-slate-800/60 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${tx.type === 'INCOME'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : tx.type === 'EXPENSE'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                        }`}
                    >
                      {tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '-' : '⇄'}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white flex items-center gap-2">
                        {tx.merchant || tx.description || 'Transaction'}
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 uppercase font-mono">
                          {tx.source}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{new Date(tx.date).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{tx.category?.name || 'Uncategorized'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`text-sm font-bold font-mono ${tx.type === 'INCOME'
                          ? 'text-emerald-400'
                          : tx.type === 'EXPENSE'
                            ? 'text-rose-400'
                            : 'text-cyan-400'
                        }`}
                    >
                      {formatSignedCurrency(tx.type === 'EXPENSE' ? -Math.abs(Number(tx.amount)) : Math.abs(Number(tx.amount)))}
                    </div>
                    <div className="text-[11px] text-slate-500">{tx.account?.name || 'Account'}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-500 text-center py-10 border border-dashed border-slate-800 rounded-xl">
                No recent transactions recorded yet. Record a transaction to start tracking your finances.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
