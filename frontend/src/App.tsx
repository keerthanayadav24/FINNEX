import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from './layouts/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { InsightsPage } from './pages/InsightsPage';
import { ActionsPage } from './pages/ActionsPage';
import { FinancialHealthPage } from './pages/FinancialHealthPage';
import { ScenarioPlannerPage } from './pages/ScenarioPlannerPage';
import { FinancialTimelinePage } from './pages/FinancialTimelinePage';
import { AccountsPage } from './pages/AccountsPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { BudgetsPage } from './pages/BudgetsPage';
import { GoalsPage } from './pages/GoalsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { SettingsPage } from './pages/SettingsPage';

import { AuthPage } from './pages/AuthPage';
import { getDevUserId, setDevUserId } from './services/api';
import { userService } from './services/userService';
import { accountService } from './services/accountService';
import { transactionService } from './services/transactionService';
import { categoryService } from './services/categoryService';
import { budgetService } from './services/budgetService';
import { goalService } from './services/goalService';
import { notificationService } from './services/notificationService';

import { User, Account, Transaction, Category, Budget, Goal, Notification } from './types';
import { RefreshCw, AlertCircle } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = Boolean(getDevUserId());

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [u, accs, txs, cats, bdgs, gls, notifs] = await Promise.all([
        userService.getMe(),
        accountService.getAccounts(),
        transactionService.getTransactions(),
        categoryService.getCategories(),
        budgetService.getBudgets(),
        goalService.getGoals(),
        notificationService.getNotifications(),
      ]);

      setUser(u);
      setAccounts(accs);
      setTransactions(Array.isArray(txs) ? txs : txs.transactions);
      setCategories(cats);
      setBudgets(bdgs);
      setGoals(gls);
      setNotifications(notifs);
    } catch (err: any) {
      console.error('Failed to load FINNEX data:', err);
      setError(err.message || 'Could not connect to backend API engine');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    } else {
      setUser(null);
      setLoading(false);
    }
  }, [isAuthenticated, loadData]);

  const handleSignOut = () => {
    setDevUserId(null);
    setUser(null);
    setAccounts([]);
    setTransactions([]);
    setCategories([]);
    setBudgets([]);
    setGoals([]);
    setNotifications([]);
  };

  if (!isAuthenticated) {
    return <AuthPage onAuthSuccess={loadData} />;
  }

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 p-4">
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 animate-spin">
          <RefreshCw className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold">Loading FINNEX...</h2>
        <p className="text-sm text-slate-500 mt-1">Syncing your financial dashboard &amp; accounts</p>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 p-4">
        <div className="max-w-md w-full p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Authentication / Connection Error</h2>
          <p className="text-sm text-slate-400">{error}</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={handleSignOut}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700"
            >
              Back to Sign In
            </button>
            <button
              onClick={loadData}
              className="px-6 py-2 rounded-xl bg-cyan-500 text-slate-950 font-semibold text-xs hover:bg-cyan-400"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      user={user}
      onRefresh={loadData}
      onSignOut={handleSignOut}
      notificationCount={notifications.length}
    >
      {activeTab === 'dashboard' && <DashboardPage accounts={accounts} transactions={transactions} onRefresh={loadData} user={user} />}
      {activeTab === 'insights' && <InsightsPage />}
      {activeTab === 'actions' && <ActionsPage />}
      {activeTab === 'health' && <FinancialHealthPage />}
      {activeTab === 'scenarios' && <ScenarioPlannerPage />}
      {activeTab === 'timeline' && <FinancialTimelinePage />}
      {activeTab === 'accounts' && <AccountsPage accounts={accounts} onRefresh={loadData} />}
      {activeTab === 'transactions' && (
        <TransactionsPage
          transactions={transactions}
          accounts={accounts}
          categories={categories}
          onRefresh={loadData}
        />
      )}
      {activeTab === 'budgets' && <BudgetsPage budgets={budgets} categories={categories} onRefresh={loadData} />}
      {activeTab === 'goals' && <GoalsPage goals={goals} onRefresh={loadData} />}
      {activeTab === 'notifications' && <NotificationsPage notifications={notifications} />}
      {activeTab === 'settings' && <SettingsPage user={user} onSignOut={handleSignOut} />}
    </AppLayout>
  );
}

export default App;
