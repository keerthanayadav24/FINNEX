import { Prisma, BudgetPeriod, TransactionType } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export class BudgetService {
  static async getUserBudgets(userId: string) {
    const budgets = await prisma.budget.findMany({
      where: { userId },
      include: {
        category: { select: { id: true, name: true, icon: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Fetch user EXPENSE transactions strictly excluding INCOME and TRANSFER
    const userExpenses = await prisma.transaction.findMany({
      where: {
        userId,
        type: TransactionType.EXPENSE,
      },
    });

    return budgets.map((b) => {
      const budgetAmount = parseFloat(b.amount.toString());
      const periodStart = b.startDate ? new Date(b.startDate) : currentMonthStart;
      const periodEnd = b.endDate ? new Date(b.endDate) : currentMonthEnd;

      // Filter expenses belonging to budget period and category
      const relevantExpenses = userExpenses.filter((tx) => {
        const txDate = new Date(tx.date);

        // Date check: if budget has specific endDate, use that; otherwise current month window
        const inPeriod = txDate >= (b.startDate ? periodStart : currentMonthStart) && txDate <= (b.endDate ? periodEnd : currentMonthEnd);
        if (!inPeriod) return false;

        // Category check: if budget has categoryId, match it; otherwise match all expenses
        if (b.categoryId) {
          return tx.categoryId === b.categoryId;
        }
        return true;
      });

      const spentAmount = Math.round(relevantExpenses.reduce((sum, tx) => sum + parseFloat(tx.amount.toString()), 0) * 100) / 100;
      const remainingAmount = Math.max(0, Math.round((budgetAmount - spentAmount) * 100) / 100);
      const usagePercentage = budgetAmount > 0 ? Math.round((spentAmount / budgetAmount) * 100) : 0;
      const isWarning = usagePercentage >= 80 && usagePercentage < 100;
      const isExceeded = usagePercentage >= 100;

      return {
        ...b,
        amount: budgetAmount,
        spentAmount,
        remainingAmount,
        usagePercentage,
        isWarning,
        isExceeded,
      };
    });
  }

  static async createBudget(
    userId: string,
    data: {
      name: string;
      categoryId?: string | null;
      amount: number;
      period?: BudgetPeriod;
      startDate: Date;
      endDate?: Date | null;
    }
  ) {
    // Foreign key attack prevention: Verify category ownership if categoryId provided
    if (data.categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: data.categoryId,
          OR: [{ isSystem: true }, { userId }],
        },
      });
      if (!category) {
        throw new AppError('Category not found or access denied', 404, 'NOT_FOUND');
      }
    }

    return prisma.budget.create({
      data: {
        userId,
        name: data.name,
        categoryId: data.categoryId || null,
        amount: new Prisma.Decimal(data.amount),
        period: data.period || BudgetPeriod.MONTHLY,
        startDate: data.startDate,
        endDate: data.endDate || null,
      },
      include: {
        category: true,
      },
    });
  }

  static async getBudgetById(userId: string, budgetId: string) {
    const budget = await prisma.budget.findFirst({
      where: { id: budgetId, userId },
      include: { category: true },
    });

    if (!budget) {
      throw new AppError('Budget not found', 404, 'NOT_FOUND');
    }

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const relevantExpenses = await prisma.transaction.findMany({
      where: {
        userId,
        type: TransactionType.EXPENSE,
        ...(budget.categoryId ? { categoryId: budget.categoryId } : {}),
        date: {
          gte: budget.startDate ? new Date(budget.startDate) : currentMonthStart,
          lte: budget.endDate ? new Date(budget.endDate) : currentMonthEnd,
        },
      },
    });

    const budgetAmount = parseFloat(budget.amount.toString());
    const spentAmount = Math.round(relevantExpenses.reduce((sum, tx) => sum + parseFloat(tx.amount.toString()), 0) * 100) / 100;
    const remainingAmount = Math.max(0, Math.round((budgetAmount - spentAmount) * 100) / 100);
    const usagePercentage = budgetAmount > 0 ? Math.round((spentAmount / budgetAmount) * 100) : 0;
    const isWarning = usagePercentage >= 80 && usagePercentage < 100;
    const isExceeded = usagePercentage >= 100;

    return {
      ...budget,
      amount: budgetAmount,
      spentAmount,
      remainingAmount,
      usagePercentage,
      isWarning,
      isExceeded,
    };
  }
}
