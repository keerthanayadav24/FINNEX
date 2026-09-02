import { TransactionType } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { ForecastResult, CategoryForecast, DataQuality } from './intelligenceTypes.js';
import { calculateWeightedMovingAverage } from './statUtils.js';

export class SpendingForecastService {
  static async generateForecast(userId: string): Promise<ForecastResult> {
    const now = new Date();

    // Fetch user EXPENSE transactions
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        type: TransactionType.EXPENSE,
      },
      include: { category: true },
      orderBy: { date: 'asc' },
    });

    if (transactions.length === 0) {
      return {
        status: 'INSUFFICIENT_DATA',
        message: 'No transaction history available for forecasting.',
        nextMonthName: new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' }),
        totalForecastAmount: 0,
        dataQuality: 'INSUFFICIENT_DATA',
        historicalMonthsEvaluated: 0,
        categoryForecasts: [],
        explanation: 'Add transaction history across multiple months to enable spending forecasts.',
      };
    }

    // Build complete monthly series across past 6 months
    const monthKeys: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthKeys.push(k);
    }

    // Aggregate spending per month key and category
    const monthlyTotals = new Map<string, number>();
    const categoryMonthlyTotals = new Map<string, Map<string, number>>();
    const categoryMetadata = new Map<string, { name: string }>();

    // Initialize all months with 0.00 (Zero-filling missing months)
    monthKeys.forEach((m) => monthlyTotals.set(m, 0));

    transactions.forEach((tx) => {
      const txMonth = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyTotals.has(txMonth)) {
        const amt = parseFloat(tx.amount.toString());
        monthlyTotals.set(txMonth, (monthlyTotals.get(txMonth) || 0) + amt);

        const catId = tx.categoryId || 'uncategorized';
        const catName = tx.category?.name || 'Uncategorized';
        categoryMetadata.set(catId, { name: catName });

        const catMap = categoryMonthlyTotals.get(catId) || new Map<string, number>();
        monthKeys.forEach((m) => {
          if (!catMap.has(m)) catMap.set(m, 0);
        });
        catMap.set(txMonth, (catMap.get(txMonth) || 0) + amt);
        categoryMonthlyTotals.set(catId, catMap);
      }
    });

    // Count non-zero spending months
    const activeMonths = monthKeys.filter((m) => (monthlyTotals.get(m) || 0) > 0);

    let dataQuality: DataQuality = 'LOW';
    if (activeMonths.length >= 5) dataQuality = 'HIGH';
    else if (activeMonths.length >= 3) dataQuality = 'MEDIUM';
    else if (activeMonths.length >= 2) dataQuality = 'LOW';
    else dataQuality = 'INSUFFICIENT_DATA';

    if (dataQuality === 'INSUFFICIENT_DATA') {
      return {
        status: 'INSUFFICIENT_DATA',
        message: 'Requires at least 2 distinct historical spending months.',
        nextMonthName: new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' }),
        totalForecastAmount: 0,
        dataQuality: 'INSUFFICIENT_DATA',
        historicalMonthsEvaluated: activeMonths.length,
        categoryForecasts: [],
        explanation: 'We need at least 2 months of spending history to construct a reliable forecast.',
      };
    }

    const seriesValues = monthKeys.map((m) => monthlyTotals.get(m) || 0);
    const totalForecastAmount = calculateWeightedMovingAverage(seriesValues);

    // Category forecasts
    const categoryForecasts: CategoryForecast[] = [];

    categoryMonthlyTotals.forEach((catMap, catId) => {
      const catSeries = monthKeys.map((m) => catMap.get(m) || 0);
      const activeCatMonths = monthKeys.filter((m) => (catMap.get(m) || 0) > 0);

      const meta = categoryMetadata.get(catId) || { name: 'Uncategorized' };

      if (activeCatMonths.length < 2) {
        categoryForecasts.push({
          categoryId: catId,
          categoryName: meta.name,
          forecastAmount: 0,
          historicalMonthlyAverage: 0,
          dataQuality: 'INSUFFICIENT_DATA',
          explanation: `Insufficient historical data for ${meta.name} (requires 2+ spending months).`,
        });
      } else {
        const cForecast = calculateWeightedMovingAverage(catSeries);
        const avg = Math.round((catSeries.reduce((a, b) => a + b, 0) / activeCatMonths.length) * 100) / 100;
        let cQuality: DataQuality = 'LOW';
        if (activeCatMonths.length >= 4) cQuality = 'HIGH';
        else if (activeCatMonths.length >= 3) cQuality = 'MEDIUM';

        categoryForecasts.push({
          categoryId: catId,
          categoryName: meta.name,
          forecastAmount: cForecast,
          historicalMonthlyAverage: avg,
          dataQuality: cQuality,
          explanation: `Estimated ₹${Math.round(cForecast).toLocaleString('en-IN')} based on ${activeCatMonths.length} months of ${meta.name} history.`,
        });
      }
    });

    const nextMonthName = new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const fmtForecast = `₹${Math.round(totalForecastAmount).toLocaleString('en-IN')}`;

    return {
      status: 'SUCCESS',
      nextMonthName,
      totalForecastAmount,
      dataQuality,
      historicalMonthsEvaluated: activeMonths.length,
      categoryForecasts,
      explanation: `Estimated total spending of ${fmtForecast} for ${nextMonthName} based on ${activeMonths.length} months of time-series data.`,
    };
  }
}
