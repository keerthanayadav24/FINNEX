import { TransactionType } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { TrendInsight, CategoryDriver } from './intelligenceTypes.js';

export class TrendAnalysisService {
  static async analyzeTrends(userId: string): Promise<TrendInsight> {
    const now = new Date();

    // Define current month boundary
    const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Define previous month boundary
    const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // Fetch transactions for both periods (strictly excluding TRANSFER)
    const [currentTxs, previousTxs] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          userId,
          type: TransactionType.EXPENSE,
          date: { gte: currentStart, lte: currentEnd },
        },
        include: { category: true },
      }),
      prisma.transaction.findMany({
        where: {
          userId,
          type: TransactionType.EXPENSE,
          date: { gte: previousStart, lte: previousEnd },
        },
        include: { category: true },
      }),
    ]);

    // Data sufficiency check: Requires at least 3 transactions in current or previous period
    if (currentTxs.length < 3 && previousTxs.length < 3) {
      return {
        status: 'INSUFFICIENT_DATA',
        message: 'Insufficient transaction history across comparison months to perform trend analysis.',
        currentPeriod: { startDate: currentStart.toISOString(), endDate: currentEnd.toISOString(), totalSpent: 0 },
        previousPeriod: { startDate: previousStart.toISOString(), endDate: previousEnd.toISOString(), totalSpent: 0 },
        totalChangeAmount: 0,
        totalChangePercentage: null,
        explanation: 'We need a little more transaction history to analyze spending trends.',
        categoryDrivers: [],
      };
    }

    let currentTotal = 0;
    const currentCategoryMap = new Map<string, { name: string; icon: string; amount: number; merchants: Map<string, number> }>();

    currentTxs.forEach((tx) => {
      const amt = parseFloat(tx.amount.toString());
      currentTotal += amt;

      const catId = tx.categoryId || 'uncategorized';
      const catName = tx.category?.name || 'Uncategorized';
      const catIcon = tx.category?.icon || 'folder';

      const catEntry = currentCategoryMap.get(catId) || { name: catName, icon: catIcon, amount: 0, merchants: new Map() };
      catEntry.amount += amt;

      const merchant = tx.merchant || 'Other';
      catEntry.merchants.set(merchant, (catEntry.merchants.get(merchant) || 0) + amt);
      currentCategoryMap.set(catId, catEntry);
    });

    let previousTotal = 0;
    const previousCategoryMap = new Map<string, { name: string; icon: string; amount: number; merchants: Map<string, number> }>();

    previousTxs.forEach((tx) => {
      const amt = parseFloat(tx.amount.toString());
      previousTotal += amt;

      const catId = tx.categoryId || 'uncategorized';
      const catName = tx.category?.name || 'Uncategorized';
      const catIcon = tx.category?.icon || 'folder';

      const catEntry = previousCategoryMap.get(catId) || { name: catName, icon: catIcon, amount: 0, merchants: new Map() };
      catEntry.amount += amt;

      const merchant = tx.merchant || 'Other';
      catEntry.merchants.set(merchant, (catEntry.merchants.get(merchant) || 0) + amt);
      previousCategoryMap.set(catId, catEntry);
    });

    let totalChangePercentage: number | null = null;

    // Do NOT treat "no transactions yet this month" as a genuine 100% spending reduction
    const isCurrentPeriodEmpty = currentTxs.length === 0 || currentTotal === 0;

    if (!isCurrentPeriodEmpty && previousTotal > 0) {
      totalChangePercentage = Math.round(((currentTotal - previousTotal) / previousTotal) * 1000) / 10;
    }

    const fmtInr = (val: number) => `₹${Math.round(Math.abs(val)).toLocaleString('en-IN')}`;

    // Collect all distinct category IDs
    const allCategoryIds = new Set([...currentCategoryMap.keys(), ...previousCategoryMap.keys()]);
    const drivers: CategoryDriver[] = [];

    allCategoryIds.forEach((catId) => {
      const curr = currentCategoryMap.get(catId) || { name: 'Uncategorized', icon: 'folder', amount: 0, merchants: new Map() };
      const prev = previousCategoryMap.get(catId) || { name: 'Uncategorized', icon: 'folder', amount: 0, merchants: new Map() };

      const catName = curr.amount > 0 ? curr.name : prev.name;
      const catIcon = curr.amount > 0 ? curr.icon : prev.icon;

      const changeAmt = Math.round((curr.amount - prev.amount) * 100) / 100;

      let changePct: number | null = null;
      let explanation = '';

      if (curr.amount === 0 && prev.amount > 0) {
        changePct = null;
        explanation = `No spending recorded yet this month in ${catName} (${fmtInr(prev.amount)} last month).`;
      } else if (prev.amount === 0 && curr.amount > 0) {
        changePct = null;
        explanation = `New spending appeared in this category (+${fmtInr(curr.amount)}).`;
      } else if (prev.amount > 0) {
        changePct = Math.round(((curr.amount - prev.amount) / prev.amount) * 1000) / 10;
        explanation = `${catName} spending ${changeAmt >= 0 ? 'increased' : 'decreased'} by ${fmtInr(changeAmt)}${changePct !== null ? ` (${changePct}%)` : ''}.`;
      }

      const contribPct = Math.abs(totalChangeAmount) > 0 ? Math.round((Math.abs(changeAmt) / Math.abs(totalChangeAmount)) * 100) : 0;

      // Merchant driver breakdown
      const allMerchants = new Set([...curr.merchants.keys(), ...prev.merchants.keys()]);
      const topMerchantsList: { merchant: string; currentAmount: number; previousAmount: number; changeAmount: number }[] = [];

      allMerchants.forEach((m) => {
        const cM = curr.merchants.get(m) || 0;
        const pM = prev.merchants.get(m) || 0;
        const cDiff = Math.round((cM - pM) * 100) / 100;
        topMerchantsList.push({ merchant: m, currentAmount: cM, previousAmount: pM, changeAmount: cDiff });
      });

      topMerchantsList.sort((a, b) => Math.abs(b.changeAmount) - Math.abs(a.changeAmount));

      drivers.push({
        categoryId: catId,
        categoryName: catName,
        icon: catIcon,
        currentAmount: curr.amount,
        previousAmount: prev.amount,
        changeAmount: changeAmt,
        changePercentage: changePct,
        contributionPercentage: contribPct,
        explanation,
        topMerchants: topMerchantsList.slice(0, 3),
      });
    });

    // Rank category drivers by magnitude of absolute change
    drivers.sort((a, b) => Math.abs(b.changeAmount) - Math.abs(a.changeAmount));

    // Construct deterministic human-readable summary
    let mainSummary = '';
    if (isCurrentPeriodEmpty) {
      mainSummary = `No spending recorded yet this month (${fmtInr(previousTotal)} total spent last month).`;
    } else if (totalChangeAmount > 0) {
      mainSummary = `Your spending increased by ${fmtInr(totalChangeAmount)}${totalChangePercentage !== null ? ` (+${totalChangePercentage}%)` : ''} this month.`;
      if (drivers.length > 0) {
        mainSummary += ` ${drivers[0].categoryName} was the largest contributor (+${fmtInr(drivers[0].changeAmount)}).`;
      }
    } else if (totalChangeAmount < 0) {
      mainSummary = `Your spending decreased by ${fmtInr(totalChangeAmount)}${totalChangePercentage !== null ? ` (${totalChangePercentage}%)` : ''} this month.`;
      if (drivers.length > 0) {
        mainSummary += ` Largest reduction occurred in ${drivers[0].categoryName} (-${fmtInr(drivers[0].changeAmount)}).`;
      }
    } else {
      mainSummary = `Your spending remained stable compared to last month.`;
    }

    return {
      status: 'SUCCESS',
      currentPeriod: { startDate: currentStart.toISOString(), endDate: currentEnd.toISOString(), totalSpent: currentTotal },
      previousPeriod: { startDate: previousStart.toISOString(), endDate: previousEnd.toISOString(), totalSpent: previousTotal },
      totalChangeAmount,
      totalChangePercentage,
      explanation: mainSummary,
      categoryDrivers: drivers,
    };
  }
}
