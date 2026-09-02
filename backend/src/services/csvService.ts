import Papa from 'papaparse';
import { Prisma, TransactionType, TransactionSource } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export interface CsvRowPreview {
  rowNumber: number;
  date: string;
  type: TransactionType;
  amount: number;
  merchant: string | null;
  categoryName: string | null;
  categoryId: string | null;
  description: string | null;
  tags: string[];
  isValid: boolean;
  errors: string[];
}

export interface CsvImportSession {
  token: string;
  userId: string;
  accountId: string;
  validRows: CsvRowPreview[];
  createdAt: number;
}

// Short-lived server-side storage for CSV import preview sessions
const importSessions = new Map<string, CsvImportSession>();

// Cleanup expired sessions older than 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of importSessions.entries()) {
    if (now - session.createdAt > 15 * 60 * 1000) {
      importSessions.delete(token);
    }
  }
}, 60 * 1000);

export class CsvService {
  static async previewCsv(userId: string, accountId: string, csvContent: string) {
    // 1. Re-validate target account ownership
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) {
      throw new AppError('Target account not found or access denied', 404, 'NOT_FOUND');
    }

    if (!csvContent || !csvContent.trim()) {
      throw new AppError('CSV content is empty', 400, 'BAD_REQUEST');
    }

    // 2. Parse CSV text via PapaParse
    const parseResult = Papa.parse<Record<string, string>>(csvContent.trim(), {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
    });

    if (parseResult.errors.length > 0 && parseResult.data.length === 0) {
      throw new AppError('Failed to parse CSV content', 400, 'BAD_REQUEST', parseResult.errors);
    }

    // Load available categories for dynamic resolution
    const categories = await prisma.category.findMany({
      where: { OR: [{ isSystem: true }, { userId }] },
    });

    const categoryMapByName = new Map<string, string>();
    for (const c of categories) {
      categoryMapByName.set(c.name.toLowerCase(), c.id);
    }

    const rowPreviews: CsvRowPreview[] = [];
    let validCount = 0;
    let invalidCount = 0;

    // 3. Perform 100% server-side validation per row
    parseResult.data.forEach((row, index) => {
      const rowNumber = index + 2; // Line 1 is header
      const errors: string[] = [];

      // Extract fields with standard fallbacks
      const rawDate = row['date'] || row['transaction date'] || row['dt'];
      const rawType = (row['type'] || row['transaction type'] || 'EXPENSE').toUpperCase().trim();
      const rawAmount = row['amount'] || row['val'] || row['sum'];
      const merchant = row['merchant'] || row['payee'] || row['title'] || null;
      const categoryName = row['category'] || row['cat'] || null;
      const description = row['description'] || row['desc'] || row['memo'] || null;
      const rawTags = row['tags'] || row['tag'] || '';

      // Date validation
      let parsedDate = new Date(rawDate);
      if (!rawDate || isNaN(parsedDate.getTime())) {
        errors.push(`Invalid or missing date '${rawDate}'`);
      }

      // Type validation
      let txType: TransactionType = TransactionType.EXPENSE;
      if (rawType === 'INCOME' || rawType === 'CREDIT') {
        txType = TransactionType.INCOME;
      } else if (rawType === 'EXPENSE' || rawType === 'DEBIT') {
        txType = TransactionType.EXPENSE;
      } else if (rawType === 'TRANSFER') {
        txType = TransactionType.TRANSFER;
      } else {
        errors.push(`Invalid transaction type '${rawType}'`);
      }

      // Amount validation
      const parsedAmount = parseFloat(rawAmount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        errors.push(`Invalid amount '${rawAmount}' (must be positive number)`);
      }

      // Category resolution
      let categoryId: string | null = null;
      if (categoryName) {
        const matched = categoryMapByName.get(categoryName.toLowerCase().trim());
        if (matched) {
          categoryId = matched;
        }
      }

      // Parse tags
      const tags = rawTags
        ? rawTags
            .replace(/"/g, '')
            .split(',')
            .map((t) => t.trim().toLowerCase().replace(/^#/, ''))
            .filter(Boolean)
        : [];

      const isValid = errors.length === 0;
      if (isValid) validCount++;
      else invalidCount++;

      rowPreviews.push({
        rowNumber,
        date: parsedDate.toISOString(),
        type: txType,
        amount: parsedAmount || 0,
        merchant: merchant ? merchant.trim() : null,
        categoryName: categoryName ? categoryName.trim() : null,
        categoryId,
        description: description ? description.trim() : null,
        tags,
        isValid,
        errors,
      });
    });

    // 4. Generate secure short-lived server token
    const token = `csv_session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const validRows = rowPreviews.filter((r) => r.isValid);

    importSessions.set(token, {
      token,
      userId,
      accountId,
      validRows,
      createdAt: Date.now(),
    });

    return {
      importToken: token,
      accountId,
      accountName: account.name,
      totalRows: rowPreviews.length,
      validCount,
      invalidCount,
      previews: rowPreviews,
    };
  }

  static async confirmCsvImport(userId: string, accountId: string, importToken: string) {
    // 1. Retrieve & validate session token (Server-side validation guarantee)
    const session = importSessions.get(importToken);
    if (!session) {
      throw new AppError('Import session has expired or is invalid. Please preview the CSV again.', 400, 'INVALID_IMPORT_SESSION');
    }

    if (session.userId !== userId || session.accountId !== accountId) {
      throw new AppError('Import session user or account mismatch', 403, 'FORBIDDEN');
    }

    if (session.validRows.length === 0) {
      throw new AppError('No valid rows found in CSV import session', 400, 'BAD_REQUEST');
    }

    // 2. Re-verify account ownership
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) {
      throw new AppError('Target account not found or access denied', 404, 'NOT_FOUND');
    }

    // 3. Atomically create all normalized transactions via TransactionService inside Prisma transaction
    const createdTransactions = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const row of session.validRows) {
        // Re-verify category ownership server-side
        let validCategoryId = row.categoryId;
        if (validCategoryId) {
          const cat = await tx.category.findFirst({
            where: { id: validCategoryId, OR: [{ isSystem: true }, { userId }] },
          });
          if (!cat) validCategoryId = null;
        }

        const decimalAmount = new Prisma.Decimal(row.amount);

        const createdTx = await tx.transaction.create({
          data: {
            userId,
            accountId,
            amount: decimalAmount,
            type: row.type,
            categoryId: validCategoryId,
            merchant: row.merchant,
            date: new Date(row.date),
            source: TransactionSource.CSV,
            description: row.description,
            tags: row.tags,
          },
        });

        // Update account balance using identical normalized rule
        if (row.type === TransactionType.INCOME) {
          await tx.account.update({
            where: { id: accountId },
            data: { currentBalance: { increment: decimalAmount } },
          });
        } else if (row.type === TransactionType.EXPENSE) {
          await tx.account.update({
            where: { id: accountId },
            data: { currentBalance: { decrement: decimalAmount } },
          });
        }

        results.push(createdTx);
      }
      return results;
    });

    // Clean up session token
    importSessions.delete(importToken);

    return {
      importedCount: createdTransactions.length,
      accountId,
    };
  }
}
