import { prisma } from './config/prisma.js';
import { FinancialTimelineService } from './services/financialTimelineService.js';
import { RecommendationEngine } from './services/action/recommendationEngine.js';
import { AccountType, TransactionType } from '@prisma/client';

async function runTimelineAudit() {
  console.log('🧪 Starting FINNEX Financial Timeline Realism & Eligibility Audit...\n');

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

  const testUserId = `audit_user_timeline_${Date.now()}`;

  try {
    // 1. Create test user
    const user = await prisma.user.create({
      data: {
        authProviderId: testUserId,
        email: `${testUserId}@finnex.test`,
        name: 'Timeline Audit User',
      },
    });

    // 2. Create Checking Account
    const acc = await prisma.account.create({
      data: {
        userId: user.id,
        name: 'Main Checking Account',
        type: AccountType.CHECKING,
        currency: 'INR',
        currentBalance: 250000.00,
      },
    });

    // 3. Create Categories
    let rentCat = await prisma.category.findFirst({ where: { isSystem: true, name: { contains: 'Rent' } } });
    if (!rentCat) {
      rentCat = await prisma.category.create({
        data: { name: 'Housing & Rent', icon: 'home', isSystem: true },
      });
    }

    // 4. Create recurring transactions for Rent, BESCOM Electricity, Salary, AND discretionary Swiggy, Uber, Zomato, Amazon
    const now = new Date();
    await prisma.transaction.createMany({
      data: [
        // Salary Income (2 consecutive months)
        {
          userId: user.id,
          accountId: acc.id,
          amount: 60000,
          type: TransactionType.INCOME,
          merchant: 'Infosys Salary',
          date: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        },
        {
          userId: user.id,
          accountId: acc.id,
          amount: 60000,
          type: TransactionType.INCOME,
          merchant: 'Infosys Salary',
          date: new Date(now.getFullYear(), now.getMonth(), 1),
        },
        // Rent (2 consecutive months)
        {
          userId: user.id,
          accountId: acc.id,
          categoryId: rentCat.id,
          amount: 18000,
          type: TransactionType.EXPENSE,
          merchant: 'Landlord Apartment Rent',
          date: new Date(now.getFullYear(), now.getMonth() - 1, 5),
        },
        {
          userId: user.id,
          accountId: acc.id,
          categoryId: rentCat.id,
          amount: 18000,
          type: TransactionType.EXPENSE,
          merchant: 'Landlord Apartment Rent',
          date: new Date(now.getFullYear(), now.getMonth(), 5),
        },
        // BESCOM Electricity (2 consecutive months)
        {
          userId: user.id,
          accountId: acc.id,
          amount: 2500,
          type: TransactionType.EXPENSE,
          merchant: 'BESCOM Electricity Bill',
          date: new Date(now.getFullYear(), now.getMonth() - 1, 25),
        },
        {
          userId: user.id,
          accountId: acc.id,
          amount: 2500,
          type: TransactionType.EXPENSE,
          merchant: 'BESCOM Electricity Bill',
          date: new Date(now.getFullYear(), now.getMonth(), 25),
        },
        // Swiggy (2 consecutive months - Discretionary)
        {
          userId: user.id,
          accountId: acc.id,
          amount: 4800,
          type: TransactionType.EXPENSE,
          merchant: 'Swiggy',
          date: new Date(now.getFullYear(), now.getMonth() - 1, 12),
        },
        {
          userId: user.id,
          accountId: acc.id,
          amount: 4800,
          type: TransactionType.EXPENSE,
          merchant: 'Swiggy',
          date: new Date(now.getFullYear(), now.getMonth(), 12),
        },
        // Uber (2 consecutive months - Discretionary)
        {
          userId: user.id,
          accountId: acc.id,
          amount: 4200,
          type: TransactionType.EXPENSE,
          merchant: 'Uber Rides',
          date: new Date(now.getFullYear(), now.getMonth() - 1, 12),
        },
        {
          userId: user.id,
          accountId: acc.id,
          amount: 4200,
          type: TransactionType.EXPENSE,
          merchant: 'Uber Rides',
          date: new Date(now.getFullYear(), now.getMonth(), 12),
        },
        // Zomato (2 consecutive months - Discretionary)
        {
          userId: user.id,
          accountId: acc.id,
          amount: 3100,
          type: TransactionType.EXPENSE,
          merchant: 'Zomato',
          date: new Date(now.getFullYear(), now.getMonth() - 1, 20),
        },
        {
          userId: user.id,
          accountId: acc.id,
          amount: 3100,
          type: TransactionType.EXPENSE,
          merchant: 'Zomato',
          date: new Date(now.getFullYear(), now.getMonth(), 20),
        },
        // Amazon India (2 consecutive months - Discretionary)
        {
          userId: user.id,
          accountId: acc.id,
          amount: 6500,
          type: TransactionType.EXPENSE,
          merchant: 'Amazon India',
          date: new Date(now.getFullYear(), now.getMonth() - 1, 20),
        },
        {
          userId: user.id,
          accountId: acc.id,
          amount: 6500,
          type: TransactionType.EXPENSE,
          merchant: 'Amazon India',
          date: new Date(now.getFullYear(), now.getMonth(), 20),
        },
      ],
    });

    // 5. Create Goals
    await prisma.goal.createMany({
      data: [
        {
          userId: user.id,
          name: 'MacBook Pro Laptop',
          targetAmount: 80000.00,
          currentAmount: 20000.00,
          targetDate: new Date('2026-11-30'),
        },
        {
          userId: user.id,
          name: 'Goa Trip Vacation',
          targetAmount: 50000.00,
          currentAmount: 10000.00,
          targetDate: new Date('2026-12-15'),
        },
        {
          userId: user.id,
          name: 'Emergency Fund',
          targetAmount: 300000.00,
          currentAmount: 150000.00,
          targetDate: new Date('2027-06-30'),
        },
        {
          userId: user.id,
          name: 'Debt-Free Loan Payoff',
          targetAmount: 250000.00,
          currentAmount: 50000.00,
          targetDate: new Date('2027-12-31'),
        },
      ],
    });

    // 6. Execute FinancialTimelineService.getTimeline()
    const timeline = await FinancialTimelineService.getTimeline(user.id);

    console.log(`Fetched ${timeline.length} timeline events:\n`);
    timeline.forEach((evt) => {
      console.log(`  [${evt.type}] Title: "${evt.title}" | Desc: "${evt.description}" | Amount: ${evt.amount}`);
    });
    console.log('');

    // --- ASSERTIONS ---

    // 1. Check FIXED commitments REMAIN on Timeline
    const rentEvt = timeline.find((e) => e.title.includes('Rent'));
    assert(!!rentEvt, 'Test 1: Rent appears on Timeline (Fixed Obligation)');

    const electricityEvt = timeline.find((e) => e.title.includes('Electricity'));
    assert(!!electricityEvt, 'Test 2: Electricity bill appears on Timeline (Fixed Obligation)');

    const salaryEvt = timeline.find((e) => e.type === 'EXPECTED_INCOME');
    assert(!!salaryEvt, 'Test 3: Salary appears on Timeline (Regular Income)');

    const goalEvts = timeline.filter((e) => e.type === 'GOAL_MILESTONE');
    assert(goalEvts.length === 4, 'Test 4: All 4 Goal Milestones appear on Timeline');

    // 2. Check DISCRETIONARY variable merchants are EXCLUDED from Timeline
    const swiggyEvt = timeline.find((e) => e.title.toLowerCase().includes('swiggy') || e.description.toLowerCase().includes('swiggy'));
    assert(!swiggyEvt, 'Test 5: Swiggy does NOT appear on Timeline as scheduled payment');

    const uberEvt = timeline.find((e) => e.title.toLowerCase().includes('uber') || e.description.toLowerCase().includes('uber'));
    assert(!uberEvt, 'Test 6: Uber does NOT appear on Timeline as scheduled payment');

    const zomatoEvt = timeline.find((e) => e.title.toLowerCase().includes('zomato') || e.description.toLowerCase().includes('zomato'));
    assert(!zomatoEvt, 'Test 7: Zomato does NOT appear on Timeline as scheduled payment');

    const amazonEvt = timeline.find((e) => e.title.toLowerCase().includes('amazon') || e.description.toLowerCase().includes('amazon'));
    assert(!amazonEvt, 'Test 8: Amazon does NOT appear on Timeline as scheduled payment');

    // 3. Check Action Center & Subscriptions STILL RETAIN discretionary recurring spending
    const actions = await RecommendationEngine.getActions(user.id);
    assert(
      actions.subscriptions.some((s) => s.merchant.toLowerCase().includes('swiggy')),
      'Test 9: Action Center STILL retains Swiggy recurring spending intelligence'
    );
    assert(
      actions.subscriptions.some((s) => s.merchant.toLowerCase().includes('uber')),
      'Test 10: Action Center STILL retains Uber recurring spending intelligence'
    );

    // ----------------------------------------------------------------------
    // Cleanup
    // ----------------------------------------------------------------------
    await prisma.transaction.deleteMany({ where: { userId: user.id } });
    await prisma.goal.deleteMany({ where: { userId: user.id } });
    await prisma.account.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });

    console.log(`\n==================================================`);
    console.log(`🧪 Timeline Realism Audit Results: ${passed} PASSED, ${failed} FAILED`);
    console.log(`==================================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during timeline audit:', err);
    process.exit(1);
  }
}

runTimelineAudit();
