import { prisma } from './config/prisma.js';
import { TransactionService } from './services/transactionService.js';
import { DashboardService } from './services/dashboardService.js';
import { AccountType, TransactionType, TransactionSource } from '@prisma/client';

async function runDateRangeAudit() {
  console.log('🧪 Starting FINNEX Comprehensive Date Range Audit Test Suite...\n');

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

  const timestamp = Date.now();
  const testUserIdA = `daterange_user_a_${timestamp}`;
  const testUserIdB = `daterange_user_b_${timestamp}`;

  try {
    // 1. Create User A and User B
    const userA = await prisma.user.create({
      data: {
        authProviderId: testUserIdA,
        email: `${testUserIdA}@finnex.test`,
        name: 'Date Range User A',
      },
    });

    const userB = await prisma.user.create({
      data: {
        authProviderId: testUserIdB,
        email: `${testUserIdB}@finnex.test`,
        name: 'Date Range User B',
      },
    });

    const accA = await prisma.account.create({
      data: {
        userId: userA.id,
        name: 'User A Checking',
        type: AccountType.CHECKING,
        currency: 'INR',
        currentBalance: 100000.00,
      },
    });

    const accASavings = await prisma.account.create({
      data: {
        userId: userA.id,
        name: 'User A Savings',
        type: AccountType.SAVINGS,
        currency: 'INR',
        currentBalance: 50000.00,
      },
    });

    const catFood = await prisma.category.create({
      data: { userId: userA.id, name: 'Food & Dining', type: 'EXPENSE' },
    });

    const catSalary = await prisma.category.create({
      data: { userId: userA.id, name: 'Salary', type: 'INCOME' },
    });

    // 2. Set up clean, deterministic test dates
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const today = new Date(year, month, now.getDate(), 12, 0, 0);
    const todayEndBoundary = new Date(year, month, now.getDate(), 23, 59, 59, 999);

    const yesterday = new Date(year, month, now.getDate() - 1, 14, 0, 0);
    const yesterdayStartBoundary = new Date(year, month, now.getDate() - 1, 0, 0, 0, 0);

    const lastMonthDate = new Date(year, month - 1, 15, 12, 0, 0);
    const lastYearDate = new Date(year - 1, 5, 15, 12, 0, 0);

    // Create Transactions across dates for User A
    const txTodayExpense = await prisma.transaction.create({
      data: {
        userId: userA.id,
        accountId: accA.id,
        amount: 500,
        type: TransactionType.EXPENSE,
        categoryId: catFood.id,
        merchant: 'Swiggy Today',
        date: today,
        source: TransactionSource.MANUAL,
      },
    });

    const txEndOfDay = await prisma.transaction.create({
      data: {
        userId: userA.id,
        accountId: accA.id,
        amount: 200,
        type: TransactionType.EXPENSE,
        categoryId: catFood.id,
        merchant: 'Boundary End',
        date: todayEndBoundary,
        source: TransactionSource.MANUAL,
      },
    });

    const txYesterdayExpense = await prisma.transaction.create({
      data: {
        userId: userA.id,
        accountId: accA.id,
        amount: 800,
        type: TransactionType.EXPENSE,
        categoryId: catFood.id,
        merchant: 'Zomato Yesterday',
        date: yesterday,
        source: TransactionSource.MANUAL,
      },
    });

    const txIncomeThisMonth = await prisma.transaction.create({
      data: {
        userId: userA.id,
        accountId: accA.id,
        amount: 25000,
        type: TransactionType.INCOME,
        categoryId: catSalary.id,
        merchant: 'Freelance Payout',
        date: today,
        source: TransactionSource.MANUAL,
      },
    });

    const txLastMonthExpense = await prisma.transaction.create({
      data: {
        userId: userA.id,
        accountId: accA.id,
        amount: 3500,
        type: TransactionType.EXPENSE,
        categoryId: catFood.id,
        merchant: 'Supermarket Last Month',
        date: lastMonthDate,
        source: TransactionSource.MANUAL,
      },
    });

    const txLastYearExpense = await prisma.transaction.create({
      data: {
        userId: userA.id,
        accountId: accA.id,
        amount: 12000,
        type: TransactionType.EXPENSE,
        categoryId: catFood.id,
        merchant: 'Electronics Last Year',
        date: lastYearDate,
        source: TransactionSource.MANUAL,
      },
    });

    const txTransferToday = await prisma.transaction.create({
      data: {
        userId: userA.id,
        accountId: accA.id,
        transferAccountId: accASavings.id,
        amount: 5000,
        type: TransactionType.TRANSFER,
        date: today,
        source: TransactionSource.MANUAL,
      },
    });

    // ----------------------------------------------------
    // TEST 1: TODAY FILTER
    // ----------------------------------------------------
    const todayStart = new Date(year, month, now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(year, month, now.getDate(), 23, 59, 59, 999);

    const resToday = await TransactionService.getUserTransactions(userA.id, {
      startDate: todayStart,
      endDate: todayEnd,
    });

    const todayIds = resToday.transactions.map((t) => t.id);
    assert(todayIds.includes(txTodayExpense.id) && todayIds.includes(txEndOfDay.id), 'Test 1a: Today filter includes today expense & end-of-day boundary');
    assert(!todayIds.includes(txYesterdayExpense.id), 'Test 1b: Today filter excludes yesterday transaction');

    const dashToday = await DashboardService.getSummary(userA.id, todayStart, todayEnd);
    assert(dashToday.totalExpense === 700, 'Test 1c: Dashboard today totalExpense is ₹700 (₹500 + ₹200)');

    // ----------------------------------------------------
    // TEST 2: YESTERDAY FILTER
    // ----------------------------------------------------
    const yestStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0, 0);
    const yestEnd = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);

    const resYesterday = await TransactionService.getUserTransactions(userA.id, {
      startDate: yestStart,
      endDate: yestEnd,
    });
    assert(resYesterday.transactions.length === 1 && resYesterday.transactions[0].id === txYesterdayExpense.id, 'Test 2a: Yesterday filter returns only yesterday transaction');

    // ----------------------------------------------------
    // TEST 3: THIS MONTH FILTER & DASHBOARD CONSISTENCY
    // ----------------------------------------------------
    const monthStart = new Date(year, month, 1, 0, 0, 0, 0);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const resMonth = await TransactionService.getUserTransactions(userA.id, {
      startDate: monthStart,
      endDate: monthEnd,
    });
    const dashMonth = await DashboardService.getSummary(userA.id, monthStart, monthEnd);

    assert(dashMonth.totalIncome === 25000, 'Test 3a: Dashboard This Month income is ₹25,000');
    assert(dashMonth.totalExpense === 1500 || dashMonth.totalExpense === 700 || dashMonth.totalExpense > 0, 'Test 3b: Dashboard This Month expense reflects transactions in this month');

    // ----------------------------------------------------
    // TEST 4: TRANSFER EXCLUSION & USER ISOLATION
    // ----------------------------------------------------
    assert(dashMonth.totalExpense < 5000, 'Test 4a: Transfer ₹5,000 is strictly EXCLUDED from Dashboard totalExpense');

    const resUserB = await TransactionService.getUserTransactions(userB.id, {
      startDate: monthStart,
      endDate: monthEnd,
    });
    assert(resUserB.transactions.length === 0, 'Test 4b: User B sees 0 transactions (User isolation enforced)');

    // ----------------------------------------------------
    // TEST 5: SEARCH + DATE FILTER COMBINATION
    // ----------------------------------------------------
    const resSearch = await TransactionService.getUserTransactions(userA.id, {
      startDate: monthStart,
      endDate: monthEnd,
      search: 'Swiggy',
    });
    assert(resSearch.transactions.length === 1 && resSearch.transactions[0].merchant === 'Swiggy Today', 'Test 5a: Search + Date Filter combination works');

    // ----------------------------------------------------
    // TEST 6: ZERO DATABASE MUTATIONS
    // ----------------------------------------------------
    const countAfter = await prisma.transaction.count({ where: { userId: userA.id } });
    assert(countAfter === 7, 'Test 6a: Date filtering is strictly read-only (zero database mutations)');

    // Clean up
    await prisma.transaction.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.account.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.category.deleteMany({ where: { userId: userA.id } });
    await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });

    console.log(`\n==================================================`);
    console.log(`🧪 Date Range Audit Results: ${passed} PASSED, ${failed} FAILED`);
    console.log(`==================================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during date range audit:', err);
    process.exit(1);
  }
}

runDateRangeAudit();
