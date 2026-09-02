import { apiFetch } from './api';
import { Transaction, TransactionType, TransactionSource } from '../types';

export interface CreateTransactionPayload {
  accountId: string;
  transferAccountId?: string | null;
  amount: number;
  type: TransactionType;
  categoryId?: string | null;
  merchant?: string | null;
  date: string;
  source: TransactionSource;
  description?: string | null;
  tags?: string[];
}

export interface GetTransactionsResponse {
  transactions: Transaction[];
  pagination: {
    totalCount: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const transactionService = {
  getTransactions: (filters: Record<string, string | number> = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        queryParams.append(key, String(val));
      }
    });
    const queryStr = queryParams.toString();
    return apiFetch<GetTransactionsResponse | Transaction[]>(`/transactions${queryStr ? `?${queryStr}` : ''}`);
  },
  getTransactionById: (id: string) => apiFetch<Transaction>(`/transactions/${id}`),
  createTransaction: (data: CreateTransactionPayload) =>
    apiFetch<Transaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateTransaction: (id: string, data: Partial<CreateTransactionPayload>) =>
    apiFetch<Transaction>(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteTransaction: (id: string) =>
    apiFetch<{ success: boolean }>(`/transactions/${id}`, {
      method: 'DELETE',
    }),
};
