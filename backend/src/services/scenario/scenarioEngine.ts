import { AccountType, TransactionType } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { GoalService } from '../goalService.js';
import { calculateProjectedCompletionDate, calculateRemaining } from '../goalPlanningUtils.js';
import { SimulateScenarioInput, ScenarioSimulationResult, ScenarioAffectedGoal } from './scenarioTypes.js';

export class ScenarioEngine {
  static async simulate(userId: string, input: SimulateScenarioInput): Promise<ScenarioSimulationResult> {
    const { scenarioType, scenarioParameters } = input;
    const now = new Date();

    const fmtInr = (v: number) => `₹${Math.round(Math.abs(v)).toLocaleString('en-IN')}`;

    // 1. SCENARIO TYPE A — SPEND LESS (SPENDING_REDUCTION)
    if (scenarioType === 'SPENDING_REDUCTION') {
      const requestedReduction = Math.max(0, scenarioParameters.monthlyReduction || 0);
      let catName = 'all spending';
      let isCategorySpecific = false;

      if (scenarioParameters.categoryId) {
        const cat = await prisma.category.findFirst({
          where: { id: scenarioParameters.categoryId, OR: [{ userId }, { isSystem: true }] },
        });
        if (cat) {
          catName = cat.name;
          isCategorySpecific = true;
        }
      }

      const expenses = await prisma.transaction.findMany({
        where: {
          userId,
          type: TransactionType.EXPENSE,
          ...(scenarioParameters.categoryId ? { categoryId: scenarioParameters.categoryId } : {}),
        },
      });

      const totalSpent = expenses.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

      // Determine monthly baseline in this category / total spending
      // Calculate active months or default to 1 (if empty/fresh)
      const monthsCount = Math.max(1, expenses.length > 0 ? 3 : 1);
      const baselineMonthly = Math.round((totalSpent / monthsCount) * 100) / 100;

      // Cap reduction at baselineMonthly so category spending cannot go negative!
      const effectiveReduction = baselineMonthly > 0 ? Math.min(requestedReduction, baselineMonthly) : requestedReduction;
      const simulatedMonthly = Math.max(0, Math.round((baselineMonthly - effectiveReduction) * 100) / 100);
      const annualDiff = Math.round(effectiveReduction * 12 * 100) / 100;

      const isCapped = isCategorySpecific && baselineMonthly > 0 && requestedReduction > baselineMonthly;

      // Evaluate impact on active goals using effective reduction
      const goals = await GoalService.getGoals(userId);
      const affectedGoals: ScenarioAffectedGoal[] = [];

      goals.forEach((g) => {
        if (g.currentAmount < g.targetAmount && g.metrics.remainingAmount > 0) {
          const baselinePace = g.metrics.averageMonthlyContribution;
          const simulatedPace = baselinePace + effectiveReduction;

          const baselineDateStr = g.metrics.projectedCompletionDate;
          const simulatedDateObj = calculateProjectedCompletionDate(g.metrics.remainingAmount, simulatedPace, now);
          const simulatedDateStr = typeof simulatedDateObj === 'string' ? simulatedDateObj : (simulatedDateObj ? (simulatedDateObj as Date).toISOString() : null);

          let monthsSaved = 0;
          if (baselineDateStr && simulatedDateStr) {
            const bD = new Date(baselineDateStr);
            const sD = new Date(simulatedDateStr);
            monthsSaved = Math.max(0, Math.round((bD.getTime() - sD.getTime()) / (30 * 24 * 60 * 60 * 1000)));
          }

          const explanation = monthsSaved > 0
            ? `Spending ${fmtInr(effectiveReduction)} less each month could help you reach your ${g.name} goal about ${monthsSaved} month(s) sooner.`
            : `Spending ${fmtInr(effectiveReduction)} less each month adds ${fmtInr(annualDiff)} to your available savings each year, but doesn't significantly change this goal's target date yet.`;

          affectedGoals.push({
            goalId: g.id,
            goalName: g.name,
            baselineRequiredMonthly: g.metrics.requiredMonthlyContribution || 0,
            baselineProjectedDate: baselineDateStr,
            scenarioProjectedDate: simulatedDateStr,
            monthsSaved,
            explanation,
          });
        }
      });

      const explanations: string[] = [
        `Spending ${fmtInr(effectiveReduction)} less each month on ${catName}.`,
        `Possible annual savings: ${fmtInr(annualDiff)}.`,
      ];

      if (isCapped) {
        explanations.push(
          `${catName} currently averages ${fmtInr(baselineMonthly)} a month, so a ${fmtInr(requestedReduction)} reduction exceeds current spending. Applied maximum reduction of ${fmtInr(baselineMonthly)} a month.`
        );
      }

      return {
        scenarioType,
        baseline: {
          monthlyValue: baselineMonthly,
          annualValue: Math.round(baselineMonthly * 12 * 100) / 100,
          description: `Your typical monthly spending on ${catName} is about ${fmtInr(baselineMonthly)} (based on your recent spending history).`,
        },
        scenario: {
          monthlyValue: simulatedMonthly,
          annualValue: Math.round(simulatedMonthly * 12 * 100) / 100,
          description: isCapped
            ? `Spending ${fmtInr(effectiveReduction)} less (maximum possible in ${catName}) reduces monthly spending to ${fmtInr(simulatedMonthly)}.`
            : `Spending ${fmtInr(effectiveReduction)} less each month reduces spending to ${fmtInr(simulatedMonthly)} a month.`,
        },
        difference: {
          monthlyDifference: effectiveReduction,
          annualDifference: annualDiff,
          description: `Spending ${fmtInr(effectiveReduction)} less each month could leave you with an extra ${fmtInr(annualDiff)} over a year.`,
        },
        affectedGoals,
        explanations,
        dataQuality: expenses.length > 0 ? 'HIGH' : 'MEDIUM',
        isHypothetical: true,
      };
    }

    // 2. SCENARIO TYPE B — SAVE MORE (ADDITIONAL_GOAL_CONTRIBUTION)
    if (scenarioType === 'ADDITIONAL_GOAL_CONTRIBUTION') {
      if (!scenarioParameters.goalId) {
        throw new Error('Please select a goal to boost.');
      }

      const goal = await GoalService.getGoalById(userId, scenarioParameters.goalId);
      if (!goal) {
        throw new Error('Referenced goal not found.');
      }

      const extraMonthly = Math.max(0, scenarioParameters.additionalMonthlyContribution || 0);
      const baselinePace = goal.metrics.averageMonthlyContribution;
      const simulatedPace = baselinePace + extraMonthly;

      const targetAmount = parseFloat(goal.targetAmount.toString());
      const currentAmount = parseFloat(goal.currentAmount.toString());
      const remainingAmount = Math.max(0, targetAmount - currentAmount);
      const monthsToReach = simulatedPace > 0 && remainingAmount > 0 ? Math.ceil(remainingAmount / simulatedPace) : (remainingAmount === 0 ? 0 : null);

      const baselineDateStr = goal.metrics.projectedCompletionDate;
      const simulatedDateObj = calculateProjectedCompletionDate(goal.metrics.remainingAmount, simulatedPace, now);
      const simulatedDateStr = typeof simulatedDateObj === 'string' ? simulatedDateObj : (simulatedDateObj ? (simulatedDateObj as Date).toISOString() : null);

      let monthsSaved = 0;
      if (baselineDateStr && simulatedDateStr) {
        const bD = new Date(baselineDateStr);
        const sD = new Date(simulatedDateStr);
        monthsSaved = Math.max(0, Math.round((bD.getTime() - sD.getTime()) / (30 * 24 * 60 * 60 * 1000)));
      }

      const annualExtra = Math.round(extraMonthly * 12 * 100) / 100;
      let explanation = `At ${fmtInr(simulatedPace)} a month, you could reach your ${goal.name} target in about ${monthsToReach} months.`;
      if (remainingAmount === 0) {
        explanation = `Goal completed! You've reached your target of ${fmtInr(targetAmount)}.`;
      } else if (monthsSaved > 0) {
        explanation = `You could reach your ${goal.name} target about ${monthsSaved} month(s) sooner (in about ${monthsToReach} months).`;
      }

      const affectedGoal: ScenarioAffectedGoal = {
        goalId: goal.id,
        goalName: goal.name,
        baselineRequiredMonthly: goal.metrics.requiredMonthlyContribution || 0,
        baselineProjectedDate: baselineDateStr,
        scenarioProjectedDate: simulatedDateStr,
        monthsSaved,
        explanation,
        targetAmount,
        currentAmount,
        remainingAmount,
        monthsToReach,
      };

      return {
        scenarioType,
        baseline: {
          monthlyValue: baselinePace,
          annualValue: Math.round(baselinePace * 12 * 100) / 100,
          description: `You're currently adding about ${fmtInr(baselinePace)} a month to this goal.`,
        },
        scenario: {
          monthlyValue: Math.round(simulatedPace * 100) / 100,
          annualValue: Math.round(simulatedPace * 12 * 100) / 100,
          description: `With this change, you'd add ${fmtInr(simulatedPace)} to this goal each month.`,
        },
        difference: {
          monthlyDifference: extraMonthly,
          annualDifference: annualExtra,
          description: `That's an extra ${fmtInr(annualExtra)} toward this goal over a year.`,
        },
        affectedGoals: [affectedGoal],
        explanations: [
          `Saving ${fmtInr(extraMonthly)} more each month toward ${goal.name}.`,
        ],
        dataQuality: 'HIGH',
        isHypothetical: true,
      };
    }

    // 3. SCENARIO TYPE C — EARN MORE (INCOME_CHANGE)
    if (scenarioType === 'INCOME_CHANGE') {
      const incomeChange = Math.max(0, scenarioParameters.monthlyIncomeChange || 0);

      const incomeAnalysis = await ScenarioEngine.analyzeUserIncome(userId);
      const baselineMonthlyIncome = incomeAnalysis.regularMonthlyIncome;
      const simulatedMonthlyIncome = Math.round((baselineMonthlyIncome + incomeChange) * 100) / 100;
      const annualDiff = Math.round(incomeChange * 12 * 100) / 100;

      // Evaluate impact on active goals using income increase
      const goals = await GoalService.getGoals(userId);
      const affectedGoals: ScenarioAffectedGoal[] = [];

      goals.forEach((g) => {
        if (g.currentAmount < g.targetAmount && g.metrics.remainingAmount > 0) {
          const baselinePace = g.metrics.averageMonthlyContribution;
          const simulatedPace = baselinePace + incomeChange;

          const baselineDateStr = g.metrics.projectedCompletionDate;
          const simulatedDateObj = calculateProjectedCompletionDate(g.metrics.remainingAmount, simulatedPace, now);
          const simulatedDateStr = typeof simulatedDateObj === 'string' ? simulatedDateObj : (simulatedDateObj ? (simulatedDateObj as Date).toISOString() : null);

          let monthsSaved = 0;
          if (baselineDateStr && simulatedDateStr) {
            const bD = new Date(baselineDateStr);
            const sD = new Date(simulatedDateStr);
            monthsSaved = Math.max(0, Math.round((bD.getTime() - sD.getTime()) / (30 * 24 * 60 * 60 * 1000)));
          }

          const explanation = monthsSaved > 0
            ? `Earning ${fmtInr(incomeChange)} more each month could help you reach your ${g.name} goal about ${monthsSaved} month(s) sooner.`
            : `Earning ${fmtInr(incomeChange)} more each month adds ${fmtInr(annualDiff)} to your income each year.`;

          affectedGoals.push({
            goalId: g.id,
            goalName: g.name,
            baselineRequiredMonthly: g.metrics.requiredMonthlyContribution || 0,
            baselineProjectedDate: baselineDateStr,
            scenarioProjectedDate: simulatedDateStr,
            monthsSaved,
            explanation,
          });
        }
      });

      let baselineDesc = `Your regular monthly income is ${fmtInr(baselineMonthlyIncome)}.`;
      if (!incomeAnalysis.hasConfidentRecurringIncome) {
        baselineDesc = `Your average monthly income is about ${fmtInr(baselineMonthlyIncome)} (based on available history).`;
      } else if (incomeAnalysis.variableMonthlyIncome > 0) {
        baselineDesc += ` (plus ${fmtInr(incomeAnalysis.variableMonthlyIncome)}/month average variable income).`;
      }

      return {
        scenarioType,
        baseline: {
          monthlyValue: baselineMonthlyIncome,
          annualValue: Math.round(baselineMonthlyIncome * 12 * 100) / 100,
          description: baselineDesc,
          variableMonthlyIncome: incomeAnalysis.variableMonthlyIncome > 0 ? incomeAnalysis.variableMonthlyIncome : undefined,
          hasConfidentRecurringIncome: incomeAnalysis.hasConfidentRecurringIncome,
        },
        scenario: {
          monthlyValue: simulatedMonthlyIncome,
          annualValue: Math.round(simulatedMonthlyIncome * 12 * 100) / 100,
          description: `Earning ${fmtInr(incomeChange)} more increases your monthly income to ${fmtInr(simulatedMonthlyIncome)}.`,
        },
        difference: {
          monthlyDifference: incomeChange,
          annualDifference: annualDiff,
          description: `Earning ${fmtInr(incomeChange)} more each month gives you an extra ${fmtInr(annualDiff)} over a year.`,
        },
        affectedGoals,
        explanations: [
          `Earning ${fmtInr(incomeChange)} more each month.`,
        ],
        dataQuality: incomeAnalysis.totalIncome > 0 ? 'HIGH' : 'MEDIUM',
        isHypothetical: true,
      };
    }

    // 4. SCENARIO TYPE D — PAY OFF DEBT FASTER (DEBT_PAYMENT)
    if (scenarioType === 'DEBT_PAYMENT') {
      const extraPayment = Math.max(0, scenarioParameters.additionalMonthlyPayment || 0);

      if (scenarioParameters.accountId) {
        const acc = await prisma.account.findFirst({
          where: { id: scenarioParameters.accountId, userId },
        });
        if (!acc) {
          throw new Error('Referenced debt account not found.');
        }
      }

      const debtAccounts = await prisma.account.findMany({
        where: {
          userId,
          type: { in: [AccountType.CREDIT_CARD, AccountType.LOAN] },
          ...(scenarioParameters.accountId ? { id: scenarioParameters.accountId } : {}),
        },
      });

      const totalDebt = debtAccounts.reduce(
        (sum, a) => sum + Math.abs(parseFloat(a.currentBalance.toString())),
        0
      );

      if (debtAccounts.length === 0 || totalDebt === 0) {
        return {
          scenarioType,
          baseline: { monthlyValue: 0, annualValue: 0, description: 'Zero debt remaining' },
          scenario: { monthlyValue: 0, annualValue: 0, description: 'Zero debt remaining' },
          difference: { monthlyDifference: 0, annualDifference: 0, description: 'No active debt balances' },
          affectedGoals: [],
          explanations: ['You currently have zero active debt accounts.'],
          dataQuality: 'INSUFFICIENT_DATA',
          isHypothetical: true,
        };
      }

      const annualExtra = Math.round(extraPayment * 12 * 100) / 100;

      return {
        scenarioType,
        baseline: {
          monthlyValue: 0,
          annualValue: 0,
          description: `You have ${fmtInr(totalDebt)} remaining across ${debtAccounts.length} debt account(s).`,
        },
        scenario: {
          monthlyValue: extraPayment,
          annualValue: annualExtra,
          description: `Paying an extra ${fmtInr(extraPayment)} each month toward your debt.`,
        },
        difference: {
          monthlyDifference: extraPayment,
          annualDifference: annualExtra,
          description: `Paying an extra ${fmtInr(extraPayment)} each month reduces your debt balance by ${fmtInr(annualExtra)} over a year.`,
        },
        affectedGoals: [],
        explanations: [
          `Paying an extra ${fmtInr(extraPayment)} each month toward your debt.`,
        ],
        dataQuality: 'HIGH',
        isHypothetical: true,
      };
    }

    throw new Error(`Unsupported scenario type: ${scenarioType}`);
  }

