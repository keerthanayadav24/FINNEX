import { TransactionType, AccountType, BudgetPeriod } from '@prisma/client';
import { ActionItem, DebtPayoffPlan, RecurringSubscription, BillReminder } from './actionTypes.js';

export function calculateBudgetPacing(
  budget: {
    id: string;
    name: string;
    amount: any;
    spentAmount?: number;
    remainingAmount?: number;
    usagePercentage?: number;
    isWarning?: boolean;
    isExceeded?: boolean;
    period?: BudgetPeriod;
    startDate?: Date | string;
    endDate?: Date | string | null;
    category?: { name: string } | null;
  },
  now: Date = new Date()
): ActionItem | null {
  const budgetAmt = parseFloat(budget.amount.toString());
  if (budgetAmt <= 0) return null;

  const actualSpent = budget.spentAmount ?? 0;
  const remaining = budget.remainingAmount ?? Math.max(0, Math.round((budgetAmt - actualSpent) * 100) / 100);
  const utilizationRatio = budget.usagePercentage !== undefined ? budget.usagePercentage / 100 : (budgetAmt > 0 ? actualSpent / budgetAmt : 0);
  const rawCatName = budget.category?.name || budget.name;
  const catName = rawCatName.replace(/\s+budget$/i, '');

  const fmt = (v: number) => `₹${Math.round(Math.abs(v)).toLocaleString('en-IN')}`;

  // 1. Critical Breach (>= 100%)
  if (utilizationRatio >= 1.0) {
    return {
      id: `overspend_breach_${budget.id}`,
      type: 'OVERSPEND_NUDGE',
      severity: 'HIGH',
      title: `Your ${catName} budget has been exceeded`,
      summary: `You've spent ${fmt(actualSpent)} against your ${fmt(budgetAmt)} budget this month.`,
      explanation: `Your spending in ${catName} has surpassed your allocated monthly target by ${fmt(Math.abs(remaining))}.`,
      evidence: [
        { label: 'Planned Budget', value: fmt(budgetAmt) },
        { label: 'Current Spent', value: fmt(actualSpent) },
        { label: 'Status', value: `${(utilizationRatio * 100).toFixed(0)}% used` },
      ],
      actionText: `Consider keeping your ${catName} spending lower for the rest of the month.`,
      estimatedImpact: Math.abs(remaining),
      relatedCategoryId: budget.category ? budget.id : undefined,
      confidence: 'HIGH',
      createdAt: now.toISOString(),
      priorityScore: 90 + Math.min(10, actualSpent / 100),
    };
  }

  // 2. Warning Threshold (>= 80%)
  if (utilizationRatio >= 0.8) {
    return {
      id: `overspend_warning_${budget.id}`,
      type: 'OVERSPEND_NUDGE',
      severity: 'MEDIUM',
      title: `Your ${catName} budget is almost full`,
      summary: `You've spent ${fmt(actualSpent)} of your ${fmt(budgetAmt)} budget with ${fmt(remaining)} remaining.`,
      explanation: `You have consumed ${(utilizationRatio * 100).toFixed(0)}% of your ${catName} budget for this month.`,
      evidence: [
        { label: 'Planned Budget', value: fmt(budgetAmt) },
        { label: 'Current Spent', value: fmt(actualSpent) },
        { label: 'Remaining', value: fmt(remaining) },
      ],
      actionText: `Consider keeping your ${catName} spending lower for the rest of the month.`,
      estimatedImpact: remaining,
      relatedCategoryId: budget.category ? budget.id : undefined,
      confidence: 'HIGH',
      createdAt: now.toISOString(),
      priorityScore: 70 + utilizationRatio * 10,
    };
  }

  // 3. Early-Month Budget Pacing Warning
  const year = now.getFullYear();
  const month = now.getMonth();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const currentDay = now.getDate();

  if (currentDay > 2 && currentDay < totalDays - 3) {
    const elapsedRatio = currentDay / totalDays;
    const pacingThreshold = elapsedRatio + 0.20;

    if (utilizationRatio > pacingThreshold && utilizationRatio > 0.30) {
      return {
        id: `overspend_pacing_${budget.id}`,
        type: 'OVERSPEND_NUDGE',
        severity: 'MEDIUM',
        title: `Your ${catName} spending is pacing faster than planned`,
        summary: `You've used ${(utilizationRatio * 100).toFixed(0)}% of your ${catName} budget by Day ${currentDay} of the month.`,
        explanation: `At Day ${currentDay} of the month (${(elapsedRatio * 100).toFixed(0)}% of the month passed), you have spent ${fmt(actualSpent)} out of your ${fmt(budgetAmt)} limit.`,
        evidence: [
          { label: 'Month Elapsed', value: `${currentDay} of ${totalDays} days` },
          { label: 'Budget Used', value: `${fmt(actualSpent)} (${(utilizationRatio * 100).toFixed(0)}%)` },
        ],
        actionText: `Consider keeping your ${catName} spending lower for the rest of the month to stay on track.`,
        estimatedImpact: remaining,
        confidence: 'MEDIUM',
        createdAt: now.toISOString(),
        priorityScore: 65 + (utilizationRatio - elapsedRatio) * 20,
      };
    }
  }

  return null;
}

