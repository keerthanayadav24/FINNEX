import { apiFetch } from './api';
import { Category, CategoryType } from '../types';

export const categoryService = {
  getCategories: () => apiFetch<Category[]>('/categories'),
  createCategory: (data: { name: string; icon?: string; type: CategoryType }) =>
    apiFetch<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  suggestCategory: (merchant: string) =>
    apiFetch<{ categoryId: string; categoryName: string } | null>(`/categories/suggest?merchant=${encodeURIComponent(merchant)}`),
};
