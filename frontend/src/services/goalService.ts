import { apiFetch } from './api';
import { Goal, GoalContribution } from '../types';

export const goalService = {
  getGoals: () => apiFetch<Goal[]>('/goals'),

  getGoalById: (id: string) => apiFetch<Goal>(`/goals/${id}`),

  createGoal: (goalData: {
    name: string;
    targetAmount: number;
    currentAmount?: number;
    initialSavedAmount?: number;
    targetDate?: string | null;
    type?: string;
  }) =>
    apiFetch<Goal>('/goals', {
      method: 'POST',
      body: JSON.stringify(goalData),
    }),

  updateGoal: (
    id: string,
    goalData: {
      name?: string;
      targetAmount?: number;
      targetDate?: string | null;
      type?: string;
    }
  ) =>
    apiFetch<Goal>(`/goals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(goalData),
    }),

  deleteGoal: (id: string) =>
    apiFetch<{ success: boolean }>(`/goals/${id}`, {
      method: 'DELETE',
    }),

  addContribution: (
    goalId: string,
    contributionData: { amount: number; note?: string; date?: string }
  ) =>
    apiFetch<GoalContribution>(`/goals/${goalId}/contributions`, {
      method: 'POST',
      body: JSON.stringify(contributionData),
    }),

  updateContribution: (
    goalId: string,
    contributionId: string,
    contributionData: { amount?: number; note?: string; date?: string }
  ) =>
    apiFetch<GoalContribution>(`/goals/${goalId}/contributions/${contributionId}`, {
      method: 'PUT',
      body: JSON.stringify(contributionData),
    }),

  deleteContribution: (goalId: string, contributionId: string) =>
    apiFetch<{ success: boolean }>(`/goals/${goalId}/contributions/${contributionId}`, {
      method: 'DELETE',
    }),
};
