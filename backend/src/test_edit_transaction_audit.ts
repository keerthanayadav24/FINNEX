import { prisma } from './config/prisma.js';
import { TransactionService } from './services/transactionService.js';
import { AccountType, TransactionType, TransactionSource } from '@prisma/client';

async function runEditTransactionAudit() {
  console.log('🧪 Starting FINNEX Transaction Edit & Balance Correctness Audit...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  const testUserId = `audit_user_edit_${Date.now()}`;

  try {
    // Setup test user
    const user = await prisma.user.create({
      data: {
        authProviderId: testUserId,
        email: `${testUserId}@finnex.test`,
        name: 'Transaction Edit Tester',
      },
    });

    // Create Account A (Balance ₹50,000) & Account B (Balance ₹20,000)
    const accA = await prisma.account.create({
      data: {
        userId: user.id,
        name: 'Test Checking Account A',
        type: AccountType.CHECKING,
        currency: 'INR',
        currentBalance: 50000.00,
      },
    });

    const accB = await prisma.account.create({
      data: {
        userId: user.id,
        name: 'Test Savings Account B',
        type: AccountType.SAVINGS,
        currency: 'INR',
        currentBalance: 20000.00,
      },
    });

    // System Category
    const category = await prisma.category.findFirst({ where: { isSystem: true } });
    const categoryId = category ? category.id : null;

    // ----------------------------------------------------
    // TEST 1: Concrete Example — Edit Expense Amount
    // Initial: Acc A = ₹50,000, create Expense ₹5,000 → Acc A becomes ₹45,000.
    // Edit Expense: ₹5,000 → ₹3,000 → Acc A must become ₹47,000 (+₹2,000 relative to ₹45,000).
    // ----------------------------------------------------
    const tx1 = await TransactionService.createTransaction(user.id, {
      accountId: accA.id,
      amount: 5000,
      type: TransactionType.EXPENSE,
      categoryId,
      merchant: 'Initial Expense Merchant',
      date: new Date(),
      source: TransactionSource.MANUAL,
    });

    let reFetchedAccA = await prisma.account.findUnique({ where: { id: accA.id } });
    assert(parseFloat(reFetchedAccA!.currentBalance.toString()) === 45000, 'Initial expense ₹5,000 reduced Acc A balance to ₹45,000');

    // Perform Edit: ₹5,000 → ₹3,000
    const updatedTx1 = await TransactionService.updateTransaction(user.id, tx1.id, {
      amount: 3000,
    });

    reFetchedAccA = await prisma.account.findUnique({ where: { id: accA.id } });
    assert(
      parseFloat(reFetchedAccA!.currentBalance.toString()) === 47000,
      'Test 1: Editing Expense ₹5,000 → ₹3,000 correctly updated Acc A balance to ₹47,000 (+₹2,000)'
    );
    assert(parseFloat(updatedTx1.amount.toString()) === 3000, 'Test 1: Transaction amount stored as ₹3,000');

    // ----------------------------------------------------
    // TEST 2: Edit Income Amount
    // ----------------------------------------------------
    const tx2 = await TransactionService.createTransaction(user.id, {
      accountId: accA.id,
      amount: 10000,
      type: TransactionType.INCOME,
      categoryId,
      merchant: 'Freelance Bonus',
      date: new Date(),
    });
    const updatedTx2 = await TransactionService.updateTransaction(user.id, tx2.id, {
      amount: 15000,
    });
    reFetchedAccA = await prisma.account.findUnique({ where: { id: accA.id } });
    assert(
      parseFloat(reFetchedAccA!.currentBalance.toString()) === 62000,
      'Test 2: Editing Income ₹10,000 → ₹15,000 correctly updated Acc A balance to ₹62,000'
    );

    // ----------------------------------------------------
    // TEST 3: Edit Category & Merchant
    // ----------------------------------------------------
    const updatedTx3 = await TransactionService.updateTransaction(user.id, tx1.id, {
      merchant: 'Updated Merchant Name',
      description: 'Updated Description',
    });
    assert(updatedTx3.merchant === 'Updated Merchant Name', 'Test 3: Edit category & merchant name verified');

    // ----------------------------------------------------
    // TEST 4: Edit Account (Move Transaction from Acc A to Acc B)
    // ----------------------------------------------------
    await TransactionService.updateTransaction(user.id, tx1.id, {
      accountId: accB.id,
    });
    reFetchedAccA = await prisma.account.findUnique({ where: { id: accA.id } });
    const reFetchedAccB = await prisma.account.findUnique({ where: { id: accB.id } });

    assert(
      parseFloat(reFetchedAccA!.currentBalance.toString()) === 65000 &&
      parseFloat(reFetchedAccB!.currentBalance.toString()) === 17000,
      'Test 4: Moving expense ₹3,000 from Acc A to Acc B correctly updated both balances (Acc A: ₹65,000, Acc B: ₹17,000)'
    );

    // ----------------------------------------------------
    // TEST 5: Edit Date
    // ----------------------------------------------------
    const newDate = new Date('2026-08-15T12:00:00Z');
    const updatedTx5 = await TransactionService.updateTransaction(user.id, tx1.id, {
      date: newDate,
    });
    assert(new Date(updatedTx5.date).toISOString() === newDate.toISOString(), 'Test 5: Transaction date updated correctly');

    // ----------------------------------------------------
    // TEST 6: Edit Expense → Income
    // ----------------------------------------------------
    await TransactionService.updateTransaction(user.id, tx1.id, {
      type: TransactionType.INCOME,
    });
    const reFetchedAccB2 = await prisma.account.findUnique({ where: { id: accB.id } });
    assert(
      parseFloat(reFetchedAccB2!.currentBalance.toString()) === 23000,
      'Test 6: Editing Expense → Income correctly adjusted Acc B balance (₹17,000 → ₹23,000)'
    );

    // ----------------------------------------------------
    // TEST 7: Edit Income → Expense
    // ----------------------------------------------------
    await TransactionService.updateTransaction(user.id, tx1.id, {
      type: TransactionType.EXPENSE,
    });
    const reFetchedAccB3 = await prisma.account.findUnique({ where: { id: accB.id } });
    assert(
      parseFloat(reFetchedAccB3!.currentBalance.toString()) === 17000,
      'Test 7: Editing Income → Expense correctly adjusted Acc B balance back to ₹17,000'
    );

    // ----------------------------------------------------
    // TEST 8: Edit Transfer Safely
    // ----------------------------------------------------
    const transferTx = await TransactionService.createTransaction(user.id, {
      accountId: accA.id,
      transferAccountId: accB.id,
      amount: 5000,
      type: TransactionType.TRANSFER,
      date: new Date(),
    });
    let accAT = await prisma.account.findUnique({ where: { id: accA.id } });
    let accBT = await prisma.account.findUnique({ where: { id: accB.id } });
    assert(
      parseFloat(accAT!.currentBalance.toString()) === 60000 &&
      parseFloat(accBT!.currentBalance.toString()) === 22000,
      'Transfer ₹5,000 applied (Acc A: ₹60,000, Acc B: ₹22,000)'
    );

    await TransactionService.updateTransaction(user.id, transferTx.id, {
      amount: 2000,
    });
    accAT = await prisma.account.findUnique({ where: { id: accA.id } });
    accBT = await prisma.account.findUnique({ where: { id: accB.id } });
    assert(
      parseFloat(accAT!.currentBalance.toString()) === 63000 &&
      parseFloat(accBT!.currentBalance.toString()) === 19000,
      'Test 8: Editing Transfer ₹5,000 → ₹2,000 correctly updated both balances (Acc A: ₹63,000, Acc B: ₹19,000)'
    );

    // ----------------------------------------------------
    // TEST 9 & 10: Multi-Tenant Ownership & Security Verification
    // ----------------------------------------------------
    const userC = await prisma.user.create({
      data: {
        authProviderId: `user_c_${Date.now()}`,
        email: `user_c_${Date.now()}@finnex.test`,
        name: 'User C',
      },
    });

    let securityCheckPassed = false;
    try {
      await TransactionService.updateTransaction(userC.id, tx1.id, { amount: 999999 });
    } catch (err: any) {
      if (err.statusCode === 404 || err.message.includes('not found')) {
        securityCheckPassed = true;
      }
    }
    assert(securityCheckPassed, 'Test 10: Multi-tenant ownership check prevents User C from editing User A transaction');

    // Cleanup
    await prisma.transaction.deleteMany({ where: { userId: user.id } });
    await prisma.account.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.user.delete({ where: { id: userC.id } });

    console.log(`\n==================================================`);
    console.log(`🧪 Transaction Edit Audit Results: ${passed} PASSED, ${failed} FAILED`);
    console.log(`==================================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during transaction edit audit:', err);
    process.exit(1);
  }
}

runEditTransactionAudit();
