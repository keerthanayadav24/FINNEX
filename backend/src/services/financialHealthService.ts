import { AccountType, TransactionType } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { RunwayService } from './runwayService.js';
import { GoalService } from './goalService.js';
import { BudgetService } from './budgetService.js';

export interface HealthComponentEvidence {
  label: string;
  value: string;
}

export interface HealthComponent {
  name: string;
  score: number;
  weight: number; // Decimal weight e.g. 0.20
  weightedScore: number;
  explanation: string;
  evidence: HealthComponentEvidence[];
}

export type HealthLevel = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'NEEDS_ATTENTION' | 'CRITICAL';

export interface FinancialHealthResponse {
  overallScore: number;
  healthLevel: HealthLevel;
  components: HealthComponent[];
  generatedAt: string;
}

export class FinancialHealthService {
  static async calculateHealth(userId: string): Promise<FinancialHealthResponse> {
    const now = new Date();

    // 1. Fetch transactions excluding transfers
    const nonTransferTxs = await prisma.transaction.findMany({
      where: { userId, type: { in: [TransactionType.INCOME, TransactionType.EXPENSE] } },
    });

    const totalIncome = nonTransferTxs
      .filter((t) => t.type === TransactionType.INCOME)
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

    const totalExpense = nonTransferTxs
      .filter((t) => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

    const fmtInr = (v: number) => `₹${Math.round(Math.abs(v)).toLocaleString('en-IN')}`;

    // --- COMPONENT 1: CASH FLOW (20%) ---
    let cashFlowScore = 70;
    let cashFlowExplanation = "You're earning more than you're spending, which gives you room to save.";

    if (nonTransferTxs.length === 0) {
      cashFlowScore = 50;
      cashFlowExplanation = "Keep tracking your spending so we can give you a more reliable picture of your cash flow.";
    } else if (totalExpense <= 0) {
      cashFlowScore = 100;
      cashFlowExplanation = 'Your income is comfortably higher than your spending this month.';
    } else {
      const ratio = totalIncome / totalExpense;
      if (ratio >= 1.25) {
        cashFlowScore = 100;
        cashFlowExplanation = 'Your income is comfortably higher than your spending, giving you room to save.';
      } else if (ratio >= 1.0) {
        cashFlowScore = 80;
        cashFlowExplanation = "Your income meets your current spending. Keeping an eye on expenses could give you more room to save.";
      } else {
        cashFlowScore = Math.max(10, Math.round(ratio * 70));
        cashFlowExplanation = 'Your spending is getting close to or exceeding your income. Keeping an eye on expenses could give you more room to save.';
      }
    }

    const cashFlowComponent: HealthComponent = {
      name: 'Cash Flow',
      score: cashFlowScore,
      weight: 0.20,
      weightedScore: Math.round(cashFlowScore * 0.20),
      explanation: cashFlowExplanation,
      evidence: [
        { label: 'Income', value: fmtInr(totalIncome) },
        { label: 'Spending', value: fmtInr(totalExpense) },
        { label: 'Left after spending', value: fmtInr(Math.max(0, totalIncome - totalExpense)) },
      ],
    };

    // --- COMPONENT 2: BUDGETING (20%) ---
    const budgets = await BudgetService.getUserBudgets(userId);

    let budgetScore = 100;
    let breachedCount = 0;
    let warningCount = 0;

    budgets.forEach((b) => {
      if (b.isExceeded) breachedCount++;
      else if (b.isWarning) warningCount++;
    });

    if (budgets.length === 0) {
      budgetScore = 75;
    } else {
      budgetScore = Math.max(0, 100 - breachedCount * 25 - warningCount * 10);
    }

    let budgetExplanation = "You're staying within your budgets.";
    if (budgets.length === 0) {
      budgetExplanation = 'No active budgets set up yet.';
    } else if (breachedCount > 0) {
      budgetExplanation = `${breachedCount} of your ${budgets.length} budget(s) have gone over their limits this month.`;
    } else if (warningCount > 0) {
      budgetExplanation = `Some of your budgets are close to their limit this month.`;
    }

    const budgetComponent: HealthComponent = {
      name: 'Budgeting',
      score: budgetScore,
      weight: 0.20,
      weightedScore: Math.round(budgetScore * 0.20),
      explanation: budgetExplanation,
      evidence: [
        { label: 'Active Budgets', value: `${budgets.length}` },
        { label: 'Over Budget', value: `${breachedCount}` },
        { label: 'Near Limit', value: `${warningCount}` },
      ],
    };

    // --- COMPONENT 3: DEBT (20%) ---
    const debtAccounts = await prisma.account.findMany({
      where: {
        userId,
        type: { in: [AccountType.CREDIT_CARD, AccountType.LOAN] },
      },
    });

    const totalDebt = debtAccounts.reduce(
      (sum, a) => sum + Math.abs(parseFloat(a.currentBalance.toString())),
      0
    );

    let debtScore = 100;
    if (debtAccounts.length > 0) {
      if (totalDebt === 0) {
        debtScore = 100;
      } else if (totalIncome > 0) {
        const debtToIncomeRatio = totalDebt / totalIncome;
        if (debtToIncomeRatio <= 0.2) debtScore = 90;
        else if (debtToIncomeRatio <= 0.5) debtScore = 70;
        else if (debtToIncomeRatio <= 1.0) debtScore = 50;
        else debtScore = 30;
      } else {
        debtScore = Math.max(20, 100 - Math.round(totalDebt / 1000) * 5);
      }
    }

    let debtExplanation = 'Zero active debt across your accounts.';
    if (debtAccounts.length > 0) {
      debtExplanation = `You have ${fmtInr(totalDebt)} remaining across ${debtAccounts.length} account(s). Paying down debt consistently improves financial flexibility.`;
    }

    const debtComponent: HealthComponent = {
      name: 'Debt',
      score: debtScore,
      weight: 0.20,
      weightedScore: Math.round(debtScore * 0.20),
      explanation: debtExplanation,
      evidence: [
        { label: 'Debt Accounts', value: `${debtAccounts.length}` },
        { label: 'Remaining Balance', value: fmtInr(totalDebt) },
      ],
    };

    // --- COMPONENT 4: GOALS (20%) ---
    const goals = await GoalService.getGoals(userId);

    let goalScore = 75;
    let onTrackCount = 0;

    if (goals.length > 0) {
      goals.forEach((g) => {
        if (g.metrics.status === 'ON_TRACK' || g.metrics.status === 'AHEAD' || g.metrics.status === 'COMPLETED') {
          onTrackCount++;
        }
      });
      goalScore = Math.round((onTrackCount / goals.length) * 100);
    }

    let goalExplanation = 'No active financial goals set yet.';
    if (goals.length > 0) {
      if (onTrackCount === 0) {
        goalExplanation = 'None of your current goals are on track yet.';
      } else {
        goalExplanation = `${onTrackCount} of your ${goals.length} goal(s) are currently on track.`;
      }
    }

    const goalComponent: HealthComponent = {
      name: 'Goals',
      score: goalScore,
      weight: 0.20,
      weightedScore: Math.round(goalScore * 0.20),
      explanation: goalExplanation,
      evidence: [
        { label: 'Active Goals', value: `${goals.length}` },
        { label: 'On Track', value: `${onTrackCount}` },
      ],
    };

    // --- COMPONENT 5: SAVINGS (20%) ---
    const runway = await RunwayService.calculateRunway(userId);

    let reserveScore = 50;
    if (runway.estimatedRunwayMonths !== null) {
      const months = runway.estimatedRunwayMonths;
      if (months >= 6) reserveScore = 100;
      else if (months >= 3) reserveScore = 80;
      else if (months >= 1) reserveScore = 60;
      else reserveScore = 30;
    }

    let reserveExplanation = 'We need a little more spending history before we can estimate how long your savings could last.';
    if (runway.estimatedRunwayMonths !== null) {
      reserveExplanation = `Your current savings could cover about ${runway.estimatedRunwayMonths} months of your usual spending.`;
    }

    const reserveComponent: HealthComponent = {
      name: 'Savings',
      score: reserveScore,
      weight: 0.20,
      weightedScore: Math.round(reserveScore * 0.20),
      explanation: reserveExplanation,
      evidence: [
        { label: 'Savings Available', value: fmtInr(runway.liquidAssets) },
        { label: 'Estimated Coverage', value: runway.estimatedRunwayMonths !== null ? `${runway.estimatedRunwayMonths} months` : 'N/A' },
      ],
    };

    const components = [cashFlowComponent, budgetComponent, debtComponent, goalComponent, reserveComponent];
    const overallScore = components.reduce((sum, c) => sum + c.weightedScore, 0);

    let healthLevel: HealthLevel = 'FAIR';
    if (overallScore >= 90) healthLevel = 'EXCELLENT';
    else if (overallScore >= 75) healthLevel = 'GOOD';
    else if (overallScore >= 60) healthLevel = 'FAIR';
    else if (overallScore >= 45) healthLevel = 'NEEDS_ATTENTION';
    else healthLevel = 'CRITICAL';

    return {
      overallScore,
      healthLevel,
      components,
      generatedAt: now.toISOString(),
    };
  }
}
