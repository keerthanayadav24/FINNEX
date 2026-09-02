import { TransactionType } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { AnomalyInsight, AnomalySeverity } from './intelligenceTypes.js';
import { calculateRobustScore, detectRecurringPattern } from './statUtils.js';

export class AnomalyDetectionService {
  static async detectAnomalies(userId: string): Promise<{ status: 'SUCCESS' | 'INSUFFICIENT_DATA'; anomalies: AnomalyInsight[] }> {
    // Retrieve all user EXPENSE transactions
    const allTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        type: TransactionType.EXPENSE,
      },
      include: { category: true },
      orderBy: { date: 'desc' },
    });

    // Global Cold Start Safeguard: Needs at least 5 transactions total
    if (allTransactions.length < 5) {
      return {
        status: 'INSUFFICIENT_DATA',
        anomalies: [],
      };
    }

    const anomalies: AnomalyInsight[] = [];

    // Group transactions by merchant and by category
    const merchantGroups = new Map<string, typeof allTransactions>();
    const categoryGroups = new Map<string, typeof allTransactions>();

    allTransactions.forEach((tx) => {
      if (tx.merchant && tx.merchant.trim()) {
        const mKey = tx.merchant.toLowerCase().trim();
        const list = merchantGroups.get(mKey) || [];
        list.push(tx);
        merchantGroups.set(mKey, list);
      }

      if (tx.categoryId) {
        const cKey = tx.categoryId;
        const list = categoryGroups.get(cKey) || [];
        list.push(tx);
        categoryGroups.set(cKey, list);
      }
    });

    // Evaluate candidate transactions (up to 100 most recent transactions)
    const candidateTxs = allTransactions.slice(0, 100);

    for (const tx of candidateTxs) {
      const candidateAmt = parseFloat(tx.amount.toString());
      let comparisonGroup: 'MERCHANT' | 'CATEGORY' = 'CATEGORY';
      let historicalTxs: typeof allTransactions = [];

      // 1. Primary Comparison Group: Same Merchant (if >= 5 past transactions exist)
      if (tx.merchant && tx.merchant.trim()) {
        const mKey = tx.merchant.toLowerCase().trim();
        const mList = merchantGroups.get(mKey) || [];
        // Exclude candidate transaction itself from history
        const mHist = mList.filter((t) => t.id !== tx.id);
        if (mHist.length >= 5) {
          comparisonGroup = 'MERCHANT';
          historicalTxs = mHist;
        }
      }

      // 2. Secondary Fallback Comparison Group: Same Category (if >= 5 past transactions exist)
      if (historicalTxs.length === 0 && tx.categoryId) {
        const cList = categoryGroups.get(tx.categoryId) || [];
        const cHist = cList.filter((t) => t.id !== tx.id);
        if (cHist.length >= 5) {
          comparisonGroup = 'CATEGORY';
          historicalTxs = cHist;
        }
      }

      // Data sufficiency check for comparison group
      if (historicalTxs.length < 5) continue;

      // Extract numerical amounts
      const historicalAmounts = historicalTxs.map((t) => parseFloat(t.amount.toString()));

      // Calculate Robust Score using Median + MAD (Excluding candidate itself)
      const { score, median, mad } = calculateRobustScore(candidateAmt, historicalAmounts);

      // Apply Recurring Transaction Safeguard
      const isRecurring = detectRecurringPattern(tx.merchant, candidateAmt, allTransactions);

      // If robust score >= 2.5 and NOT a recurring payment, flag as anomaly!
      if (score >= 2.5 && !isRecurring) {
        let severity: AnomalySeverity = 'LOW';
        if (score >= 3.5) severity = 'HIGH';
        else if (score >= 2.5) severity = 'MEDIUM';

        const groupName = comparisonGroup === 'MERCHANT' ? tx.merchant : tx.category?.name || 'Category';

        anomalies.push({
          id: `anomaly_${tx.id}`,
          type: 'UNUSUAL_AMOUNT',
          severity,
          score,
          transactionId: tx.id,
          merchant: tx.merchant || undefined,
          categoryId: tx.categoryId || undefined,
          categoryName: tx.category?.name || undefined,
          amount: candidateAmt,
          date: tx.date.toISOString(),
          comparisonGroup,
          sampleSize: historicalAmounts.length,
          historicalMedian: Math.round(median * 100) / 100,
          historicalMAD: Math.round(mad * 100) / 100,
          reason: `Transaction amount of ₹${Math.round(candidateAmt).toLocaleString('en-IN')} is unusually high compared to your historical ${groupName} baseline (Median: ₹${Math.round(median).toLocaleString('en-IN')}).`,
          isRecurringSafeguardApplied: false,
        });
      }
    }

    return {
      status: 'SUCCESS',
      anomalies,
    };
  }
}
