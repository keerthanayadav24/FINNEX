import { TransactionType } from '@prisma/client';
import { prisma } from '../config/prisma.js';

export class DashboardService {
  static async getSummary(userId: string, startDate?: Date, endDate?: Date) {
    // 1. Fetch User Accounts for Asset/Liability Net Worth Calculation (Current Cumulative Balances)
    const accounts = await prisma.account.findMany({
      where: { userId },
    });

    let totalAssets = 0;
    let totalLiabilities = 0;

    accounts.forEach((acc) => {
      const balance = parseFloat(acc.currentBalance.toString());
      if (['SAVINGS', 'CHECKING', 'CASH', 'INVESTMENT'].includes(acc.type)) {
        totalAssets += balance;
      } else if (['CREDIT_CARD', 'LOAN'].includes(acc.type)) {
        totalLiabilities += balance;
      }
    });

    // NET WORTH FORMULA: Net Worth = Total Assets - Total Liabilities
    const netWorth = totalAssets - totalLiabilities;

    // 2. Fetch User Transactions for Income & Expense Totals within Date Range (Strictly excluding TRANSFER)
    const txWhere: any = {
      userId,
      type: { in: [TransactionType.INCOME, TransactionType.EXPENSE] },
    };

    if (startDate || endDate) {
      txWhere.date = {};
      if (startDate) txWhere.date.gte = startDate;
      if (endDate) txWhere.date.lte = endDate;
    }

    const transactions = await prisma.transaction.findMany({
      where: txWhere,
    });

    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach((tx) => {
      const amount = parseFloat(tx.amount.toString());
      if (tx.type === TransactionType.INCOME) {
        totalIncome += amount;
      } else if (tx.type === TransactionType.EXPENSE) {
        totalExpense += amount;
      }
    });

    const netChange = totalIncome - totalExpense;

    return {
      netWorth,
      totalAssets,
      totalLiabilities,
      totalIncome,
      totalExpense,
      netChange,
      accountCount: accounts.length,
      transactionCount: transactions.length,
    };
  }

  static async getSpendingByCategory(userId: string, startDate?: Date, endDate?: Date) {
    const where: any = {
      userId,
      type: TransactionType.EXPENSE,
    };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    const expenses = await prisma.transaction.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, icon: true } },
      },
    });

    const categoryTotals = new Map<string, { id: string; name: string; icon: string; amount: number }>();
    let grandTotalExpense = 0;

    expenses.forEach((tx) => {
      const amt = parseFloat(tx.amount.toString());
      grandTotalExpense += amt;

      const catId = tx.categoryId || 'uncategorized';
      const catName = tx.category?.name || 'Uncategorized';
      const catIcon = tx.category?.icon || 'more-horizontal';

      const existing = categoryTotals.get(catId) || { id: catId, name: catName, icon: catIcon, amount: 0 };
      existing.amount += amt;
      categoryTotals.set(catId, existing);
    });

    const categoriesList = Array.from(categoryTotals.values()).map((cat) => ({
      ...cat,
      percentage: grandTotalExpense > 0 ? Math.round((cat.amount / grandTotalExpense) * 100) : 0,
    }));

    categoriesList.sort((a, b) => b.amount - a.amount);

    return {
      totalExpense: grandTotalExpense,
      categories: categoriesList,
    };
  }

  static async getSpendingTrend(userId: string, startDate?: Date, endDate?: Date) {
    const where: any = {
      userId,
      type: { in: [TransactionType.INCOME, TransactionType.EXPENSE] },
    };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    } else {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      where.date = { gte: thirtyDaysAgo };
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    const trendMap = new Map<string, { date: string; income: number; expense: number }>();

    transactions.forEach((tx) => {
      const dateStr = tx.date.toISOString().split('T')[0];
      const amt = parseFloat(tx.amount.toString());

      const existing = trendMap.get(dateStr) || { date: dateStr, income: 0, expense: 0 };
      if (tx.type === TransactionType.INCOME) {
        existing.income += amt;
      } else if (tx.type === TransactionType.EXPENSE) {
        existing.expense += amt;
      }
      trendMap.set(dateStr, existing);
    });

    return Array.from(trendMap.values());
  }
}
