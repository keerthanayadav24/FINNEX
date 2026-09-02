export type DataQuality = 'LOW' | 'MEDIUM' | 'HIGH' | 'INSUFFICIENT_DATA';

export interface CategoryDriver {
  categoryId: string;
  categoryName: string;
  icon: string;
  currentAmount: number;
  previousAmount: number;
  changeAmount: number;
  changePercentage: number | null; // null if previousAmount === 0
  contributionPercentage: number;
  explanation: string;
  topMerchants: {
    merchant: string;
    currentAmount: number;
    previousAmount: number;
    changeAmount: number;
  }[];
}

export interface TrendInsight {
  status: 'SUCCESS' | 'INSUFFICIENT_DATA';
  message?: string;
  currentPeriod: { startDate: string; endDate: string; totalSpent: number };
  previousPeriod: { startDate: string; endDate: string; totalSpent: number };
  totalChangeAmount: number;
  totalChangePercentage: number | null;
  explanation: string;
  categoryDrivers: CategoryDriver[];
}

export type AnomalySeverity = 'LOW' | 'MEDIUM' | 'HIGH';
export type AnomalyType = 'UNUSUAL_AMOUNT' | 'FREQUENCY_SPIKE' | 'CATEGORY_SURGE';

export interface AnomalyInsight {
  id: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  score: number;
  transactionId?: string;
  merchant?: string;
  categoryId?: string;
  categoryName?: string;
  amount?: number;
  date?: string;
  comparisonGroup: 'MERCHANT' | 'CATEGORY';
  sampleSize: number;
  historicalMedian: number;
  historicalMAD: number;
  reason: string;
  isRecurringSafeguardApplied?: boolean;
}

export interface CategoryForecast {
  categoryId: string;
  categoryName: string;
  forecastAmount: number;
  historicalMonthlyAverage: number;
  dataQuality: DataQuality;
  explanation: string;
}

export interface ForecastResult {
  status: 'SUCCESS' | 'INSUFFICIENT_DATA';
  message?: string;
  nextMonthName: string;
  totalForecastAmount: number;
  dataQuality: DataQuality;
  historicalMonthsEvaluated: number;
  categoryForecasts: CategoryForecast[];
  explanation: string;
}
