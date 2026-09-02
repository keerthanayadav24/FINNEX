import { apiFetch } from './api';

export interface DashboardSummary {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  totalIncome: number;
  totalExpense: number;
  netChange: number;
  accountCount: number;
  transactionCount: number;
}

export interface CategorySpending {
  totalExpense: number;
  categories: {
    id: string;
    name: string;
    icon: string;
    amount: number;
    percentage: number;
  }[];
}

export interface SpendingTrendItem {
  date: string;
  income: number;
  expense: number;
}

export const dashboardService = {
  getSummary: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString();
    return apiFetch<DashboardSummary>(`/dashboard/summary${query ? `?${query}` : ''}`);
  },
  getSpendingByCategory: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString();
    return apiFetch<CategorySpending>(`/dashboard/spending-by-category${query ? `?${query}` : ''}`);
  },
  getSpendingTrend: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString();
    return apiFetch<SpendingTrendItem[]>(`/dashboard/spending-trend${query ? `?${query}` : ''}`);
  },
};