  static async analyzeUserIncome(userId: string) {
    const incomeTxs = await prisma.transaction.findMany({
      where: { userId, type: TransactionType.INCOME },
      orderBy: { date: 'asc' },
    });

    if (incomeTxs.length === 0) {
      return {
        regularMonthlyIncome: 0,
        variableMonthlyIncome: 0,
        hasConfidentRecurringIncome: false,
        activeMonthsCount: 0,
        totalIncome: 0,
      };
    }

    const totalIncome = incomeTxs.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

    // Group transactions by calendar month (YYYY-MM)
    const monthKeys = new Set(
      incomeTxs.map((t) => {
        const d = new Date(t.date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      })
    );
    const activeMonthsCount = monthKeys.size;

    // Group income transactions by normalized stream key (merchant or description or category)
    const streamMap = new Map<string, { merchant: string; txs: typeof incomeTxs }>();

    incomeTxs.forEach((tx) => {
      const rawName = (tx.merchant || tx.description || 'General Income').trim().toLowerCase();
      const existing = streamMap.get(rawName) || { merchant: tx.merchant || tx.description || 'General Income', txs: [] };
      existing.txs.push(tx);
      streamMap.set(rawName, existing);
    });

    let regularMonthlyIncome = 0;
    let variableIncomeSum = 0;
    let hasConfidentRecurring = false;

    streamMap.forEach(({ merchant, txs }) => {
      // Collect distinct YYYY-MM months for this stream
      const streamMonths = new Set(
        txs.map((t) => {
          const d = new Date(t.date);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        })
      );

      // Calculate amounts variance across entries
      const amounts = txs.map((t) => parseFloat(t.amount.toString()));
      const avgAmt = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const maxDiffRatio = amounts.length > 0 ? Math.max(...amounts.map((a) => Math.abs(a - avgAmt) / (avgAmt || 1))) : 0;

      // Strict Recurring Criteria:
      // 1. Appears across at least 2 distinct calendar months
      // 2. Transaction amounts have variance <= 20% (similar amounts)
      const isRecurring = streamMonths.size >= 2 && maxDiffRatio <= 0.20;

      if (isRecurring) {
        // Monthly regular value for this stream = average monthly amount across its active months
        const streamMonthlyValue = Math.round(amounts.reduce((a, b) => a + b, 0) / streamMonths.size);
        regularMonthlyIncome += streamMonthlyValue;
        hasConfidentRecurring = true;
      } else {
        // Classified as Variable Income
        variableIncomeSum += amounts.reduce((a, b) => a + b, 0);
      }
    });

    // Calculate monthly average for variable income across total active income months
    const variableMonthlyIncome = activeMonthsCount > 0 ? Math.round(variableIncomeSum / activeMonthsCount) : 0;

    // Fallback: If no single stream met the multi-month pattern (e.g. user has 1 month of history or un-repeated entries)
    if (!hasConfidentRecurring) {
      const fallbackBaseline = Math.round(totalIncome / Math.max(1, activeMonthsCount));
      return {
        regularMonthlyIncome: fallbackBaseline,
        variableMonthlyIncome: 0,
        hasConfidentRecurringIncome: false,
        activeMonthsCount,
        totalIncome,
      };
    }

    return {
      regularMonthlyIncome,
      variableMonthlyIncome,
      hasConfidentRecurringIncome: true,
      activeMonthsCount,
      totalIncome,
    };
  }
}
