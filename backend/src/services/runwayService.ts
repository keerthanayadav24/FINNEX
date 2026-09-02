import { AccountType, TransactionType } from '@prisma/client';
import { prisma } from '../config/prisma.js';

export interface RunwayResult {
  liquidAssets: number;
  averageMonthlyExpense: number;
  estimatedRunwayMonths: number | null;
  dataQuality: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA';
  explanation: string;
}

export class RunwayService {
  static async calculateRunway(userId: string): Promise<RunwayResult> {
    // 1. Calculate liquid assets (SAVINGS, CHECKING, CASH)
    const liquidAccounts = await prisma.account.findMany({
      where: {
        userId,
        type: { in: [AccountType.SAVINGS, AccountType.CHECKING, AccountType.CASH] },
      },
    });

    const liquidAssets = liquidAccounts.reduce(
      (sum, acc) => sum + Math.max(0, parseFloat(acc.currentBalance.toString())),
      0
    );

    // 2. Fetch non-transfer expense transactions
    const expenses = await prisma.transaction.findMany({
      where: {
        userId,
        type: TransactionType.EXPENSE,
      },
      orderBy: { date: 'asc' },
    });

    const fmtInr = (v: number) => `₹${Math.round(Math.abs(v)).toLocaleString('en-IN')}`;

    if (expenses.length === 0) {
      return {
        liquidAssets: Math.round(liquidAssets * 100) / 100,
        averageMonthlyExpense: 0,
        estimatedRunwayMonths: null,
        dataQuality: 'INSUFFICIENT_DATA',
        explanation: 'We need a little more spending history before we can estimate how long your savings could last.',
      };
    }

    // Group expenses by calendar month
    const monthlyExpenses = new Map<string, number>();
    expenses.forEach((tx) => {
      const key = `${tx.date.getFullYear()}-${tx.date.getMonth() + 1}`;
      const current = monthlyExpenses.get(key) || 0;
      monthlyExpenses.set(key, current + parseFloat(tx.amount.toString()));
    });

    const totalExpenseSum = Array.from(monthlyExpenses.values()).reduce((sum, v) => sum + v, 0);
    const monthsCount = Math.max(1, monthlyExpenses.size);
    const averageMonthlyExpense = totalExpenseSum / monthsCount;

    if (averageMonthlyExpense <= 0) {
      return {
        liquidAssets: Math.round(liquidAssets * 100) / 100,
        averageMonthlyExpense: 0,
        estimatedRunwayMonths: null,
        dataQuality: 'INSUFFICIENT_DATA',
        explanation: 'We need a little more spending history before we can estimate how long your savings could last.',
      };
    }

    const estimatedRunwayMonths = Math.round((liquidAssets / averageMonthlyExpense) * 10) / 10;

    let dataQuality: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA' = 'LOW';
    if (monthsCount >= 3) dataQuality = 'HIGH';
    else if (monthsCount >= 2) dataQuality = 'MEDIUM';

    return {
      liquidAssets: Math.round(liquidAssets * 100) / 100,
      averageMonthlyExpense: Math.round(averageMonthlyExpense * 100) / 100,
      estimatedRunwayMonths,
      dataQuality,
      explanation: `Based on your current savings (${fmtInr(liquidAssets)}) and typical monthly spending (${fmtInr(averageMonthlyExpense)}), you could cover about ${estimatedRunwayMonths} months of expenses.`,
    };
  }
}
