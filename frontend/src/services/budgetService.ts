import { apiFetch } from './api';
import { Budget, BudgetPeriod } from '../types';

export const budgetService = {
  getBudgets: () => apiFetch<Budget[]>('/budgets'),
  createBudget: (data: { name: string; categoryId?: string; amount: number; period?: BudgetPeriod; startDate: string }) =>
    apiFetch<Budget>('/budgets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
