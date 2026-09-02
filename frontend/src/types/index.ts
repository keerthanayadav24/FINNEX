export type AccountType =
  | 'SAVINGS'
  | 'CHECKING'
  | 'CASH'
  | 'CREDIT_CARD'
  | 'INVESTMENT'
  | 'LOAN';

export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export type TransactionSource =
  | 'MANUAL'
  | 'CSV'
  | 'BANK'
  | 'CARD'
  | 'STATEMENT'
  | 'API';

export type CategoryType = 'INCOME' | 'EXPENSE';

export type BudgetPeriod = 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  currency: string;
  currentBalance: number | string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    transactions: number;
  };
}

export interface Category {
  id: string;
  userId?: string | null;
  name: string;
  icon?: string | null;
  isSystem: boolean;
  type: CategoryType;
}

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  transferAccountId?: string | null;
  amount: number | string;
  type: TransactionType;
  categoryId?: string | null;
  merchant?: string | null;
  date: string;
  source: TransactionSource;
  description?: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  account?: Account;
  transferAccount?: Account;
  category?: Category;
}

export interface Budget {
  id: string;
  userId: string;
  categoryId?: string | null;
  name: string;
  amount: number | string;
  spentAmount?: number;
  remainingAmount?: number;
  usagePercentage?: number;
  isWarning?: boolean;
  isExceeded?: boolean;
  period: BudgetPeriod;
  startDate: string;
  endDate?: string | null;
  category?: Category;
}

export type GoalStatus =
  | 'ON_TRACK'
  | 'BEHIND'
  | 'AHEAD'
  | 'COMPLETED'
  | 'NO_TARGET_DATE'
  | 'INSUFFICIENT_DATA';

export interface GoalContribution {
  id: string;
  goalId: string;
  amount: number;
  date: string;
  note?: string | null;
  isInitial?: boolean;
  createdAt: string;
}

export interface GoalPlanningMetrics {
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
  explanation: string;
}

export interface Goal {
  id: string;
  userId: string;
  name: string;
  type?: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
  metrics?: GoalPlanningMetrics;
  contributions?: GoalContribution[];
  contributionCount?: number;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS';
  isRead: boolean;
  createdAt: string;
}
