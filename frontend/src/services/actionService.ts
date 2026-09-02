import { apiFetch } from './api';

export interface ActionEvidence {
  label: string;
  value: string;
}

export interface ActionItem {
  id: string;
  type: 'OVERSPEND_NUDGE' | 'GOAL_RECOMMENDATION' | 'SUBSCRIPTION_AUDIT' | 'DEBT_PAYOFF' | 'BILL_REMINDER';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  summary: string;
  explanation: string;
  evidence: ActionEvidence[];
  actionText: string;
  estimatedImpact?: number;
  relatedGoalId?: string;
  relatedCategoryId?: string;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: string;
  priorityScore: number;
}

export interface RecurringSubscription {
  id: string;
  merchant: string;
  averageAmount: number;
  frequency: 'MONTHLY' | 'YEARLY';
  occurrenceCount: number;
  distinctMonthsCount: number;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  lastOccurrenceDate: string;
  summary: string;
  actionableAdvice: string;
}

export interface BillReminder {
  id: string;
  merchant: string;
  expectedAmount: number;
  expectedDayOfMonth: number;
  expectedDateWindow: string;
  summary: string;
}

export interface DebtItem {
  id: string;
  name: string;
  type: string;
  outstandingPrincipal: number;
  interestRate: number | null;
}

export interface DebtPayoffPlan {
  strategy: 'DEBT_SNOWBALL' | 'DEBT_AVALANCHE';
  totalOutstandingDebt: number;
  status: 'READY' | 'INSUFFICIENT_DATA';
  orderedDebts: DebtItem[];
  summary: string;
}

export interface ActionEnginePayload {
  recommendations: ActionItem[];
  nudges: ActionItem[];
  subscriptions: RecurringSubscription[];
  debtPlans: {
    snowball: DebtPayoffPlan;
    avalanche: DebtPayoffPlan;
  };
  billReminders: BillReminder[];
}

export const actionService = {
  getActions: () => apiFetch<ActionEnginePayload>('/actions'),
};
