import React, { useState, useEffect } from 'react';
import { Calendar, RefreshCw, AlertCircle, Clock } from 'lucide-react';
import { financialHealthService, TimelineEvent } from '../services/financialHealthService';
import { formatCurrency } from '../utils/formatters';

export const FinancialTimelinePage: React.FC = () => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTimeline = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await financialHealthService.getTimeline();
      setEvents(res);
    } catch (err: any) {
      console.error('Timeline load error:', err);
      setError(err.message || 'Failed to load timeline events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimeline();
  }, []);

  const getConfidenceBadge = (confidence: string, type: string) => {
    if (type === 'GOAL_MILESTONE') {
      return (
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          Planned
        </span>
      );
    }
    if (confidence === 'HIGH') {
      return (
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Expected
        </span>
      );
    }
    return (
      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
        Likely
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 animate-spin">
          <RefreshCw className="w-6 h-6" />
        </div>
        <p className="text-sm font-medium">Loading your financial timeline...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4 max-w-lg mx-auto my-12">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold text-white">Timeline Unavailable</h3>
        <p className="text-xs text-slate-400">{error}</p>
        <button onClick={loadTimeline} className="px-5 py-2 rounded-xl bg-cyan-500 text-slate-950 font-semibold text-xs hover:bg-cyan-400">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-7 h-7 text-amber-400" /> Financial Timeline
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            See upcoming payments, income, and important financial goals in one place.
          </p>
        </div>
        <button
          onClick={loadTimeline}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Timeline
        </button>
      </div>

      {events.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-4 max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
            <Calendar className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white">No Upcoming Events</h3>
          <p className="text-xs text-slate-400">No recurring payments or target goal dates detected yet.</p>
        </div>
      ) : (
        <div className="relative border-l-2 border-slate-800 ml-4 space-y-6 pl-6">
          {events.map((evt) => (
            <div key={evt.id} className="relative group">
              {/* Timeline Indicator Dot */}
              <div
                className={`absolute -left-[31px] top-2 w-4 h-4 rounded-full border-2 border-slate-950 ${
                  evt.type === 'EXPECTED_INCOME'
                    ? 'bg-emerald-500'
                    : evt.type === 'EXPECTED_BILL'
                    ? 'bg-amber-500'
                    : 'bg-cyan-500'
                }`}
              ></div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    {new Date(evt.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  {getConfidenceBadge(evt.confidence, evt.type)}
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-white text-base">{evt.title}</h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{evt.description}</p>
                  </div>
                  {evt.amount !== undefined && (
                    <div className="text-right shrink-0">
                      <span
                        className={`font-mono font-bold text-base block ${
                          evt.type === 'EXPECTED_INCOME'
                            ? 'text-emerald-400'
                            : evt.type === 'EXPECTED_BILL'
                            ? 'text-amber-400'
                            : 'text-cyan-400'
                        }`}
                      >
                        {evt.type === 'EXPECTED_INCOME' ? `+${formatCurrency(evt.amount)}` : formatCurrency(evt.amount)}
                      </span>
                      {evt.type === 'GOAL_MILESTONE' && (
                        <span className="text-[11px] text-slate-500 block">target</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-slate-400 pt-2 flex items-center justify-between border-t border-slate-800/80">
                  <span>{evt.source}</span>
                  <span className="text-slate-500">This is an estimate and may change.</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
