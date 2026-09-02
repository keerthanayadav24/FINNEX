import { apiFetch } from './api';
import { Account, AccountType } from '../types';

export const accountService = {
  getAccounts: () => apiFetch<Account[]>('/accounts'),
  getAccountById: (id: string) => apiFetch<Account>(`/accounts/${id}`),
  createAccount: (data: { name: string; type: AccountType; currency?: string; currentBalance: number }) =>
    apiFetch<Account>('/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateAccount: (id: string, data: Partial<{ name: string; type: AccountType; currency: string }>) =>
    apiFetch<Account>(`/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteAccount: (id: string) =>
    apiFetch<{ success: boolean }>(`/accounts/${id}`, {
      method: 'DELETE',
    }),
};
