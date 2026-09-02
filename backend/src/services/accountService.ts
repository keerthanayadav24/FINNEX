import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export class AccountService {
  static async getUserAccounts(userId: string) {
    return prisma.account.findMany({
      where: { userId },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getAccountById(userId: string, accountId: string) {
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });

    if (!account) {
      throw new AppError('Account not found', 404, 'NOT_FOUND');
    }

    return account;
  }

  static async createAccount(userId: string, data: { name: string; type: any; currency?: string; currentBalance: number; interestRate?: number | null }) {
    const isDebt = data.type === 'CREDIT_CARD' || data.type === 'LOAN';
    const rate = isDebt && data.interestRate !== undefined && data.interestRate !== null ? new Prisma.Decimal(data.interestRate) : null;

    return prisma.account.create({
      data: {
        userId,
        name: data.name,
        type: data.type,
        currency: data.currency || 'INR',
        currentBalance: new Prisma.Decimal(data.currentBalance),
        interestRate: rate,
      },
    });
  }

  static async updateAccount(userId: string, accountId: string, data: Partial<{ name: string; type: any; currency: string; interestRate?: number | null }>) {
    await this.getAccountById(userId, accountId); // Verify ownership

    const updateData: any = { ...data };
    if (data.interestRate !== undefined) {
      updateData.interestRate = data.interestRate !== null ? new Prisma.Decimal(data.interestRate) : null;
    }

    return prisma.account.update({
      where: { id: accountId },
      data: updateData,
    });
  }

  static async deleteAccount(userId: string, accountId: string) {
    const account = await this.getAccountById(userId, accountId); // Verify ownership

    // SAFE ACCOUNT DELETION CHECK: Prevent silent orphaned transaction corruption
    const transactionCount = await prisma.transaction.count({
      where: {
        OR: [
          { accountId },
          { transferAccountId: accountId },
        ],
      },
    });

    if (transactionCount > 0) {
      throw new AppError(
        'Cannot delete account with existing transactions. Please delete or reassign associated transactions first.',
        400,
        'ACCOUNT_HAS_TRANSACTIONS',
        { transactionCount }
      );
    }

    return prisma.account.delete({
      where: { id: accountId },
    });
  }
}
