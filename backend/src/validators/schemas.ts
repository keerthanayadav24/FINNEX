import { z } from 'zod';
import { AccountType, TransactionType, TransactionSource, CategoryType, BudgetPeriod } from '@prisma/client';

export const createAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required').max(100),
  type: z.nativeEnum(AccountType),
  currency: z.string().length(3).default('INR'),
  currentBalance: z.number().or(z.string().transform((val) => parseFloat(val))),
  interestRate: z.number().min(0).max(100).optional().nullable(),
});

export const updateAccountSchema = createAccountSchema.partial();

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  icon: z.string().optional(),
  type: z.nativeEnum(CategoryType).default(CategoryType.EXPENSE),
});

export const createTransactionSchema = z
  .object({
    accountId: z.string().uuid('Invalid account ID'),
    transferAccountId: z.string().uuid('Invalid transfer account ID').optional().nullable(),
    amount: z.number().positive('Amount must be positive').or(z.string().transform((val) => parseFloat(val))),
    type: z.nativeEnum(TransactionType),
    categoryId: z.string().uuid('Invalid category ID').optional().nullable(),
    merchant: z.string().max(100).optional().nullable(),
    date: z.string().or(z.date()).transform((val) => new Date(val)),
    source: z.nativeEnum(TransactionSource).default(TransactionSource.MANUAL),
    description: z.string().max(255).optional().nullable(),
    tags: z.array(z.string()).optional().default([]),
  })
  .refine(
    (data) => {
      if (data.type === TransactionType.TRANSFER) {
        return data.transferAccountId && data.accountId !== data.transferAccountId;
      }
      return true;
    },
    {
      message: 'Transfer transactions require a distinct destination account.',
      path: ['transferAccountId'],
    }
  );

export const updateTransactionSchema = z
  .object({
    accountId: z.string().uuid('Invalid account ID').optional(),
    transferAccountId: z.string().uuid('Invalid transfer account ID').optional().nullable(),
    amount: z.number().positive('Amount must be positive').or(z.string().transform((val) => parseFloat(val))).optional(),
    type: z.nativeEnum(TransactionType).optional(),
    categoryId: z.string().uuid('Invalid category ID').optional().nullable(),
    merchant: z.string().max(100).optional().nullable(),
    date: z.string().or(z.date()).transform((val) => new Date(val)).optional(),
    source: z.nativeEnum(TransactionSource).optional(),
    description: z.string().max(255).optional().nullable(),
    tags: z.array(z.string()).optional(),
  })
  .refine(
    (data) => {
      if (data.type === TransactionType.TRANSFER && data.accountId && data.transferAccountId) {
        return data.accountId !== data.transferAccountId;
      }
      return true;
    },
    {
      message: 'Transfer transactions require a distinct destination account.',
      path: ['transferAccountId'],
    }
  );

export const createBudgetSchema = z.object({
  name: z.string().min(1, 'Budget name is required').max(100),
  categoryId: z.string().uuid('Invalid category ID').optional().nullable(),
  amount: z.number().positive('Budget amount must be positive').or(z.string().transform((val) => parseFloat(val))),
  period: z.nativeEnum(BudgetPeriod).default(BudgetPeriod.MONTHLY),
  startDate: z.string().or(z.date()).transform((val) => new Date(val)),
  endDate: z.string().or(z.date()).transform((val) => new Date(val)).optional().nullable(),
});

export const createGoalSchema = z.object({
  name: z.string().min(1, 'Goal name is required').max(100),
  targetAmount: z.number().positive('Target amount must be positive').or(z.string().transform((val) => parseFloat(val))),
  currentAmount: z.number().min(0).optional().default(0).or(z.string().transform((val) => parseFloat(val))),
  targetDate: z.string().or(z.date()).transform((val) => new Date(val)).optional().nullable(),
});
