import React, { useState, useEffect } from 'react';
import {
  Zap,
  AlertTriangle,
  Target,
  Repeat,
  CreditCard,
  Calendar,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  TrendingDown,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { actionService, ActionEnginePayload } from '../services/actionService';
import { formatCurrency } from '../utils/formatters';

export const ActionsPage: React.FC = () => {
  const [data, setData] = useState<ActionEnginePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null);

  const loadActions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await actionService.getActions();
      setData(res);
    } catch (err: any) {
      console.error('Failed to load Action Center data:', err);
      setError(err.message || 'Could not load your Action Center recommendations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActions();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-100">
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 animate-spin">
          <RefreshCw className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold">Checking your spending &amp; payment reminders...</h3>
        <p className="text-xs text-slate-500 mt-1">Reviewing budget pacing, upcoming bills, &amp; goal recommendations</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4 max-w-lg mx-auto my-12">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold text-white">Action Center Temporarily Unavailable</h3>
        <p className="text-xs text-slate-400">{error}</p>
        <button onClick={loadActions} className="px-5 py-2 rounded-xl bg-cyan-500 text-slate-950 font-semibold text-xs hover:bg-cyan-400">
          Check Again
        </button>
      </div>
    );
  }

  const hasAnyActions = data.recommendations.length > 0 || data.subscriptions.length > 0 || data.billReminders.length > 0;

  const getPriorityLabel = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return 'Needs Attention';
      case 'MEDIUM':
        return 'Important';
      default:
        return 'Good Opportunity';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="w-7 h-7 text-cyan-400" /> Action Center
          </h1>
          <p className="text-sm text-slate-400">Simple things you can do to stay on top of your money.</p>
        </div>
        <button
          onClick={loadActions}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Check Again
        </button>
      </div>

      {!hasAnyActions ? (
        <div className="p-12 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-4 max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white">You're on track!</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            No budget overspends, goal shortfalls, or unexpected charges need your attention right now.
          </p>
        </div>
      ) : (
        <>
          {/* Priority Actions */}
          {data.recommendations.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" /> Priority Actions
              </h2>

              <div className="space-y-4">
                {data.recommendations.map((action) => {
                  const isExpanded = expandedActionId === action.id;

                  return (
                    <div
                      key={action.id}
                      className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-4 shadow-xl"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
                              action.severity === 'HIGH'
                                ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                : action.severity === 'MEDIUM'
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                            }`}
                          >
                            {action.type === 'OVERSPEND_NUDGE' ? (
                              <AlertTriangle className="w-5 h-5" />
                            ) : action.type === 'GOAL_RECOMMENDATION' ? (
                              <Target className="w-5 h-5" />
                            ) : action.type === 'SUBSCRIPTION_AUDIT' ? (
                              <Repeat className="w-5 h-5" />
                            ) : (
                              <TrendingDown className="w-5 h-5" />
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-white text-base">{action.title}</h3>
                              <span
                                className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                                  action.severity === 'HIGH'
                                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                    : action.severity === 'MEDIUM'
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                    : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                                }`}
                              >
                                {getPriorityLabel(action.severity)}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 mt-1 leading-relaxed">{action.summary}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => setExpandedActionId(isExpanded ? null : action.id)}
                          className="p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white text-xs flex items-center gap-1"
                          title="View Details"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Action Suggestion */}
                      <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-cyan-300 leading-relaxed font-medium">
                        💡 {action.actionText}
                      </div>

                      {/* Expandable Context Details */}
                      {isExpanded && (
                        <div className="pt-3 border-t border-slate-800/80 space-y-3">
                          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Additional Context</h4>
                          <p className="text-xs text-slate-300 leading-relaxed">{action.explanation}</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {action.evidence.map((ev, i) => (
                              <div key={i} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                                <span className="text-[11px] text-slate-500 block">{ev.label}</span>
                                <span className="font-semibold text-white">{ev.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recurring Payments & What's Coming Up */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Recurring Payments */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Repeat className="w-5 h-5 text-cyan-400" /> Recurring Payments
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  These payments appear regularly in your spending. Take a quick look to make sure you're still happy with them.
                </p>
              </div>

              <div className="space-y-3">
                {data.subscriptions.length > 0 ? (
                  data.subscriptions.map((sub) => (
                    <div key={sub.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white">{sub.merchant}</span>
                        <span className="font-mono font-semibold text-cyan-400">{formatCurrency(sub.averageAmount)} / month</span>
                      </div>
                      <p className="text-[11px] text-slate-400">Appears to be a regular monthly payment.</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 text-center py-4">No recurring monthly payments detected yet.</p>
                )}
              </div>
            </div>

            {/* What's Coming Up */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-400" /> What's Coming Up
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Based on your past spending, these payments usually happen around this time.
                </p>
              </div>

              <div className="space-y-3">
                {data.billReminders.length > 0 ? (
                  data.billReminders.map((bill) => (
                    <div key={bill.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white">{bill.merchant}</span>
                        <span className="font-mono font-semibold text-amber-400">{formatCurrency(bill.expectedAmount)}</span>
                      </div>
                      <p className="text-[11px] text-slate-400">{bill.expectedDateWindow}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 text-center py-4">No upcoming payment windows estimated right now.</p>
                )}
              </div>
            </div>
          </div>

          {/* Pay Off Your Debt Smarter */}
          {data.debtPlans.snowball.orderedDebts.length > 0 && (
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5">
              <div>
                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-400" /> Pay off your debt smarter
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Choose the approach that feels right for you and work toward becoming debt-free.
                </p>
              </div>

              {/* Debt Balances Overview */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Your Active Debts</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {data.debtPlans.snowball.orderedDebts.map((d) => (
                    <div key={d.id} className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="font-medium text-slate-200">{d.name}</span>
                      <span className="font-mono font-bold text-white">{formatCurrency(d.outstandingPrincipal)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payoff Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Option 1: Quick Wins */}
                <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Option 1: Quick Wins</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Start with your smallest balance first. This can help you clear one debt sooner and build momentum.
                  </p>
                  <div className="space-y-1.5 pt-1">
                    {data.debtPlans.snowball.orderedDebts.map((d, i) => (
                      <div key={d.id} className="flex items-center justify-between text-xs p-2 rounded bg-slate-900">
                        <span className="text-slate-300">#{i + 1} {d.name}</span>
                        <span className="font-mono text-white font-medium">{formatCurrency(d.outstandingPrincipal)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Option 2: Save on Interest */}
                <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Option 2: Save on Interest</span>
                  </div>
                  {data.debtPlans.avalanche.status === 'READY' ? (
                    <>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Focus on the debt with the highest interest rate first. This can reduce the total interest you pay over time.
                      </p>
                      <div className="space-y-1.5 pt-1">
                        {data.debtPlans.avalanche.orderedDebts.map((d, i) => (
                          <div key={d.id} className="flex items-center justify-between text-xs p-2 rounded bg-slate-900">
                            <span className="text-slate-300">#{i + 1} {d.name} {d.interestRate !== null ? `(${d.interestRate}% APR)` : ''}</span>
                            <span className="font-mono text-white font-medium">{formatCurrency(d.outstandingPrincipal)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="p-3.5 rounded-lg bg-slate-900 text-xs text-slate-400 space-y-1">
                      <p className="text-slate-300 font-medium">Add your interest rates to see which approach could save you more.</p>
                      <p className="text-[11px] text-slate-500">Set interest rates in Accounts to compare interest savings.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