export function detectRecurringSubscriptions(
  transactions: { id: string; merchant: string | null; amount: any; type: TransactionType; date: Date }[]
): RecurringSubscription[] {
  const expenseTxs = transactions.filter(
    (t) => t.type === TransactionType.EXPENSE && t.merchant && t.merchant.trim()
  );

  const merchantGroups = new Map<string, typeof expenseTxs>();
  expenseTxs.forEach((tx) => {
    const mKey = tx.merchant!.toLowerCase().trim();
    const list = merchantGroups.get(mKey) || [];
    list.push(tx);
    merchantGroups.set(mKey, list);
  });

  const subscriptions: RecurringSubscription[] = [];

  merchantGroups.forEach((txs, mKey) => {
    if (txs.length < 2) return;

    const distinctMonths = new Set(txs.map((t) => `${t.date.getFullYear()}-${t.date.getMonth()}`));
    if (distinctMonths.size < 2) return;

    const amounts = txs.map((t) => parseFloat(t.amount.toString()));
    const sortedAmts = [...amounts].sort((a, b) => a - b);
    const medianAmt = sortedAmts[Math.floor(sortedAmts.length / 2)];

    const variances = amounts.map((a) => Math.abs(a - medianAmt) / (medianAmt || 1));
    const maxVariance = Math.max(...variances);

    let confidence: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (distinctMonths.size >= 5 && maxVariance <= 0.15) {
      confidence = 'HIGH';
    } else if (distinctMonths.size >= 3 && maxVariance <= 0.20) {
      confidence = 'MEDIUM';
    } else if (distinctMonths.size >= 2) {
      confidence = 'LOW';
    }

    const merchantDisplayName = txs[0].merchant!;
    const fmtAmt = `₹${Math.round(medianAmt).toLocaleString('en-IN')}`;

    subscriptions.push({
      id: `sub_${mKey}`,
      merchant: merchantDisplayName,
      averageAmount: Math.round(medianAmt * 100) / 100,
      frequency: 'MONTHLY',
      occurrenceCount: txs.length,
      distinctMonthsCount: distinctMonths.size,
      confidence,
      lastOccurrenceDate: txs[0].date.toISOString(),
      summary: `Appears to be a regular monthly payment of ${fmtAmt}/month.`,
      actionableAdvice: `Take a quick look to make sure you're still happy with this recurring payment.`,
    });
  });

  return subscriptions;
}

export function calculateExpectedBillReminders(
  subscriptions: RecurringSubscription[],
  transactions: { merchant: string | null; date: Date }[],
  now: Date = new Date()
): BillReminder[] {
  const reminders: BillReminder[] = [];

  subscriptions.forEach((sub) => {
    const mKey = sub.merchant.toLowerCase().trim();
    const subTxs = transactions.filter(
      (t) => t.merchant && t.merchant.toLowerCase().trim() === mKey
    );

    if (subTxs.length < 2) return;

    const days = subTxs.map((t) => new Date(t.date).getDate()).sort((a, b) => a - b);
    const medianDay = days[Math.floor(days.length / 2)];

    reminders.push({
      id: `bill_${mKey}`,
      merchant: sub.merchant,
      expectedAmount: sub.averageAmount,
      expectedDayOfMonth: medianDay,
      expectedDateWindow: `Usually due around the ${medianDay}${getDaySuffix(medianDay)}`,
      summary: `Based on your past spending, this payment usually happens around the ${medianDay}${getDaySuffix(medianDay)}.`,
    });
  });

  return reminders;
}

