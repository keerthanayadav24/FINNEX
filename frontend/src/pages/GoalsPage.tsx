import React, { useState } from 'react';
import { Plus, Target, Calendar, CheckCircle2, AlertTriangle, Clock, HelpCircle, ArrowUpRight, IndianRupee, Trash2 } from 'lucide-react';
import { Goal, GoalStatus } from '../types';
import { goalService } from '../services/goalService';
import { formatCurrency } from '../utils/formatters';

interface GoalsPageProps {
  goals: Goal[];
  onRefresh: () => void;
}

export const GoalsPage: React.FC<GoalsPageProps> = ({ goals, onRefresh }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [isContribModalOpen, setIsContribModalOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState('EMERGENCY_FUND');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');

  // Contribution state
  const [contribAmount, setContribAmount] = useState('');
  const [contribNote, setContribNote] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await goalService.createGoal({
        name,
        type,
        targetAmount: parseFloat(targetAmount) || 0,
        currentAmount: currentAmount ? parseFloat(currentAmount) : 0,
        targetDate: targetDate ? new Date(targetDate).toISOString() : null,
      });

      setName('');
      setTargetAmount('');
      setCurrentAmount('');
      setTargetDate('');
      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to create goal');
    } finally {
      setLoading(false);
    }
  };

  const handleAddContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;
    setLoading(true);
    setError('');

    try {
      await goalService.addContribution(selectedGoal.id, {
        amount: parseFloat(contribAmount) || 0,
        note: contribNote,
      });

      setContribAmount('');
      setContribNote('');
      setIsContribModalOpen(false);

      // Refresh detailed view
      const updated = await goalService.getGoalById(selectedGoal.id);
      setSelectedGoal(updated);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to record contribution');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!confirm('Are you sure you want to delete this financial goal?')) return;
    try {
      await goalService.deleteGoal(id);
      if (selectedGoal?.id === id) setSelectedGoal(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete goal');
    }
  };

  const renderStatusBadge = (status?: GoalStatus) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
          </span>
        );
      case 'AHEAD':
        return (
          <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-semibold flex items-center gap-1.5">
            <ArrowUpRight className="w-3.5 h-3.5" /> Ahead of Target
          </span>
        );
      case 'ON_TRACK':
        return (
          <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> On Track
          </span>
        );
      case 'BEHIND':
        return (
          <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Behind Schedule
          </span>
        );
      case 'NO_TARGET_DATE':
        return (
          <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 text-xs font-medium">
            No Target Date
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-400 text-xs font-medium flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5" /> Not enough contribution history yet
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Financial Goals &amp; Planning</h1>
          <p className="text-sm text-slate-400">Track target dates, required monthly contributions, and completion forecasts</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-white font-semibold text-sm shadow-lg shadow-cyan-500/20"
        >
          <Plus className="w-4 h-4" /> Create Goal
        </button>
      </div>

      {/* Goal Cards Grid */}
      {goals.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-4 max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mx-auto">
            <Target className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white">No Active Financial Goals</h3>
          <p className="text-xs text-slate-400">
            Create a financial goal to track your savings target, required monthly contributions, and completion forecast.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {goals.map((g) => {
            const current = Number(g.currentAmount);
          const target = Number(g.targetAmount);
          const metrics = g.metrics;

          return (
            <div
              key={g.id}
              onClick={async () => {
                const detailed = await goalService.getGoalById(g.id);
                setSelectedGoal(detailed);
              }}
              className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-cyan-500/40 transition-all cursor-pointer space-y-4 shadow-xl group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Target className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base group-hover:text-cyan-300 transition-colors">{g.name}</h3>
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">{g.type || 'CUSTOM'}</span>
                  </div>
                </div>
                {renderStatusBadge(metrics?.status)}
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Progress ({metrics?.displayPercentage || 0}%)</span>
                  <span className="font-mono text-white font-semibold">
                    {formatCurrency(current)} / {formatCurrency(target)}
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                  <div
                    className={`h-full transition-all duration-500 ${
                      metrics?.status === 'COMPLETED'
                        ? 'bg-emerald-500'
                        : metrics?.status === 'AHEAD'
                        ? 'bg-cyan-400'
                        : metrics?.status === 'BEHIND'
                        ? 'bg-amber-500'
                        : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                    }`}
                    style={{ width: `${metrics?.displayPercentage || 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Metrics Summary Footer */}
              <div className="pt-3 border-t border-slate-800/60 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block">Required Monthly</span>
                  <span className="font-semibold text-slate-200 font-mono">
                    {metrics?.requiredMonthlyContribution !== null && metrics?.requiredMonthlyContribution !== undefined
                      ? `${formatCurrency(metrics.requiredMonthlyContribution)}/mo`
                      : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Target Date</span>
                  <span className="font-semibold text-slate-200">
                    {g.targetDate ? new Date(g.targetDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Flexible'}
                  </span>
                </div>
              </div>

              {/* Human Explanation */}
              {metrics?.explanation && (
                <p className="text-xs text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 leading-relaxed">
                  {metrics.explanation}
                </p>
              )}
            </div>
          );
        })}
      </div>
      )}

      {/* Goal Details Drawer / Modal */}
      {selectedGoal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white">{selectedGoal.name}</h3>
                <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider">{selectedGoal.type}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsContribModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-cyan-500 text-slate-950 font-semibold text-xs hover:bg-cyan-400 flex items-center gap-1.5"
                >
                  <IndianRupee className="w-4 h-4" /> Add Contribution
                </button>
                <button
                  onClick={() => handleDeleteGoal(selectedGoal.id)}
                  className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 text-xs"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Target Amount</span>
                <span className="text-lg font-bold text-white font-mono">{formatCurrency(selectedGoal.targetAmount)}</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Saved Amount</span>
                <span className="text-lg font-bold text-cyan-400 font-mono">{formatCurrency(selectedGoal.currentAmount)}</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Remaining</span>
                <span className="text-lg font-bold text-amber-400 font-mono">{formatCurrency(selectedGoal.metrics?.remainingAmount || 0)}</span>
              </div>
            </div>

            {/* Contribution History */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider text-slate-300">Contribution Audit History</h4>
              <div className="space-y-2">
                {selectedGoal.contributions && selectedGoal.contributions.length > 0 ? (
                  selectedGoal.contributions.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                      <div>
                        <div className="font-semibold text-white font-mono">{formatCurrency(c.amount)}</div>
                        <div className="text-slate-500">{c.note || (c.isInitial ? 'Opening saved balance' : 'Manual contribution')}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-slate-400">{new Date(c.date).toLocaleDateString()}</div>
                        {c.isInitial && <span className="text-[10px] text-cyan-400 font-semibold">Opening Balance</span>}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 text-center py-4">No contribution history recorded yet.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button onClick={() => setSelectedGoal(null)} className="px-5 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contribution Form Modal */}
      {isContribModalOpen && selectedGoal && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
            <h3 className="text-xl font-bold text-white">Record Contribution to {selectedGoal.name}</h3>

            {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">{error}</div>}

            <form onSubmit={handleAddContribution} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Contribution Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="5000"
                  value={contribAmount}
                  onChange={(e) => setContribAmount(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly savings transfer"
                  value={contribNote}
                  onChange={(e) => setContribNote(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsContribModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-sm font-semibold hover:bg-cyan-400">
                  {loading ? 'Saving...' : 'Record Contribution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Goal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
            <h3 className="text-xl font-bold text-white">Create Financial Goal</h3>

            {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">{error}</div>}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Goal Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Emergency Reserve"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Goal Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 text-sm"
                >
                  <option value="EMERGENCY_FUND">Emergency Fund</option>
                  <option value="VACATION">Vacation &amp; Travel</option>
                  <option value="EDUCATION">Education</option>
                  <option value="HOUSE">House Down Payment</option>
                  <option value="DEBT">Debt Repayment</option>
                  <option value="CUSTOM">Custom Goal</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Target Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="150000"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Initial Saved Balance (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={currentAmount}
                  onChange={(e) => setCurrentAmount(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Target Date (Optional)</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-sm font-semibold hover:bg-cyan-400">
                  {loading ? 'Creating...' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
