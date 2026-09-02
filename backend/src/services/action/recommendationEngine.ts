import { TransactionType } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { TrendAnalysisService } from '../intelligence/trendAnalysisService.js';
import { GoalService } from '../goalService.js';
import { BudgetService } from '../budgetService.js';
import {
  calculateBudgetPacing,
  detectRecurringSubscriptions,
  calculateExpectedBillReminders,
  calculateDebtPayoffPlans,
  calculateGoalCategoryOpportunity,
} from './actionUtils.js';
import { ActionEngineResponse, ActionItem } from './actionTypes.js';

export class RecommendationEngine {
  static async getActions(userId: string): Promise<ActionEngineResponse> {
    const now = new Date();

    // 1. Fetch budgets using BudgetService as single source of truth (includes calculated spentAmount & period logic)
    const budgets = await BudgetService.getUserBudgets(userId);

    // 2. Fetch all transactions for subscription/bill detection
    const allTransactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });

    // CRITICAL: Filter out TRANSFERS before running Action Engine calculations
    const nonTransferTxs = allTransactions.filter((t) => t.type !== TransactionType.TRANSFER);

    // 3. Fetch accounts for Debt Payoff Optimizer
    const accounts = await prisma.account.findMany({
      where: { userId },
    });

    // 4. Fetch Stage 2 Trend Intelligence
    const trendResult = await TrendAnalysisService.analyzeTrends(userId);

    // 5. Fetch Stage 3 Goals with planning metrics
    const goals = await GoalService.getGoals(userId);

    // --- EXECUTE SUB-SERVICES ---

    // A. Overspend & Pacing Nudges
    const nudges: ActionItem[] = [];
    budgets.forEach((b) => {
      const nudge = calculateBudgetPacing(b, now);
      if (nudge) nudges.push(nudge);
    });

    // B. Subscriptions & Bill Reminders
    const subscriptions = detectRecurringSubscriptions(nonTransferTxs);
    const billReminders = calculateExpectedBillReminders(subscriptions, nonTransferTxs, now);

    // C. Debt Payoff Optimizer
    const debtPlans = calculateDebtPayoffPlans(accounts);

    // D. Goal Opportunities
    const goalActions: ActionItem[] = [];
    if (trendResult.status === 'SUCCESS' && trendResult.categoryDrivers) {
      goals.forEach((g) => {
        const opp = calculateGoalCategoryOpportunity(g, trendResult.categoryDrivers, now);
        if (opp) goalActions.push(opp);
      });
    }

    // Combine all recommendation actions
    const allActionItems: ActionItem[] = [...nudges, ...goalActions];

    // Add Subscription review action if subscriptions exist
    if (subscriptions.length > 0) {
      const topSub = subscriptions[0];
      allActionItems.push({
        id: `action_sub_review`,
        type: 'SUBSCRIPTION_AUDIT',
        severity: 'LOW',
        title: 'Review Recurring Charges',
        summary: `Detected ${subscriptions.length} recurring subscription charge(s) such as ${topSub.merchant} ($${topSub.averageAmount.toFixed(2)}/mo).`,
        explanation: `${topSub.merchant} appears to be a recurring monthly charge based on your transaction history. Review whether you still need all active subscriptions.`,
        evidence: [
          { label: 'Recurring Subscriptions', value: `${subscriptions.length} detected` },
          { label: 'Sample Charge', value: `${topSub.merchant} ($${topSub.averageAmount.toFixed(2)}/mo)` },
        ],
        actionText: `Review your recurring charges in the Action Center to optimize unused services.`,
        estimatedImpact: topSub.averageAmount,
        confidence: topSub.confidence,
        createdAt: now.toISOString(),
        priorityScore: 50,
      });
    }

    // Add Debt optimization action if debts exist
    if (debtPlans.snowball.orderedDebts.length > 0) {
      const debtCount = debtPlans.snowball.orderedDebts.length;
      allActionItems.push({
        id: `action_debt_plan`,
        type: 'DEBT_PAYOFF',
        severity: 'LOW',
        title: 'Debt Payoff Optimizer Available',
        summary: `You have ${debtCount} debt account(s) totaling $${debtPlans.snowball.totalOutstandingDebt.toFixed(2)}. Compare Snowball vs Avalanche payoff plans.`,
        explanation: `Comparing Debt Snowball (paying smallest balance first) and Debt Avalanche (paying highest interest first) can help accelerate your debt payoff schedule.`,
        evidence: [
          { label: 'Active Debt Accounts', value: `${debtCount}` },
          { label: 'Total Outstanding Balance', value: `$${debtPlans.snowball.totalOutstandingDebt.toFixed(2)}` },
        ],
        actionText: `Review your Debt Payoff plan options in the Action Center.`,
        confidence: 'HIGH',
        createdAt: now.toISOString(),
        priorityScore: 40,
      });
    }

    // Sort all actions descending by priorityScore
    allActionItems.sort((a, b) => b.priorityScore - a.priorityScore);

    // Cap top 5 active recommendations
    const topRecommendations = allActionItems.slice(0, 5);

    return {
      recommendations: topRecommendations,
      nudges,
      subscriptions,
      debtPlans,
      billReminders,
    };
  }
}
