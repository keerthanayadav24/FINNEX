import { apiFetch } from './api';

export type DataQuality = 'LOW' | 'MEDIUM' | 'HIGH' | 'INSUFFICIENT_DATA';

export interface CategoryDriver {
  categoryId: string;
  categoryName: string;
  icon: string;
  currentAmount: number;
  previousAmount: number;
  changeAmount: number;
  changePercentage: number | null;
  contributionPercentage: number;
  explanation: string;
  topMerchants: {
    merchant: string;
    currentAmount: number;
    previousAmount: number;
    changeAmount: number;
  }[];
}

export interface TrendInsightResponse {
  status: 'SUCCESS' | 'INSUFFICIENT_DATA';
  message?: string;
  currentPeriod: { startDate: string; endDate: string; totalSpent: number };
  previousPeriod: { startDate: string; endDate: string; totalSpent: number };
  totalChangeAmount: number;
  totalChangePercentage: number | null;
  explanation: string;
  categoryDrivers: CategoryDriver[];
}

export interface AnomalyInsightItem {
  id: string;
  type: 'UNUSUAL_AMOUNT' | 'FREQUENCY_SPIKE' | 'CATEGORY_SURGE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
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
}

export interface AnomalyResponse {
  status: 'SUCCESS' | 'INSUFFICIENT_DATA';
  anomalies: AnomalyInsightItem[];
}

export interface CategoryForecast {
  categoryId: string;
  categoryName: string;
  forecastAmount: number;
  historicalMonthlyAverage: number;
  dataQuality: DataQuality;
  explanation: string;
}

export interface ForecastResponse {
  status: 'SUCCESS' | 'INSUFFICIENT_DATA';
  message?: string;
  nextMonthName: string;
  totalForecastAmount: number;
  dataQuality: DataQuality;
  historicalMonthsEvaluated: number;
  categoryForecasts: CategoryForecast[];
  explanation: string;
}

export const intelligenceService = {
  getTrends: () => apiFetch<TrendInsightResponse>('/intelligence/trends'),
  getAnomalies: () => apiFetch<AnomalyResponse>('/intelligence/anomalies'),
  getForecast: () => apiFetch<ForecastResponse>('/intelligence/forecast'),
};
