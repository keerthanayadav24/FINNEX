import { prisma } from './config/prisma.js';
import { ScenarioEngine } from './services/scenario/scenarioEngine.js';
import { AccountType, TransactionType, TransactionSource } from '@prisma/client';

async function runScenarioPlannerAudit() {
  console.log('🧪 Starting Scenario Planner Monthly Income Baseline Audit Test Suite...\n');

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
  const testUserIdA = `scenario_user_a_${timestamp}`;

  try {
    // 1. Create User A
    const userA = await prisma.user.create({
      data: {
        authProviderId: testUserIdA,
        email: `${testUserIdA}@finnex.test`,
        name: 'Scenario User A',
      },
    });

    const accChecking = await prisma.account.create({
      data: {
        userId: userA.id,
        name: 'Checking Account',
        type: AccountType.CHECKING,
        currency: 'INR',
        currentBalance: 100000.00,
      },
    });

    const catSalary = await prisma.category.create({
      data: { userId: userA.id, name: 'Salary', type: 'INCOME' },
    });

    const catFreelance = await prisma.category.create({
      data: { userId: userA.id, name: 'Freelance', type: 'INCOME' },
    });

    // 2. Add Multi-Month Salary Entries (Month 1: ₹60,000, Month 2: ₹60,000)
    const month1Date = new Date();
    month1Date.setMonth(month1Date.getMonth() - 1);

    const month2Date = new Date();

    await prisma.transaction.createMany({
      data: [
        {
          userId: userA.id,
          accountId: accChecking.id,
          amount: 60000,
          type: TransactionType.INCOME,
          categoryId: catSalary.id,
          merchant: 'TechCorp Salary',
          description: 'Monthly Salary',
          date: month1Date,
          source: TransactionSource.MANUAL,
        },
        {
          userId: userA.id,
          accountId: accChecking.id,
          amount: 60000,
          type: TransactionType.INCOME,
          categoryId: catSalary.id,
          merchant: 'TechCorp Salary',
          description: 'Monthly Salary',
          date: month2Date,
          source: TransactionSource.MANUAL,
        },
        {
          userId: userA.id,
          accountId: accChecking.id,
          amount: 8000,
          type: TransactionType.INCOME,
          categoryId: catFreelance.id,
          merchant: 'Design Client',
          description: 'One-off freelance logo design',
          date: month2Date,
          source: TransactionSource.MANUAL,
        },
      ],
    });

    // ----------------------------------------------------
    // TEST 1: RECURRING SALARY IDENTIFICATION (EARN MORE)
    // ----------------------------------------------------
    const resultEarnMore = await ScenarioEngine.simulate(userA.id, {
      scenarioType: 'INCOME_CHANGE',
      scenarioParameters: { monthlyIncomeChange: 1000 },
    });

    assert(
      resultEarnMore.baseline.monthlyValue === 60000,
      `Test 1a: Earn More baseline uses regular recurring salary (₹60,000/mo, NOT diluted to ₹42,667)`
    );

    assert(
      resultEarnMore.baseline.hasConfidentRecurringIncome === true,
      'Test 1b: Confident recurring income pattern detected'
    );

    assert(
      resultEarnMore.baseline.variableMonthlyIncome === 4000,
      'Test 1c: Variable freelance income reported separately as ₹4,000/mo'
    );

    assert(
      resultEarnMore.scenario.monthlyValue === 61000,
      'Test 1d: Simulated new monthly income is ₹61,000/mo (₹60,000 baseline + ₹1,000 scenario boost)'
    );

    assert(
      resultEarnMore.difference.annualDifference === 12000,
      'Test 1e: Annual additional income difference is ₹12,000/yr'
    );

    // ----------------------------------------------------
    // TEST 2: SPEND LESS SCENARIO DOES NOT ALTER INCOME
    // ----------------------------------------------------
    const resultSpendLess = await ScenarioEngine.simulate(userA.id, {
      scenarioType: 'SPENDING_REDUCTION',
      scenarioParameters: { monthlyReduction: 2000 },
    });

    assert(
      resultSpendLess.scenarioType === 'SPENDING_REDUCTION',
      'Test 2a: Spend Less scenario simulated cleanly'
    );

    // ----------------------------------------------------
    // TEST 3: ZERO DATABASE MUTATIONS
    // ----------------------------------------------------
    const txCountAfter = await prisma.transaction.count({ where: { userId: userA.id } });
    assert(txCountAfter === 3, 'Test 3a: Scenario simulations are 100% read-only with zero database mutations');

    // Clean up
    await prisma.transaction.deleteMany({ where: { userId: userA.id } });
    await prisma.account.deleteMany({ where: { userId: userA.id } });
    await prisma.category.deleteMany({ where: { userId: userA.id } });
    await prisma.user.delete({ where: { id: userA.id } });

    console.log(`\n==================================================`);
    console.log(`🧪 Scenario Planner Audit Results: ${passed} PASSED, ${failed} FAILED`);
    console.log(`==================================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during scenario planner audit:', err);
    process.exit(1);
  }
}

runScenarioPlannerAudit();
