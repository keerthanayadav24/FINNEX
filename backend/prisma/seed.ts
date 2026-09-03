import { PrismaClient, User, AccountType, TransactionType, TransactionSource, CategoryType, BudgetPeriod, NotificationType } from '@prisma/client';

const prisma = new PrismaClient();

async function countUserRelatedRecords(userId: string): Promise<number> {
  const [accs, cats, txs, bdgs, gls, contribs, notifs] = await Promise.all([
    prisma.account.count({ where: { userId } }),
    prisma.category.count({ where: { userId } }),
    prisma.transaction.count({ where: { userId } }),
    prisma.budget.count({ where: { userId } }),
    prisma.goal.count({ where: { userId } }),
    prisma.goalContribution.count({ where: { goal: { userId } } }),
    prisma.notification.count({ where: { userId } }),
  ]);
  return accs + cats + txs + bdgs + gls + contribs + notifs;
}

async function main() {
  console.log('🌱 Starting FINNEX Indian INR database seeding...');

  // 1. System Default Categories
  const systemCategoriesData = [
    { name: 'Food & Dining', icon: 'utensils', type: CategoryType.EXPENSE, isSystem: true },
    { name: 'Transportation', icon: 'car', type: CategoryType.EXPENSE, isSystem: true },
    { name: 'Shopping', icon: 'shopping-bag', type: CategoryType.EXPENSE, isSystem: true },
    { name: 'Bills & Utilities', icon: 'receipt', type: CategoryType.EXPENSE, isSystem: true },
    { name: 'Entertainment', icon: 'film', type: CategoryType.EXPENSE, isSystem: true },
    { name: 'Healthcare', icon: 'activity', type: CategoryType.EXPENSE, isSystem: true },
    { name: 'Salary & Income', icon: 'dollar-sign', type: CategoryType.INCOME, isSystem: true },
    { name: 'Investments', icon: 'trending-up', type: CategoryType.BOTH, isSystem: true },
    { name: 'Other', icon: 'more-horizontal', type: CategoryType.BOTH, isSystem: true },
  ];

  const categoriesMap: Record<string, string> = {};

  for (const cat of systemCategoriesData) {
    const existing = await prisma.category.findFirst({
      where: { name: cat.name, isSystem: true },
    });
    if (existing) {
      categoriesMap[cat.name] = existing.id;
    } else {
      const created = await prisma.category.create({
        data: cat,
      });
      categoriesMap[cat.name] = created.id;
    }
  }
  console.log(`✅ System default categories seeded (${Object.keys(categoriesMap).length} categories)`);

  // 2. Rohan (Primary User Account)
  let userA: User | null = null;

  const emailUser = await prisma.user.findFirst({
    where: { email: 'rohan@finnex.app' },
  });

  const staleUser = await prisma.user.findFirst({
    where: { authProviderId: 'dev_user_demo_123' },
  });

  // Handle State 3: Both exist as separate rows (e.g. Render prod after auto-provisioning)
  if (emailUser && staleUser && emailUser.id !== staleUser.id) {
    const staleRelatedCount = await countUserRelatedRecords(staleUser.id);
    if (staleRelatedCount === 0) {
      await prisma.user.delete({ where: { id: staleUser.id } });
      console.log(`🧹 Cleaned up stale unseeded user: ${staleUser.id}`);
    } else {
      await prisma.user.update({
        where: { id: staleUser.id },
        data: { authProviderId: `dev_user_demo_123_stale_${staleUser.id.substring(0, 8)}` },
      });
    }
  }

  const targetUser: User | null = emailUser || staleUser;

  if (targetUser) {
    userA = await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        name: 'Rohan',
        email: 'rohan@finnex.app',
        authProviderId: 'dev_user_demo_123',
      },
    });
  } else {
    userA = await prisma.user.create({
      data: {
        authProviderId: 'dev_user_demo_123',
        email: 'rohan@finnex.app',
        name: 'Rohan',
      },
    });
  }
  console.log(`✅ User A created/updated: ${userA.email} (${userA.id})`);

  // 3. Demo User B (For cross-user isolation verification)
  let userB = await prisma.user.findFirst({
    where: {
      OR: [
        { authProviderId: 'dev_user_test_456' },
        { email: 'user2@finnex.app' },
      ],
    },
  });

  if (userB) {
    userB = await prisma.user.update({
      where: { id: userB.id },
      data: {
        name: 'Test User B',
        email: 'user2@finnex.app',
        authProviderId: 'dev_user_test_456',
      },
    });
  } else {
    userB = await prisma.user.create({
      data: {
        authProviderId: 'dev_user_test_456',
        email: 'user2@finnex.app',
        name: 'Test User B',
      },
    });
  }

  // 4. User A Financial Accounts (Indian Rupee INR)
  await prisma.account.deleteMany({ where: { userId: userA.id } });

  const checkingAccount = await prisma.account.create({
    data: {
      userId: userA.id,
      name: 'HDFC Salary Checking Account',
      type: AccountType.CHECKING,
      currency: 'INR',
      currentBalance: 35000.00,
    },
  });

  const savingsAccount = await prisma.account.create({
    data: {
      userId: userA.id,
      name: 'ICICI Emergency Savings Account',
      type: AccountType.SAVINGS,
      currency: 'INR',
      currentBalance: 120000.00,
    },
  });

  const creditCard = await prisma.account.create({
    data: {
      userId: userA.id,
      name: 'SBI Reward Credit Card',
      type: AccountType.CREDIT_CARD,
      currency: 'INR',
      currentBalance: 18500.00,
    },
  });

  const loanAccount = await prisma.account.create({
    data: {
      userId: userA.id,
      name: 'Axis Bank Personal Loan',
      type: AccountType.LOAN,
      currency: 'INR',
      currentBalance: 250000.00,
    },
  });

  console.log(`✅ User A Indian accounts seeded (Checking ₹35,000, Savings ₹1,20,000, Credit Card ₹18,500, Loan ₹2,50,000)`);

  // 5. User B Financial Account
  await prisma.account.deleteMany({ where: { userId: userB.id } });
  await prisma.account.create({
    data: {
      userId: userB.id,
      name: "User B's Private Account",
      type: AccountType.CHECKING,
      currency: 'INR',
      currentBalance: 500000.00,
    },
  });

  // 6. User A Transactions
  await prisma.transaction.deleteMany({ where: { userId: userA.id } });

  const now = new Date();

  // Previous month dates
  const prevMonthDate1 = new Date(now.getFullYear(), now.getMonth() - 1, 5);
  const prevMonthDate2 = new Date(now.getFullYear(), now.getMonth() - 1, 12);
  const prevMonthDate3 = new Date(now.getFullYear(), now.getMonth() - 1, 20);
  const prevMonthDate4 = new Date(now.getFullYear(), now.getMonth() - 1, 25);

  // Current month dates
  const currMonthDate1 = new Date(now.getFullYear(), now.getMonth(), Math.min(2, now.getDate()));
  const currMonthDate2 = new Date(now.getFullYear(), now.getMonth(), Math.min(5, now.getDate()));
  const currMonthDate3 = new Date(now.getFullYear(), now.getMonth(), Math.min(10, now.getDate()));
  const currMonthDate4 = new Date(now.getFullYear(), now.getMonth(), Math.min(15, now.getDate()));

  await prisma.transaction.createMany({
    data: [
      // Previous Month Transactions
      {
        userId: userA.id,
        accountId: checkingAccount.id,
        amount: 60000.00,
        type: TransactionType.INCOME,
        categoryId: categoriesMap['Salary & Income'],
        merchant: 'Infosys Salary',
        date: prevMonthDate1,
        source: TransactionSource.MANUAL,
        description: 'Monthly Salary Credit',
        tags: ['salary', 'primary-income'],
      },
      {
        userId: userA.id,
        accountId: checkingAccount.id,
        amount: 8000.00,
        type: TransactionType.INCOME,
        categoryId: categoriesMap['Salary & Income'],
        merchant: 'Upwork Freelance',
        date: prevMonthDate2,
        source: TransactionSource.MANUAL,
        description: 'Freelance Design Work',
        tags: ['freelance', 'side-hustle'],
      },
      {
        userId: userA.id,
        accountId: checkingAccount.id,
        amount: 18000.00,
        type: TransactionType.EXPENSE,
        categoryId: categoriesMap['Bills & Utilities'],
        merchant: 'Landlord Apartment Rent',
        date: prevMonthDate1,
        source: TransactionSource.MANUAL,
        description: 'Monthly Apartment Rent',
        tags: ['rent', 'fixed-expense'],
      },
      {
        userId: userA.id,
        accountId: creditCard.id,
        amount: 3200.00,
        type: TransactionType.EXPENSE,
        categoryId: categoriesMap['Food & Dining'],
        merchant: 'Swiggy',
        date: prevMonthDate2,
        source: TransactionSource.MANUAL,
        description: 'Food Delivery Orders',
        tags: ['food', 'dining'],
      },
      {
        userId: userA.id,
        accountId: creditCard.id,
        amount: 2800.00,
        type: TransactionType.EXPENSE,
        categoryId: categoriesMap['Food & Dining'],
        merchant: 'Zomato',
        date: prevMonthDate3,
        source: TransactionSource.MANUAL,
        description: 'Weekend Dining Out',
        tags: ['food', 'dining'],
      },
      {
        userId: userA.id,
        accountId: creditCard.id,
        amount: 3500.00,
        type: TransactionType.EXPENSE,
        categoryId: categoriesMap['Transportation'],
        merchant: 'Uber Rides',
        date: prevMonthDate2,
        source: TransactionSource.MANUAL,
        description: 'Office Commute',
        tags: ['commute', 'cab'],
      },
      {
        userId: userA.id,
        accountId: creditCard.id,
        amount: 5000.00,
        type: TransactionType.EXPENSE,
        categoryId: categoriesMap['Shopping'],
        merchant: 'Amazon India',
        date: prevMonthDate3,
        source: TransactionSource.MANUAL,
        description: 'Electronics & Household Goods',
        tags: ['shopping', 'amazon'],
      },
      {
        userId: userA.id,
        accountId: creditCard.id,
        amount: 2000.00,
        type: TransactionType.EXPENSE,
        categoryId: categoriesMap['Entertainment'],
        merchant: 'Netflix & PVR',
        date: prevMonthDate4,
        source: TransactionSource.MANUAL,
        description: 'Movie Outing & Streaming',
        tags: ['movies', 'entertainment'],
      },
      {
        userId: userA.id,
        accountId: checkingAccount.id,
        amount: 3000.00,
        type: TransactionType.EXPENSE,
        categoryId: categoriesMap['Bills & Utilities'],
        merchant: 'BESCOM Electricity Bill',
        date: prevMonthDate4,
        source: TransactionSource.MANUAL,
        description: 'Electricity & Broadband Bill',
        tags: ['utilities', 'bills'],
      },

      // Current Month Transactions
      {
        userId: userA.id,
        accountId: checkingAccount.id,
        amount: 60000.00,
        type: TransactionType.INCOME,
        categoryId: categoriesMap['Salary & Income'],
        merchant: 'Infosys Salary',
        date: currMonthDate1,
        source: TransactionSource.MANUAL,
        description: 'Monthly Salary Credit',
        tags: ['salary', 'primary-income'],
      },
      {
        userId: userA.id,
        accountId: checkingAccount.id,
        amount: 18000.00,
        type: TransactionType.EXPENSE,
        categoryId: categoriesMap['Bills & Utilities'],
        merchant: 'Landlord Apartment Rent',
        date: currMonthDate1,
        source: TransactionSource.MANUAL,
        description: 'Monthly Apartment Rent',
        tags: ['rent', 'fixed-expense'],
      },
      {
        userId: userA.id,
        accountId: creditCard.id,
        amount: 4800.00,
        type: TransactionType.EXPENSE,
        categoryId: categoriesMap['Food & Dining'],
        merchant: 'Swiggy',
        date: currMonthDate2,
        source: TransactionSource.MANUAL,
        description: 'Food Delivery Orders',
        tags: ['food', 'dining'],
      },
      {
        userId: userA.id,
        accountId: creditCard.id,
        amount: 3100.00,
        type: TransactionType.EXPENSE,
        categoryId: categoriesMap['Food & Dining'],
        merchant: 'Zomato',
        date: currMonthDate3,
        source: TransactionSource.MANUAL,
        description: 'Weekend Dining Out',
        tags: ['food', 'dining'],
      },
      {
        userId: userA.id,
        accountId: creditCard.id,
        amount: 4200.00,
        type: TransactionType.EXPENSE,
        categoryId: categoriesMap['Transportation'],
        merchant: 'Uber Rides',
        date: currMonthDate2,
        source: TransactionSource.MANUAL,
        description: 'Office Commute',
        tags: ['commute', 'cab'],
      },
      {
        userId: userA.id,
        accountId: creditCard.id,
        amount: 6500.00,
        type: TransactionType.EXPENSE,
        categoryId: categoriesMap['Shopping'],
        merchant: 'Amazon India',
        date: currMonthDate3,
        source: TransactionSource.MANUAL,
        description: 'Festival Shopping',
        tags: ['shopping', 'amazon'],
      },
      {
        userId: userA.id,
        accountId: checkingAccount.id,
        amount: 3400.00,
        type: TransactionType.EXPENSE,
        categoryId: categoriesMap['Bills & Utilities'],
        merchant: 'BESCOM Electricity Bill',
        date: currMonthDate4,
        source: TransactionSource.MANUAL,
        description: 'Electricity & Broadband Bill',
        tags: ['utilities', 'bills'],
      },
      {
        userId: userA.id,
        accountId: checkingAccount.id,
        amount: 2500.00,
        type: TransactionType.EXPENSE,
        categoryId: categoriesMap['Healthcare'],
        merchant: 'Apollo Pharmacy',
        date: currMonthDate4,
        source: TransactionSource.MANUAL,
        description: 'Medicines & Health Checkup',
        tags: ['health', 'pharmacy'],
      },
      {
        userId: userA.id,
        accountId: checkingAccount.id,
        transferAccountId: savingsAccount.id,
        amount: 10000.00,
        type: TransactionType.TRANSFER,
        categoryId: null,
        merchant: 'Internal Savings Transfer',
        date: currMonthDate4,
        source: TransactionSource.MANUAL,
        description: 'Monthly Savings Transfer to ICICI Account',
        tags: ['transfer', 'savings-goal'],
      },
    ],
  });
  console.log(`✅ User A Indian transactions seeded`);

  // 7. User A Budgets
  await prisma.budget.deleteMany({ where: { userId: userA.id } });
  await prisma.budget.createMany({
    data: [
      {
        userId: userA.id,
        categoryId: categoriesMap['Food & Dining'],
        name: 'Food & Dining Budget',
        amount: 10000.00,
        period: BudgetPeriod.MONTHLY,
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
      },
      {
        userId: userA.id,
        categoryId: categoriesMap['Shopping'],
        name: 'Monthly Shopping Budget',
        amount: 8000.00,
        period: BudgetPeriod.MONTHLY,
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
      },
    ],
  });
  console.log(`✅ User A Indian budgets seeded`);

  // 8. User A Goals & Opening Contributions
  await prisma.goal.deleteMany({ where: { userId: userA.id } });

  const g1 = await prisma.goal.create({
    data: {
      userId: userA.id,
      name: 'Emergency Fund',
      targetAmount: 300000.00,
      currentAmount: 120000.00,
      targetDate: new Date(now.getFullYear() + 1, 11, 31),
      contributions: {
        create: {
          amount: 120000.00,
          note: 'Initial Emergency Fund Savings',
          date: new Date(),
          isInitial: true,
        },
      },
    },
  });

  const g2 = await prisma.goal.create({
    data: {
      userId: userA.id,
      name: 'Goa Vacation Trip',
      targetAmount: 50000.00,
      currentAmount: 15000.00,
      targetDate: new Date(now.getFullYear(), 11, 31),
      contributions: {
        create: {
          amount: 15000.00,
          note: 'Initial Goa Savings',
          date: new Date(),
          isInitial: true,
        },
      },
    },
  });

  const g3 = await prisma.goal.create({
    data: {
      userId: userA.id,
      name: 'MacBook Pro Laptop',
      targetAmount: 80000.00,
      currentAmount: 30000.00,
      targetDate: new Date(now.getFullYear(), 9, 31),
      contributions: {
        create: {
          amount: 30000.00,
          note: 'Initial Laptop Savings',
          date: new Date(),
          isInitial: true,
        },
      },
    },
  });

  const g4 = await prisma.goal.create({
    data: {
      userId: userA.id,
      name: 'Debt-Free Loan Payoff',
      targetAmount: 250000.00,
      currentAmount: 50000.00,
      targetDate: new Date(now.getFullYear() + 2, 5, 30),
      contributions: {
        create: {
          amount: 50000.00,
          note: 'Initial Loan Payoff Saved',
          date: new Date(),
          isInitial: true,
        },
      },
    },
  });

  console.log(`✅ User A Indian goals & contributions seeded (Emergency Fund ₹3,00,000, Goa Trip ₹50,000, Laptop ₹80,000, Debt Payoff ₹2,50,000)`);

  // 9. User A Notifications
  await prisma.notification.deleteMany({ where: { userId: userA.id } });
  await prisma.notification.create({
    data: {
      userId: userA.id,
      title: 'Welcome to FINNEX (INR)',
      message: 'FINNEX is configured for Indian Rupee (₹) financial decision support!',
      type: NotificationType.INFO,
      isRead: false,
    },
  });
  console.log(`✅ User A notification seeded`);

  console.log('🎉 Indian INR Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seed:', e);
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
