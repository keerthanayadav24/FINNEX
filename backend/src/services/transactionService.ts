import { Prisma, TransactionType, TransactionSource } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export interface TransactionFilters {
  accountId?: string;
  categoryId?: string;
  type?: TransactionType;
  source?: TransactionSource;
  startDate?: Date;
  endDate?: Date;
  tag?: string;
  search?: string;
  sortBy?: 'date' | 'amount';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export class TransactionService {
  static async getUserTransactions(userId: string, filters: TransactionFilters = {}) {
    const where: Prisma.TransactionWhereInput = {
      userId,
    };

    if (filters.accountId) where.accountId = filters.accountId;
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.type) where.type = filters.type;
    if (filters.source) where.source = filters.source;
    if (filters.tag) where.tags = { has: filters.tag };

    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = filters.startDate;
      if (filters.endDate) where.date.lte = filters.endDate;
    }

    if (filters.search && filters.search.trim()) {
      const queryStr = filters.search.trim();
      where.OR = [
        { merchant: { contains: queryStr, mode: 'insensitive' } },
        { description: { contains: queryStr, mode: 'insensitive' } },
      ];
    }

    const sortBy = filters.sortBy || 'date';
    const sortOrder = filters.sortOrder || 'desc';
    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, Math.min(100, filters.limit || 50));
    const skip = (page - 1) * limit;

    const [totalCount, transactions] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
        include: {
          account: { select: { id: true, name: true, type: true, currency: true } },
          transferAccount: { select: { id: true, name: true, type: true, currency: true } },
          category: { select: { id: true, name: true, icon: true, type: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      transactions,
      pagination: {
        totalCount,
        page,
        limit,
        totalPages,
      },
    };
  }

  static async getTransactionById(userId: string, transactionId: string) {
    const transaction = await prisma.transaction.findFirst({
      where: { id: transactionId, userId },
      include: {
        account: { select: { id: true, name: true, type: true, currency: true } },
        transferAccount: { select: { id: true, name: true, type: true, currency: true } },
        category: { select: { id: true, name: true, icon: true, type: true } },
      },
    });

    if (!transaction) {
      throw new AppError('Transaction not found', 404, 'NOT_FOUND');
    }

    return transaction;
  }

  static async createTransaction(
    userId: string,
    data: {
      accountId: string;
      transferAccountId?: string | null;
      amount: number;
      type: TransactionType;
      categoryId?: string | null;
      merchant?: string | null;
      date: Date;
      source?: TransactionSource;
      description?: string | null;
      tags?: string[];
    }
  ) {
    // 1. Verify primary account ownership
    const account = await prisma.account.findFirst({
      where: { id: data.accountId, userId },
    });
    if (!account) {
      throw new AppError('Account not found or access denied', 404, 'NOT_FOUND');
    }

    // 2. If transfer, verify transfer account ownership & self-reference
    if (data.type === TransactionType.TRANSFER) {
      if (!data.transferAccountId) {
        throw new AppError('Destination account is required for transfers', 400, 'BAD_REQUEST');
      }
      if (data.accountId === data.transferAccountId) {
        throw new AppError('Source and destination accounts for a transfer cannot be identical', 400, 'BAD_REQUEST');
      }
      const transferAccount = await prisma.account.findFirst({
        where: { id: data.transferAccountId, userId },
      });
      if (!transferAccount) {
        throw new AppError('Transfer destination account not found or access denied', 404, 'NOT_FOUND');
      }
    }

    // 3. Foreign key attack prevention: Verify category ownership if categoryId provided
    if (data.categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: data.categoryId,
          OR: [{ isSystem: true }, { userId }],
        },
      });
      if (!category) {
        throw new AppError('Category not found or access denied', 404, 'NOT_FOUND');
      }
    }

    const decimalAmount = new Prisma.Decimal(data.amount);

    // 4. Execute creation & balance adjustment inside Prisma transaction
    return prisma.$transaction(async (tx) => {
      const createdTx = await tx.transaction.create({
        data: {
          userId,
          accountId: data.accountId,
          transferAccountId: data.transferAccountId || null,
          amount: decimalAmount,
          type: data.type,
          categoryId: data.categoryId || null,
          merchant: data.merchant || null,
          date: data.date,
          source: data.source || TransactionSource.MANUAL,
          description: data.description || null,
          tags: data.tags || [],
        },
        include: {
          account: true,
          transferAccount: true,
          category: true,
        },
      });

      // Update balances based on type
      if (data.type === TransactionType.INCOME) {
        await tx.account.update({
          where: { id: data.accountId },
          data: { currentBalance: { increment: decimalAmount } },
        });
      } else if (data.type === TransactionType.EXPENSE) {
        await tx.account.update({
          where: { id: data.accountId },
          data: { currentBalance: { decrement: decimalAmount } },
        });
      } else if (data.type === TransactionType.TRANSFER && data.transferAccountId) {
        await tx.account.update({
          where: { id: data.accountId },
          data: { currentBalance: { decrement: decimalAmount } },
        });
        await tx.account.update({
          where: { id: data.transferAccountId },
          data: { currentBalance: { increment: decimalAmount } },
        });
      }

      return createdTx;
    });
  }

  static async updateTransaction(
    userId: string,
    transactionId: string,
    data: Partial<{
      accountId: string;
      transferAccountId: string | null;
      amount: number;
      type: TransactionType;
      categoryId: string | null;
      merchant: string | null;
      date: Date;
      source: TransactionSource;
      description: string | null;
      tags: string[];
    }>
  ) {
    const existing = await this.getTransactionById(userId, transactionId);

    // Determine target values
    const newAccountId = data.accountId || existing.accountId;
    const newType = data.type || existing.type;
    const newTransferAccountId =
      data.transferAccountId !== undefined ? data.transferAccountId : existing.transferAccountId;
    const newAmount = data.amount !== undefined ? new Prisma.Decimal(data.amount) : existing.amount;
    const newCategoryId = data.categoryId !== undefined ? data.categoryId : existing.categoryId;

    // Verify ownership of updated account(s) and category
    if (newAccountId !== existing.accountId) {
      const acc = await prisma.account.findFirst({ where: { id: newAccountId, userId } });
      if (!acc) throw new AppError('Account not found or access denied', 404, 'NOT_FOUND');
    }

    if (newType === TransactionType.TRANSFER) {
      if (!newTransferAccountId) {
        throw new AppError('Destination account is required for transfers', 400, 'BAD_REQUEST');
      }
      if (newAccountId === newTransferAccountId) {
        throw new AppError('Source and destination accounts for a transfer cannot be identical', 400, 'BAD_REQUEST');
      }
      if (newTransferAccountId !== existing.transferAccountId) {
        const transAcc = await prisma.account.findFirst({ where: { id: newTransferAccountId, userId } });
        if (!transAcc) throw new AppError('Transfer destination account not found or access denied', 404, 'NOT_FOUND');
      }
    }

    if (newCategoryId && newCategoryId !== existing.categoryId) {
      const cat = await prisma.category.findFirst({
        where: {
          id: newCategoryId,
          OR: [{ isSystem: true }, { userId }],
        },
      });
      if (!cat) throw new AppError('Category not found or access denied', 404, 'NOT_FOUND');
    }

    // ATOMIC RECALCULATION & UPDATE
    return prisma.$transaction(async (tx) => {
      // 1. REVERT existing transaction impact on account balances
      if (existing.type === TransactionType.INCOME) {
        await tx.account.update({
          where: { id: existing.accountId },
          data: { currentBalance: { decrement: existing.amount } },
        });
      } else if (existing.type === TransactionType.EXPENSE) {
        await tx.account.update({
          where: { id: existing.accountId },
          data: { currentBalance: { increment: existing.amount } },
        });
      } else if (existing.type === TransactionType.TRANSFER && existing.transferAccountId) {
        await tx.account.update({
          where: { id: existing.accountId },
          data: { currentBalance: { increment: existing.amount } },
        });
        await tx.account.update({
          where: { id: existing.transferAccountId },
          data: { currentBalance: { decrement: existing.amount } },
        });
      }

      // 2. UPDATE transaction entity
      const updatedTx = await tx.transaction.update({
        where: { id: existing.id },
        data: {
          accountId: newAccountId,
          transferAccountId: newType === TransactionType.TRANSFER ? newTransferAccountId : null,
          amount: newAmount,
          type: newType,
          categoryId: newCategoryId,
          merchant: data.merchant !== undefined ? data.merchant : existing.merchant,
          date: data.date || existing.date,
          source: data.source || existing.source,
          description: data.description !== undefined ? data.description : existing.description,
          tags: data.tags !== undefined ? data.tags : existing.tags,
        },
        include: {
          account: true,
          transferAccount: true,
          category: true,
        },
      });

      // 3. APPLY new transaction impact on account balances
      if (newType === TransactionType.INCOME) {
        await tx.account.update({
          where: { id: newAccountId },
          data: { currentBalance: { increment: newAmount } },
        });
      } else if (newType === TransactionType.EXPENSE) {
        await tx.account.update({
          where: { id: newAccountId },
          data: { currentBalance: { decrement: newAmount } },
        });
      } else if (newType === TransactionType.TRANSFER && newTransferAccountId) {
        await tx.account.update({
          where: { id: newAccountId },
          data: { currentBalance: { decrement: newAmount } },
        });
        await tx.account.update({
          where: { id: newTransferAccountId },
          data: { currentBalance: { increment: newAmount } },
        });
      }

      return updatedTx;
    });
  }

  static async deleteTransaction(userId: string, transactionId: string) {
    const existing = await this.getTransactionById(userId, transactionId);

    return prisma.$transaction(async (tx) => {
      // Revert account balance adjustment before deletion
      if (existing.type === TransactionType.INCOME) {
        await tx.account.update({
          where: { id: existing.accountId },
          data: { currentBalance: { decrement: existing.amount } },
        });
      } else if (existing.type === TransactionType.EXPENSE) {
        await tx.account.update({
          where: { id: existing.accountId },
          data: { currentBalance: { increment: existing.amount } },
        });
      } else if (existing.type === TransactionType.TRANSFER && existing.transferAccountId) {
        await tx.account.update({
          where: { id: existing.accountId },
          data: { currentBalance: { increment: existing.amount } },
        });
        await tx.account.update({
          where: { id: existing.transferAccountId },
          data: { currentBalance: { decrement: existing.amount } },
        });
      }

      return tx.transaction.delete({
        where: { id: existing.id },
      });
    });
  }
}
