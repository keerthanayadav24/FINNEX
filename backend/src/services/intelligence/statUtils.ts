export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function calculateMAD(values: number[], targetMedian?: number): number {
  if (values.length === 0) return 0;
  const med = targetMedian !== undefined ? targetMedian : calculateMedian(values);
  const absoluteDeviations = values.map((val) => Math.abs(val - med));
  return calculateMedian(absoluteDeviations);
}

export function calculateRobustScore(
  candidateValue: number,
  historicalValues: number[]
): { score: number; median: number; mad: number } {
  if (historicalValues.length === 0) {
    return { score: 0, median: 0, mad: 0 };
  }

  const median = calculateMedian(historicalValues);
  const mad = calculateMAD(historicalValues, median);

  let score = 0;
  if (mad > 0) {
    score = (0.6745 * Math.abs(candidateValue - median)) / mad;
  } else {
    // If MAD is 0 (all historical transactions identical), measure relative ratio
    const dev = Math.abs(candidateValue - median);
    score = dev === 0 ? 0 : dev / (0.1 * (median || 1));
  }

  return { score: Math.round(score * 100) / 100, median, mad };
}

export function detectRecurringPattern(
  merchant: string | null,
  amount: number,
  userTransactions: { merchant: string | null; amount: any; date: Date }[]
): boolean {
  if (!merchant || !merchant.trim()) return false;

  const normalizedMerchant = merchant.toLowerCase().trim();
  const merchantTxs = userTransactions.filter(
    (tx) => tx.merchant && tx.merchant.toLowerCase().trim() === normalizedMerchant
  );

  if (merchantTxs.length < 2) return false;

  // Filter transactions with amounts within ±15% variance of target amount
  const similarAmountTxs = merchantTxs.filter((tx) => {
    const txAmt = parseFloat(tx.amount.toString());
    const diff = Math.abs(txAmt - amount);
    return diff / (amount || 1) <= 0.15;
  });

  if (similarAmountTxs.length < 2) return false;

  // Verify occurrence across 2+ distinct calendar months
  const distinctMonths = new Set(
    similarAmountTxs.map((tx) => `${tx.date.getFullYear()}-${tx.date.getMonth()}`)
  );

  return distinctMonths.size >= 2;
}

export function calculateWeightedMovingAverage(monthlyAmounts: number[]): number {
  if (monthlyAmounts.length === 0) return 0;
  if (monthlyAmounts.length === 1) return monthlyAmounts[0];
  if (monthlyAmounts.length === 2) {
    return monthlyAmounts[0] * 0.65 + monthlyAmounts[1] * 0.35;
  }

  // Use last 3 months with weights 0.50 (most recent), 0.33, 0.17
  const recent = monthlyAmounts.slice(-3);
  if (recent.length === 3) {
    const val = recent[2] * 0.5 + recent[1] * 0.33 + recent[0] * 0.17;
    return Math.round(val * 100) / 100;
  }

  const sum = recent.reduce((a, b) => a + b, 0);
  return Math.round((sum / recent.length) * 100) / 100;
}
