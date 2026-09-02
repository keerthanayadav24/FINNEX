import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw, AlertCircle, Wallet, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { financialHealthService, FinancialHealthData, RunwayData } from '../services/financialHealthService';
import { formatCurrency } from '../utils/formatters';

export const FinancialHealthPage: React.FC = () => {
  const [health, setHealth] = useState<FinancialHealthData | null>(null);
  const [runway, setRunway] = useState<RunwayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [hRes, rRes] = await Promise.all([
        financialHealthService.getHealth(),
        financialHealthService.getRunway(),
      ]);
      setHealth(hRes);
      setRunway(rRes);
    } catch (err: any) {
      console.error('Failed to load Financial Health:', err);
      setError(err.message || 'Could not fetch Financial Health data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-100">
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 animate-spin">
          <RefreshCw className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold">Checking your financial health...</h3>
        <p className="text-xs text-slate-500 mt-1">Reviewing spending, savings, debt, budgets, &amp; goals</p>
      </div>
    );
  }

  if (error || !health || !runway) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4 max-w-lg mx-auto my-12">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold text-white">Financial Health Temporarily Unavailable</h3>
        <p className="text-xs text-slate-400">{error}</p>
        <button onClick={loadData} className="px-5 py-2 rounded-xl bg-cyan-500 text-slate-950 font-semibold text-xs hover:bg-cyan-400">
          Refresh
        </button>
      </div>
    );
  }

  const getNaturalScoreStatus = (score: number) => {
    if (score >= 90) return { label: "You're doing great", badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
    if (score >= 75) return { label: "You're doing well", badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' };
    if (score >= 60) return { label: "You're on a good path", badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
    if (score >= 45) return { label: "There's room to improve", badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
    return { label: 'Your finances need attention', badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
  };

  const scoreStatus = getNaturalScoreStatus(health.overallScore);

  const getOverallSummaryText = () => {
    const cashComp = health.components.find((c) => c.name === 'Cash Flow');
    const reserveComp = health.components.find((c) => c.name === 'Savings');
    const isReserveGood = (reserveComp?.score || 0) >= 70;
    const isCashFlowGood = (cashComp?.score || 0) >= 70;

    if (isReserveGood && isCashFlowGood) {
      return 'Your cash flow and savings are in a strong position. Keeping up your momentum will help you reach your goals faster.';
    } else if (isReserveGood) {
      return 'Your savings are in a good position, but your budgets, debt, and goals need some attention.';
    } else {
      return 'Focusing on staying within budgets and building regular savings can help strengthen your financial picture.';
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="w-7 h-7 text-cyan-400" /> Your Financial Health
          </h1>
          <p className="text-sm text-slate-400">
            A simple view of how you're doing with spending, savings, debt, budgets, and goals.
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Main Score Banner & Runway Card Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Overall Health Score Card */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/40 border border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Financial Health Score</span>
              <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${scoreStatus.badge}`}>
                {scoreStatus.label}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-4">
              <span className="text-5xl font-extrabold text-white tracking-tight">{health.overallScore}</span>
              <span className="text-xl text-slate-500 font-semibold">/ 100</span>
            </div>
          </div>

          <div className="w-full h-3 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-700"
              style={{ width: `${health.overallScore}%` }}
            ></div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">{getOverallSummaryText()}</p>
        </div>

        {/* Savings Coverage / Runway Card (2 columns) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-400" /> How long your savings could last
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">An estimate based on your savings and typical monthly spending.</p>
            </div>
            <span className="text-[11px] font-semibold text-slate-400 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
              {runway.estimatedRunwayMonths !== null ? 'Based on your recent spending history' : 'Needs more spending data'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 block font-semibold">Savings available</span>
              <span className="text-lg font-bold text-white font-mono">{formatCurrency(runway.liquidAssets)}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 block font-semibold">Typical monthly spending</span>
              <span className="text-lg font-bold text-white font-mono">{formatCurrency(runway.averageMonthlyExpense)}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 block font-semibold">Estimated coverage</span>
              <span className="text-lg font-bold text-cyan-400">
                {runway.estimatedRunwayMonths !== null ? `${runway.estimatedRunwayMonths} months` : 'N/A'}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 leading-relaxed">
            {runway.explanation}
          </div>
        </div>
      </div>

      {/* Breakdown Section: "How you're doing" */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-cyan-400" /> How you're doing
        </h2>

        <div className="grid grid-cols-1 gap-4">
          {health.components.map((comp, idx) => {
            const isExpanded = expandedIndex === idx;

            return (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-sm">
                      {comp.score}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">{comp.name}</h3>
                      <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{comp.explanation}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                    title="View Details"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {isExpanded && (
                  <div className="pt-3 border-t border-slate-800/80 grid grid-cols-2 md:grid-cols-3 gap-3">
                    {comp.evidence.map((ev, i) => (
                      <div key={i} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                        <span className="text-[11px] text-slate-500 block">{ev.label}</span>
                        <span className="font-semibold text-white font-mono">{ev.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