export function calculateDebtPayoffPlans(
  accounts: {
    id: string;
    name: string;
    type: AccountType;
    currentBalance: any;
    interestRate?: any;
  }[]
): { snowball: DebtPayoffPlan; avalanche: DebtPayoffPlan } {
  const debtAccounts = accounts.filter(
    (a) => a.type === AccountType.CREDIT_CARD || a.type === AccountType.LOAN
  );

  const normalizedDebts = debtAccounts.map((acc) => {
    const balanceNum = parseFloat(acc.currentBalance.toString());
    const outstandingPrincipal = Math.abs(balanceNum);
    const rate = acc.interestRate !== undefined && acc.interestRate !== null ? parseFloat(acc.interestRate.toString()) : null;

    return {
      id: acc.id,
      name: acc.name,
      type: acc.type,
      outstandingPrincipal: Math.round(outstandingPrincipal * 100) / 100,
      interestRate: rate !== null && !isNaN(rate) && rate >= 0 ? rate : null,
    };
  });

  const totalDebt = normalizedDebts.reduce((sum, d) => sum + d.outstandingPrincipal, 0);

  // 1. Quick Wins Strategy (Smallest balance first)
  const snowballItems = [...normalizedDebts].sort((a, b) => a.outstandingPrincipal - b.outstandingPrincipal);
  const snowball: DebtPayoffPlan = {
    strategy: 'DEBT_SNOWBALL',
    totalOutstandingDebt: Math.round(totalDebt * 100) / 100,
    status: normalizedDebts.length > 0 ? 'READY' : 'INSUFFICIENT_DATA',
    orderedDebts: snowballItems,
    summary: `Start with your smallest balance first. This can help you clear one debt sooner and build momentum.`,
  };

  // 2. Save on Interest Strategy (Highest interest rate first)
  const hasMissingInterestRates = normalizedDebts.some((d) => d.interestRate === null);

  let avalancheStatus: 'READY' | 'INSUFFICIENT_DATA' = 'READY';
  let avalancheItems = [...normalizedDebts];

  if (hasMissingInterestRates || normalizedDebts.length === 0) {
    avalancheStatus = 'INSUFFICIENT_DATA';
    avalancheItems = [];
  } else {
    avalancheItems.sort((a, b) => (b.interestRate || 0) - (a.interestRate || 0));
  }

  const avalanche: DebtPayoffPlan = {
    strategy: 'DEBT_AVALANCHE',
    totalOutstandingDebt: Math.round(totalDebt * 100) / 100,
    status: avalancheStatus,
    orderedDebts: avalancheItems,
    summary: avalancheStatus === 'READY'
      ? `Focus on the debt with the highest interest rate first. This can reduce the total interest you pay over time.`
      : 'Add your interest rates to see which approach could save you more.',
  };

  return { snowball, avalanche };
}

export function calculateGoalCategoryOpportunity(
  goal: {
    id: string;
    name: string;
    currentAmount: number;
    targetAmount: number;
    targetDate?: string | null;
    metrics?: {
      status: string;
      remainingAmount: number;
      requiredMonthlyContribution: number | null;
      averageMonthlyContribution: number;
    };
  },
  trendDrivers: {
    categoryName: string;
    categoryId?: string;
    changeAmount: number;
    currentAmount: number;
    previousAmount: number;
  }[],
  now: Date = new Date()
): ActionItem | null {
  if (!goal.metrics || goal.currentAmount >= goal.targetAmount) return null;

  const reqMonthly = goal.metrics.requiredMonthlyContribution || 0;
  const avgMonthly = goal.metrics.averageMonthlyContribution || 0;
  const gap = Math.max(0, reqMonthly - avgMonthly);

  if (gap <= 0) return null;

  const candidate = trendDrivers.find((d) => d.changeAmount >= 50);
  if (!candidate) return null;

  const catName = candidate.categoryName;
  const impactAmount = Math.min(candidate.changeAmount, gap);
  const fmtInr = (v: number) => `₹${Math.round(Math.abs(v)).toLocaleString('en-IN')}`;

  return {
    id: `goal_opp_${goal.id}_${candidate.categoryId || catName.toLowerCase()}`,
    type: 'GOAL_RECOMMENDATION',
    severity: 'MEDIUM',
    title: `Your ${goal.name} goal needs a little help`,
    summary: `You're currently behind your monthly target. Reducing some avoidable spending could help you put more toward this goal.`,
    explanation: `${catName} spending has increased recently. Reducing this spending by around ${fmtInr(impactAmount)} a month could help you put more toward your goal.`,
    evidence: [
      { label: 'Monthly Goal Gap', value: fmtInr(gap) },
      { label: `${catName} Increase`, value: `+${fmtInr(candidate.changeAmount)}` },
      { label: 'Previous Spending', value: fmtInr(candidate.previousAmount) },
      { label: 'Current Spending', value: fmtInr(candidate.currentAmount) },
    ],
    actionText: `${catName} spending has increased recently. Reducing this spending by around ${fmtInr(impactAmount)} a month could help you put more toward your goal.`,
    estimatedImpact: impactAmount,
    relatedGoalId: goal.id,
    confidence: 'HIGH',
    createdAt: now.toISOString(),
    priorityScore: 80 + Math.min(15, impactAmount / 100),
  };
}

function getDaySuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}
