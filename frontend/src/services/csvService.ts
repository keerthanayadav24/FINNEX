import { apiFetch } from './api';

export interface CsvPreviewResponse {
  importToken: string;
  accountId: string;
  accountName: string;
  totalRows: number;
  validCount: number;
  invalidCount: number;
  previews: {
    rowNumber: number;
    date: string;
    type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
    amount: number;
    merchant: string | null;
    categoryName: string | null;
    description: string | null;
    tags: string[];
    isValid: boolean;
    errors: string[];
  }[];
}

export const csvService = {
  previewCsv: (accountId: string, csvContent: string) =>
    apiFetch<CsvPreviewResponse>('/transactions/import/csv/preview', {
      method: 'POST',
      body: JSON.stringify({ accountId, csvContent }),
    }),
  confirmImport: (accountId: string, importToken: string) =>
    apiFetch<{ importedCount: number; accountId: string }>('/transactions/import/csv/confirm', {
      method: 'POST',
      body: JSON.stringify({ accountId, importToken }),
    }),
};
