import { prisma } from './config/prisma.js';
import { TransactionService } from './services/transactionService.js';
import { BudgetService } from './services/budgetService.js';
import { DashboardService } from './services/dashboardService.js';
import { FinancialHealthService } from './services/financialHealthService.js';
import { RecommendationEngine } from './services/action/recommendationEngine.js';
import { AccountType, TransactionType, TransactionSource } from '@prisma/client';

async function runDataConsistencyAudit() {
  console.log('🧪 Starting FINNEX Comprehensive Data Consistency Audit Test Suite...\n');

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
  const testUserIdA = `audit_user_a_${timestamp}`;
  const testUserIdB = `audit_user_b_${timestamp}`;

  try {
    // 1. Create User A and User B
    const userA = await prisma.user.create({
      data: {
        authProviderId: testUserIdA,
        email: `${testUserIdA}@finnex.test`,
        name: 'Audit User A',
      },
    });

    const userB = await prisma.user.create({
      data: {
        authProviderId: testUserIdB,
        email: `${testUserIdB}@finnex.test`,
        name: 'Audit User B',
      },
    });

    // 2. Create Categories for User A
    const catFood = await prisma.category.create({
      data: {
        userId: userA.id,
        name: `Audit Food ${timestamp}`,
        type: 'EXPENSE',
      },
    });

    const catShopping = await prisma.category.create({
      data: {
        userId: userA.id,
        name: `Audit Shopping ${timestamp}`,
        type: 'EXPENSE',
      },
    });

    // 3. Create Accounts for User A
    const accAChecking = await prisma.account.create({
      data: {
        userId: userA.id,
        name: 'User A Checking',
        type: AccountType.CHECKING,
        currency: 'INR',
        currentBalance: 50000.00,
      },
    });

    const accASavings = await prisma.account.create({
      data: {
        userId: userA.id,
        name: 'User A Savings',
        type: AccountType.SAVINGS,
        currency: 'INR',
        currentBalance: 100000.00,
      },
    });

    // 4. Create Account for User B
    const accBChecking = await prisma.account.create({
      data: {
        userId: userB.id,
        name: 'User B Checking',
        type: AccountType.CHECKING,
        currency: 'INR',
        currentBalance: 200000.00,
      },
    });

    // 5. Create Budget for User A on Food Category (Limit ₹10,000)
    const foodBudget = await BudgetService.createBudget(userA.id, {
      name: 'Food & Dining Budget',
      categoryId: catFood.id,
      amount: 10000.00,
      startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    });

    // Check Initial Budget State (0 Spent)
    let budgetsA = await BudgetService.getUserBudgets(userA.id);
    let foodBdg = budgetsA.find((b) => b.id === foodBudget.id);
    assert(foodBdg !== undefined && foodBdg.spentAmount === 0 && foodBdg.usagePercentage === 0, 'Initial Budget: ₹0 spent, 0% used');

    // ----------------------------------------------------
    // TEST 1: ADD TRANSACTION & VERIFY BUDGET / ACCOUNTS / DASHBOARD
    // ----------------------------------------------------
    const foodExpense = await TransactionService.createTransaction(userA.id, {
      accountId: accAChecking.id,
      amount: 4000,
      type: TransactionType.EXPENSE,
      categoryId: catFood.id,
      merchant: 'Swiggy',
      date: new Date(),
      source: TransactionSource.MANUAL,
    });

    let reFetchedAccA = await prisma.account.findUnique({ where: { id: accAChecking.id } });
    assert(parseFloat(reFetchedAccA!.currentBalance.toString()) === 46000, 'Test 1a: Adding ₹4,000 Expense decrements Checking balance (₹50,000 → ₹46,000)');

    budgetsA = await BudgetService.getUserBudgets(userA.id);
    foodBdg = budgetsA.find((b) => b.id === foodBudget.id);
    assert(
      foodBdg !== undefined && foodBdg.spentAmount === 4000 && foodBdg.remainingAmount === 6000 && foodBdg.usagePercentage === 40,
      'Test 1b: Budget spending updated to ₹4,000 (40% used, ₹6,000 remaining)'
    );

    let summaryA = await DashboardService.getSummary(userA.id);
    assert(summaryA.totalExpense === 4000, 'Test 1c: Dashboard totalExpense reflects ₹4,000');

    // ----------------------------------------------------
    // TEST 2: EDIT TRANSACTION AMOUNT & CATEGORY
    // ----------------------------------------------------
    // Edit Food Expense amount: ₹4,000 → ₹8,500
    await TransactionService.updateTransaction(userA.id, foodExpense.id, {
      amount: 8500,
    });

    reFetchedAccA = await prisma.account.findUnique({ where: { id: accAChecking.id } });
    assert(parseFloat(reFetchedAccA!.currentBalance.toString()) === 41500, 'Test 2a: Edit Expense ₹4,000 → ₹8,500 adjusts Checking balance to ₹41,500');

    budgetsA = await BudgetService.getUserBudgets(userA.id);
    foodBdg = budgetsA.find((b) => b.id === foodBudget.id);
    assert(
      foodBdg !== undefined && foodBdg.spentAmount === 8500 && foodBdg.usagePercentage === 85 && foodBdg.isWarning === true,
      'Test 2b: Budget spent updated to ₹8,500 (85% used, Near Limit Warning triggered)'
    );

    let actionsA = await RecommendationEngine.getActions(userA.id);
    let foodNudge = actionsA.nudges.find((n) => n.id.includes(foodBudget.id));
    assert(
      foodNudge !== undefined && foodNudge.evidence.some((e) => e.label === 'Current Spent' && e.value === '₹8,500'),
      'Test 2b-i: Action Center spent amount matches Budgets page spent amount (₹8,500)'
    );

    let healthA = await FinancialHealthService.calculateHealth(userA.id);
    let budgetComp = healthA.components.find((c) => c.name === 'Budgeting');
    assert(
      budgetComp !== undefined && budgetComp.explanation.includes('close to their limit'),
      'Test 2b-ii: Financial Health budget component matches Budgets page status (warning)'
    );

    // Edit Category: Food → Shopping
    await TransactionService.updateTransaction(userA.id, foodExpense.id, {
      categoryId: catShopping.id,
    });

    budgetsA = await BudgetService.getUserBudgets(userA.id);
    foodBdg = budgetsA.find((b) => b.id === foodBudget.id);
    assert(
      foodBdg !== undefined && foodBdg.spentAmount === 0 && foodBdg.usagePercentage === 0,
      'Test 2c: Changing transaction category to Shopping reverts Food Budget spent back to ₹0'
    );

    // Revert Category back to Food for budget verification
    await TransactionService.updateTransaction(userA.id, foodExpense.id, {
      categoryId: catFood.id,
    });

    // ----------------------------------------------------
    // TEST 3: TRANSFERS EXCLUDED FROM EXPENSES & BUDGETS
    // ----------------------------------------------------
    const transferTx = await TransactionService.createTransaction(userA.id, {
      accountId: accAChecking.id,
      transferAccountId: accASavings.id,
      amount: 15000,
      type: TransactionType.TRANSFER,
      date: new Date(),
    });

    const accACheck = await prisma.account.findUnique({ where: { id: accAChecking.id } });
    const accASave = await prisma.account.findUnique({ where: { id: accASavings.id } });
    assert(
      parseFloat(accACheck!.currentBalance.toString()) === 26500 &&
      parseFloat(accASave!.currentBalance.toString()) === 115000,
      'Test 3a: Transfer ₹15,000 moves funds between accounts (Checking: ₹26,500, Savings: ₹1,15,000)'
    );

    summaryA = await DashboardService.getSummary(userA.id);
    assert(summaryA.totalExpense === 8500, 'Test 3b: Transfer is strictly EXCLUDED from Dashboard totalExpense (remains ₹8,500)');

    budgetsA = await BudgetService.getUserBudgets(userA.id);
    foodBdg = budgetsA.find((b) => b.id === foodBudget.id);
    assert(foodBdg !== undefined && foodBdg.spentAmount === 8500, 'Test 3c: Transfer is strictly EXCLUDED from Budget spentAmount (remains ₹8,500)');

    // ----------------------------------------------------
    // TEST 4: DELETE TRANSACTION & BALANCE/BUDGET REVERSION
    // ----------------------------------------------------
    await TransactionService.deleteTransaction(userA.id, foodExpense.id);

    reFetchedAccA = await prisma.account.findUnique({ where: { id: accAChecking.id } });
    assert(parseFloat(reFetchedAccA!.currentBalance.toString()) === 35000, 'Test 4a: Deleting expense reverts Checking balance back to ₹35,000 (+₹8,500 relative to ₹26,500)');

    budgetsA = await BudgetService.getUserBudgets(userA.id);
    foodBdg = budgetsA.find((b) => b.id === foodBudget.id);
    assert(foodBdg !== undefined && foodBdg.spentAmount === 0 && foodBdg.usagePercentage === 0, 'Test 4b: Deleting expense reverts Food Budget spent back to ₹0');

    // ----------------------------------------------------
    // TEST 5: MULTI-TENANT CROSS-USER ISOLATION
    // ----------------------------------------------------
    const txsB = await TransactionService.getUserTransactions(userB.id);
    assert(txsB.transactions.length === 0, 'Test 5a: User B sees 0 transactions');

    const budgetsB = await BudgetService.getUserBudgets(userB.id);
    assert(budgetsB.length === 0, 'Test 5b: User B sees 0 budgets');

    let accessDenied = false;
    try {
      await TransactionService.getTransactionById(userB.id, transferTx.id);
    } catch (err: any) {
      if (err.statusCode === 404 || err.message.includes('not found')) {
        accessDenied = true;
      }
    }
    assert(accessDenied, 'Test 5c: User B cannot access User A transaction (404 Not Found)');

    // Clean up test data
    await prisma.transaction.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.budget.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.account.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.category.deleteMany({ where: { userId: userA.id } });
    await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });

    console.log(`\n==================================================`);
    console.log(`🧪 Data Consistency Audit Results: ${passed} PASSED, ${failed} FAILED`);
    console.log(`==================================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during data consistency audit:', err);
    process.exit(1);
  }
}

runDataConsistencyAudit();
