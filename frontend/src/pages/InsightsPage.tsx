import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, AlertTriangle, Calendar, Info, ShieldCheck, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';
import {
  intelligenceService,
  TrendInsightResponse,
  AnomalyResponse,
  ForecastResponse,
} from '../services/intelligenceService';
import { formatCurrency, formatSignedCurrency } from '../utils/formatters';

export const InsightsPage: React.FC = () => {
  const [trends, setTrends] = useState<TrendInsightResponse | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyResponse | null>(null);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      intelligenceService.getTrends(),
      intelligenceService.getAnomalies(),
      intelligenceService.getForecast(),
    ])
      .then(([trendRes, anomalyRes, forecastRes]) => {
        setTrends(trendRes);
        setAnomalies(anomalyRes);
        setForecast(forecastRes);
      })
      .catch((err) => console.error('Failed to load intelligence data:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
        <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 animate-spin">
          <Sparkles className="w-5 h-5" />
        </div>
        <p className="text-sm font-medium">Analyzing historical spending patterns &amp; computing statistical insights...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" /> Smart Financial Intelligence
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Financial Intelligence &amp; Insights
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Automated analysis of your spending trends, top category drivers, unusual transactions, &amp; monthly forecasts.
            </p>
          </div>
          <div className="px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-800 text-right">
            <div className="text-xs text-slate-400 font-medium">Analysis Status</div>
            <div className="text-xs font-bold text-emerald-400 mt-1 flex items-center gap-1.5 justify-end">
              <ShieldCheck className="w-4 h-4" /> Active &amp; Up-to-Date
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: SPEND TREND DRIVER ANALYSIS */}
      <div className="p-6 rounded-2xl glass-card border border-slate-800/80 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" /> Spend Trend Drivers
            </h2>
            <p className="text-xs text-slate-400">Why spending increased or decreased compared to last month</p>
          </div>
        </div>

        {trends?.status === 'INSUFFICIENT_DATA' ? (
          <div className="p-6 rounded-xl bg-slate-950/60 border border-slate-800 text-center space-y-2">
            <Info className="w-8 h-8 text-cyan-400 mx-auto" />
            <h4 className="font-semibold text-white">We're still learning your spending patterns</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">{trends.explanation}</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-slate-200">
              {trends?.explanation}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trends?.categoryDrivers.map((driver) => (
                <div key={driver.categoryId} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{driver.categoryName}</span>
                    <span
                      className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                        driver.changeAmount >= 0
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {formatSignedCurrency(driver.changeAmount)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400">{driver.explanation}</p>

                  {driver.topMerchants.length > 0 && (
                    <div className="pt-2 border-t border-slate-800/60 space-y-1">
                      <div className="text-[11px] text-slate-500 font-semibold uppercase">Top Merchant Contributors</div>
                      {driver.topMerchants.map((m) => (
                        <div key={m.merchant} className="flex items-center justify-between text-xs text-slate-300">
                          <span>{m.merchant}</span>
                          <span className="font-mono font-semibold text-slate-300">
                            {m.currentAmount > 0 ? formatCurrency(m.currentAmount) : formatSignedCurrency(m.changeAmount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: ANOMALY DETECTION */}
      <div className="p-6 rounded-2xl glass-card border border-slate-800/80 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" /> Unusual Activity &amp; Anomalies
            </h2>
            <p className="text-xs text-slate-400">Statistical outlier detection using Median &amp; Median Absolute Deviation (MAD)</p>
          </div>
        </div>

        {anomalies?.status === 'INSUFFICIENT_DATA' || !anomalies?.anomalies.length ? (
          <div className="p-6 rounded-xl bg-slate-950/60 border border-slate-800 text-center space-y-2">
            <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
            <h4 className="font-semibold text-white">No Unusual Activity Detected</h4>
            <p className="text-xs text-slate-400">Your recent transactions fit within your expected historical spending baselines.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {anomalies.anomalies.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        item.severity === 'HIGH'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {item.severity} SEVERITY
                    </span>
                    <span className="text-sm font-bold text-white">
                      {item.merchant || item.categoryName} — {formatCurrency(item.amount)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">{item.reason}</p>
                </div>

                <div className="text-right text-xs text-slate-400 font-mono bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
                  <div>Historical Median: {formatCurrency(item.historicalMedian)}</div>
                  <div>Robust Score: {item.score}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 3: SPENDING FORECAST */}
      <div className="p-6 rounded-2xl glass-card border border-slate-800/80 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-400" /> Next Month Forecast Estimate
            </h2>
            <p className="text-xs text-slate-400">Transparent weighted moving average forecast over historical time-series</p>
          </div>
          {forecast?.dataQuality && (
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                forecast.dataQuality === 'HIGH'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : forecast.dataQuality === 'MEDIUM'
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}
            >
              Data Quality: {forecast.dataQuality}
            </span>
          )}
        </div>

        {forecast?.status === 'INSUFFICIENT_DATA' ? (
          <div className="p-6 rounded-xl bg-slate-950/60 border border-slate-800 text-center space-y-2">
            <Info className="w-8 h-8 text-indigo-400 mx-auto" />
            <h4 className="font-semibold text-white">Insufficient Historical Coverage for Forecast</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">{forecast.explanation}</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-6 rounded-xl bg-gradient-to-r from-indigo-950/40 to-slate-950 border border-indigo-900/40 flex items-center justify-between">
              <div>
                <div className="text-xs text-indigo-400 uppercase font-semibold">Estimated Total Spending</div>
                <div className="text-3xl font-extrabold text-white mt-1 font-mono">
                  {formatCurrency(forecast?.totalForecastAmount)}
                </div>
                <div className="text-xs text-slate-400 mt-1">Estimated for {forecast?.nextMonthName}</div>
              </div>
              <div className="text-right text-xs text-slate-400">
                <div>Evaluated Months: {forecast?.historicalMonthsEvaluated}</div>
                <div>Model: Weighted Moving Average</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {forecast?.categoryForecasts.map((cat) => (
                <div key={cat.categoryId} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{cat.categoryName}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {cat.dataQuality} Quality
                    </span>
                  </div>

                  {cat.dataQuality === 'INSUFFICIENT_DATA' ? (
                    <p className="text-xs text-slate-500">{cat.explanation}</p>
                  ) : (
                    <div>
                      <div className="text-xl font-bold text-white font-mono">{formatCurrency(cat.forecastAmount)}</div>
                      <div className="text-xs text-slate-400 mt-1">Hist. Avg: {formatCurrency(cat.historicalMonthlyAverage)}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
