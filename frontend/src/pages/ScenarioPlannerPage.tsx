import React, { useState, useEffect } from 'react';
import { Sliders, RefreshCw, AlertCircle, Sparkles, HelpCircle, Info } from 'lucide-react';
import { financialHealthService, ScenarioSimulationResult } from '../services/financialHealthService';
import { categoryService } from '../services/categoryService';
import { goalService } from '../services/goalService';
import { Category, Goal } from '../types';
import { formatCurrency } from '../utils/formatters';

export const ScenarioPlannerPage: React.FC = () => {
  const [scenarioType, setScenarioType] = useState<string>('SPENDING_REDUCTION');
  const [categories, setCategories] = useState<Category[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  const [amountInput, setAmountInput] = useState<string>('1000');

  const [result, setResult] = useState<ScenarioSimulationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState<boolean>(false);

  useEffect(() => {
    Promise.all([categoryService.getCategories(), goalService.getGoals()])
      .then(([cats, gls]) => {
        setCategories(cats);
        setGoals(gls);
        if (gls.length > 0) setSelectedGoalId(gls[0].id);
      })
      .catch((err) => console.error('Failed to load categories/goals:', err));
  }, []);

  const runSimulation = async () => {
    const numericAmount = Math.max(0, parseFloat(amountInput) || 0);

    setLoading(true);
    setError(null);
    try {
      let scenarioParameters: any = {};
      if (scenarioType === 'SPENDING_REDUCTION') {
        scenarioParameters = {
          categoryId: selectedCategoryId || undefined,
          monthlyReduction: numericAmount,
        };
      } else if (scenarioType === 'ADDITIONAL_GOAL_CONTRIBUTION') {
        scenarioParameters = {
          goalId: selectedGoalId,
          additionalMonthlyContribution: numericAmount,
        };
      } else if (scenarioType === 'INCOME_CHANGE') {
        scenarioParameters = {
          monthlyIncomeChange: numericAmount,
        };
      } else if (scenarioType === 'DEBT_PAYMENT') {
        scenarioParameters = {
          additionalMonthlyPayment: numericAmount,
        };
      }

      const res = await financialHealthService.simulateScenario({
        scenarioType,
        scenarioParameters,
      });
      setResult(res);
      setHasRun(true);
    } catch (err: any) {
      console.error('Scenario error:', err);
      setError(err.message || 'Could not calculate scenario');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSimulation();
  }, [scenarioType]);

  const getQuestionLabel = () => {
    switch (scenarioType) {
      case 'SPENDING_REDUCTION':
        return 'How much could you spend less each month?';
      case 'ADDITIONAL_GOAL_CONTRIBUTION':
        return 'How much more could you save each month?';
      case 'INCOME_CHANGE':
        return 'How much more could you earn each month?';
      case 'DEBT_PAYMENT':
        return 'How much extra could you put toward your debt each month?';
      default:
        return 'Monthly amount?';
    }
  };

  const getCardHeaders = () => {
    switch (scenarioType) {
      case 'ADDITIONAL_GOAL_CONTRIBUTION':
        return { card1: 'CURRENT CONTRIBUTION', card2: 'NEW CONTRIBUTION', card3: 'ADDED EACH YEAR' };
      case 'INCOME_CHANGE':
        return { card1: 'REGULAR MONTHLY INCOME', card2: 'NEW MONTHLY INCOME', card3: 'EXTRA EACH YEAR' };
      case 'DEBT_PAYMENT':
        return { card1: 'CURRENT DEBT', card2: 'NEW PAYMENT', card3: 'REDUCED EACH YEAR' };
      case 'SPENDING_REDUCTION':
      default:
        return { card1: 'TYPICAL MONTH', card2: 'WITH THIS CHANGE', card3: 'POSSIBLE SAVINGS' };
    }
  };

  const headers = getCardHeaders();

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Sliders className="w-7 h-7 text-cyan-400" /> What If?
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          See how small changes to your money could affect your finances.
        </p>
      </div>

      {/* Scenario Options & Controls Card */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { id: 'SPENDING_REDUCTION', label: 'Spend Less' },
            { id: 'ADDITIONAL_GOAL_CONTRIBUTION', label: 'Save More' },
            { id: 'INCOME_CHANGE', label: 'Earn More' },
            { id: 'DEBT_PAYMENT', label: 'Pay Off Debt Faster' },
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => {
                setScenarioType(type.id);
              }}
              className={`p-3.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                scenarioType === type.id
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-md shadow-cyan-500/10'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Dynamic Form Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2 items-end">
          {/* Target Dropdowns */}
          {scenarioType === 'SPENDING_REDUCTION' && (
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Where would you like to spend less?</label>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="">All spending</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {scenarioType === 'ADDITIONAL_GOAL_CONTRIBUTION' && (
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Which goal would you like to boost?</label>
              <select
                value={selectedGoalId}
                onChange={(e) => setSelectedGoalId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Amount Direct Input */}
          <div className={scenarioType === 'INCOME_CHANGE' || scenarioType === 'DEBT_PAYMENT' ? 'md:col-span-2' : ''}>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">{getQuestionLabel()}</label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs text-slate-400 font-mono font-bold">₹</span>
              <input
                type="number"
                min="0"
                step="100"
                placeholder="1000"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <button
              onClick={runSimulation}
              disabled={loading}
              className="w-full px-5 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 flex items-center justify-center gap-2 transition-all shadow-md shadow-cyan-500/10"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} See What Happens
            </button>
          </div>
        </div>
      </div>

      {/* Results Display */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {!hasRun && !loading && (
        <div className="p-10 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
          <HelpCircle className="w-8 h-8 text-cyan-400 mx-auto opacity-80" />
          <h3 className="text-base font-bold text-white">Try a small change</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Choose an option above, enter an amount, and see how it could affect your finances.
          </p>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Here's what could change</h2>
          </div>

          {/* Capping Note Alert */}
          {result.explanations && result.explanations.length > 2 && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5 leading-relaxed">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>{result.explanations[2]}</div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{headers.card1}</span>
              <div className="text-2xl font-bold text-white font-mono">{formatCurrency(result.baseline.monthlyValue)}/mo</div>
              <p className="text-xs text-slate-300 leading-relaxed">{result.baseline.description}</p>
            </div>

            {/* Card 2 */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">{headers.card2}</span>
              <div className="text-2xl font-bold text-cyan-400 font-mono">{formatCurrency(result.scenario.monthlyValue)}/mo</div>
              <p className="text-xs text-slate-300 leading-relaxed">{result.scenario.description}</p>
            </div>

            {/* Card 3 */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">{headers.card3}</span>
              <div className="text-2xl font-bold text-emerald-400 font-mono">{formatCurrency(result.difference.annualDifference)}/yr</div>
              <p className="text-xs text-slate-300 leading-relaxed">{result.difference.description}</p>
            </div>
          </div>

          {/* Goal Section */}
          {scenarioType === 'ADDITIONAL_GOAL_CONTRIBUTION' && result.affectedGoals.length > 0 ? (
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="font-bold text-white text-base uppercase tracking-wider text-xs">YOUR GOAL</h3>
              {result.affectedGoals.map((g) => (
                <div key={g.goalId} className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <span className="font-bold text-white text-base">{g.goalName}</span>
                    <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 text-xs">
                      {g.monthsSaved > 0 ? `About ${g.monthsSaved} month(s) sooner` : 'Goal Contribution Boosted'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-500 block text-[11px]">Current Amount</span>
                      <span className="font-bold text-white font-mono">{formatCurrency(g.currentAmount ?? 0)}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-500 block text-[11px]">Target Amount</span>
                      <span className="font-bold text-white font-mono">{formatCurrency(g.targetAmount ?? 0)}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-500 block text-[11px]">Remaining Amount</span>
                      <span className="font-bold text-cyan-400 font-mono">{formatCurrency(g.remainingAmount ?? 0)}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-500 block text-[11px]">New Monthly Contribution</span>
                      <span className="font-bold text-emerald-400 font-mono">{formatCurrency(result.scenario.monthlyValue)}/mo</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 font-medium leading-relaxed bg-slate-900/80 p-3 rounded-lg border border-slate-800/60">
                    💡 {g.explanation}
                  </p>
                </div>
              ))}
            </div>
          ) : result.affectedGoals.length > 0 ? (
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="font-bold text-white text-base">How this could help your goals</h3>
              <div className="space-y-3">
                {result.affectedGoals.map((g) => (
                  <div key={g.goalId} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">{g.goalName}</span>
                      {g.monthsSaved > 0 ? (
                        <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                          About {g.monthsSaved} month(s) sooner
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-700">
                          Annual Savings Added
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{g.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
