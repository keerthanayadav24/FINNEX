export type GoalStatus =
  | 'ON_TRACK'
  | 'BEHIND'
  | 'AHEAD'
  | 'COMPLETED'
  | 'NO_TARGET_DATE'
  | 'INSUFFICIENT_DATA';

export interface GoalPlanningMetrics {
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  progressPercentage: number;
  displayPercentage: number;
  isOverachieved: boolean;
  overachievedAmount: number;
  requiredMonthlyContribution: number | null;
  averageMonthlyContribution: number;
  hasSufficientHistory: boolean;
  status: GoalStatus;
  projectedCompletionDate: string | null;
  humanExplanation: string;
}

export function calculateProgress(currentAmount: number, targetAmount: number) {
  if (targetAmount <= 0) {
    return { progressPercentage: 0, displayPercentage: 0, isOverachieved: false, overachievedAmount: 0 };
  }
  const rawPct = (currentAmount / targetAmount) * 100;
  const progressPercentage = Math.round(rawPct * 100) / 100;
  const displayPercentage = Math.min(100, Math.max(0, progressPercentage));
  const isOverachieved = currentAmount > targetAmount;
  const overachievedAmount = isOverachieved ? Math.round((currentAmount - targetAmount) * 100) / 100 : 0;

  return { progressPercentage, displayPercentage, isOverachieved, overachievedAmount };
}

export function calculateRemaining(currentAmount: number, targetAmount: number): number {
  return Math.max(0, Math.round((targetAmount - currentAmount) * 100) / 100);
}

export function calculateRequiredMonthlyContribution(
  currentAmount: number,
  targetAmount: number,
  targetDate: Date | null,
  now: Date = new Date()
): number | null {
  const remaining = calculateRemaining(currentAmount, targetAmount);
  if (remaining === 0) return 0;
  if (!targetDate) return null;

  if (targetDate <= now) return remaining;

  // Calculate calendar month difference
  const yearDiff = targetDate.getFullYear() - now.getFullYear();
  const monthDiff = yearDiff * 12 + (targetDate.getMonth() - now.getMonth());

  if (monthDiff <= 0) return remaining;

  return Math.round((remaining / monthDiff) * 100) / 100;
}

export function calculateAverageMonthlyContribution(
  contributions: { amount: any; date: Date; isInitial: boolean }[],
  now: Date = new Date()
): { average: number; hasSufficientHistory: boolean } {
  // Exclude initial opening balance contributions from monthly recurring pace
  const regularContributions = contributions.filter((c) => !c.isInitial);

  if (regularContributions.length === 0) {
    return { average: 0, hasSufficientHistory: false };
  }

  // Check temporal coverage (needs at least 15 days or 2 distinct dates across past months)
  const dates = regularContributions.map((c) => new Date(c.date).getTime()).sort((a, b) => a - b);
  const timeSpanDays = (dates[dates.length - 1] - dates[0]) / (1000 * 3600 * 24);

  const distinctMonths = new Set(
    regularContributions.map((c) => {
      const d = new Date(c.date);
      return `${d.getFullYear()}-${d.getMonth()}`;
    })
  );

  // Insufficient history if all contributions occurred on same day or span < 14 days without 2+ months
  const hasSufficientHistory = regularContributions.length >= 2 && (timeSpanDays >= 14 || distinctMonths.size >= 2);

  // Evaluate over past 3 complete calendar months plus current month
  const c3Months = [0, 1, 2].map((i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${d.getFullYear()}-${d.getMonth()}`;
  });

  const monthTotals = new Map<string, number>();
  c3Months.forEach((mKey) => monthTotals.set(mKey, 0));

  regularContributions.forEach((c) => {
    const d = new Date(c.date);
    const mKey = `${d.getFullYear()}-${d.getMonth()}`;
    if (monthTotals.has(mKey)) {
      monthTotals.set(mKey, (monthTotals.get(mKey) || 0) + parseFloat(c.amount.toString()));
    }
  });

  // Calculate average over 3 months (denominator is 3)
  let sum = 0;
  monthTotals.forEach((val) => (sum += val));

  const average = Math.round((sum / 3) * 100) / 100;

  return { average, hasSufficientHistory };
}

export function calculateGoalStatus(
  currentAmount: number,
  targetAmount: number,
  targetDate: Date | null,
  requiredMonthly: number | null,
  averageMonthly: number,
  hasSufficientHistory: boolean,
  now: Date = new Date()
): GoalStatus {
  if (currentAmount >= targetAmount) {
    return 'COMPLETED';
  }

  if (!targetDate) {
    return 'NO_TARGET_DATE';
  }

  if (targetDate <= now) {
    return 'BEHIND';
  }

  if (!hasSufficientHistory) {
    return 'INSUFFICIENT_DATA';
  }

  if (requiredMonthly === null || requiredMonthly === 0) {
    return 'ON_TRACK';
  }

  if (averageMonthly >= requiredMonthly * 1.15) {
    return 'AHEAD';
  } else if (averageMonthly >= requiredMonthly) {
    return 'ON_TRACK';
  } else {
    return 'BEHIND';
  }
}

export function calculateProjectedCompletionDate(
  remainingAmount: number,
  averageMonthly: number,
  now: Date = new Date()
): string | null {
  if (remainingAmount === 0) {
    return now.toISOString();
  }

  if (averageMonthly <= 0) {
    return null;
  }

  const monthsNeeded = Math.ceil(remainingAmount / averageMonthly);
  const projectedDate = new Date(now.getFullYear(), now.getMonth() + monthsNeeded, now.getDate());

  return projectedDate.toISOString();
}

function fmtInr(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '₹0';
  }
  const numeric = Math.round(Number(amount));
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(numeric);
  return `₹${formatted}`;
}

export function generatePlanningExplanation(metrics: {
  status: GoalStatus;
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  requiredMonthlyContribution: number | null;
  averageMonthlyContribution: number;
  projectedCompletionDate: string | null;
  isOverachieved: boolean;
  overachievedAmount: number;
}): string {
  if (metrics.status === 'COMPLETED') {
    if (metrics.isOverachieved) {
      return `Goal achieved! You saved ${fmtInr(metrics.currentAmount)}, exceeding your ${fmtInr(metrics.targetAmount)} target by ${fmtInr(metrics.overachievedAmount)}.`;
    }
    return `Goal achieved! You have saved the full target amount of ${fmtInr(metrics.targetAmount)}.`;
  }

  if (metrics.status === 'NO_TARGET_DATE') {
    return `You have saved ${fmtInr(metrics.currentAmount)} (${fmtInr(metrics.remainingAmount)} remaining). Set a target date to calculate required monthly contributions.`;
  }

  if (metrics.status === 'BEHIND' && metrics.requiredMonthlyContribution !== null) {
    return `You need ${fmtInr(metrics.remainingAmount)} more to reach your goal. To stay on schedule, you need ${fmtInr(metrics.requiredMonthlyContribution)}/month.`;
  }

  if (metrics.status === 'INSUFFICIENT_DATA') {
    return `You need ${fmtInr(metrics.remainingAmount)} more to reach your target date. Regular contributions will help estimate your completion date.`;
  }

  if (metrics.projectedCompletionDate && metrics.requiredMonthlyContribution !== null) {
    const projDate = new Date(metrics.projectedCompletionDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    return `At your average contribution pace of ${fmtInr(metrics.averageMonthlyContribution)}/month, you are on track to complete this goal by ${projDate}.`;
  }

  return `You need ${fmtInr(metrics.remainingAmount)} more to reach your target of ${fmtInr(metrics.targetAmount)}.`;
}
