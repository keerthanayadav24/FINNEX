import { prisma } from '../config/prisma.js';
import {
  calculateProgress,
  calculateRemaining,
  calculateRequiredMonthlyContribution,
  calculateAverageMonthlyContribution,
  calculateGoalStatus,
  calculateProjectedCompletionDate,
  generatePlanningExplanation,
  GoalPlanningMetrics,
} from './goalPlanningUtils.js';

export class GoalService {
  static async getGoals(userId: string) {
    const goals = await prisma.goal.findMany({
      where: { userId },
      include: {
        contributions: {
          orderBy: { date: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();

    return goals.map((goal) => {
      const currentAmt = parseFloat(goal.currentAmount.toString());
      const targetAmt = parseFloat(goal.targetAmount.toString());
      const targetDate = goal.targetDate ? new Date(goal.targetDate) : null;

      const progress = calculateProgress(currentAmt, targetAmt);
      const remainingAmount = calculateRemaining(currentAmt, targetAmt);
      const requiredMonthly = calculateRequiredMonthlyContribution(currentAmt, targetAmt, targetDate, now);
      const { average: averageMonthly, hasSufficientHistory } = calculateAverageMonthlyContribution(goal.contributions, now);
      const status = calculateGoalStatus(currentAmt, targetAmt, targetDate, requiredMonthly, averageMonthly, hasSufficientHistory, now);
      const projectedCompletionDate = calculateProjectedCompletionDate(remainingAmount, averageMonthly, now);

      const explanation = generatePlanningExplanation({
        status,
        targetAmount: targetAmt,
        currentAmount: currentAmt,
        remainingAmount,
        requiredMonthlyContribution: requiredMonthly,
        averageMonthlyContribution: averageMonthly,
        projectedCompletionDate,
        isOverachieved: progress.isOverachieved,
        overachievedAmount: progress.overachievedAmount,
      });

      return {
        id: goal.id,
        userId: goal.userId,
        name: goal.name,
        type: goal.type || 'CUSTOM',
        targetAmount: targetAmt,
        currentAmount: currentAmt,
        targetDate: goal.targetDate ? goal.targetDate.toISOString() : null,
        createdAt: goal.createdAt.toISOString(),
        updatedAt: goal.updatedAt.toISOString(),

        metrics: {
          remainingAmount,
          progressPercentage: progress.progressPercentage,
          displayPercentage: progress.displayPercentage,
          isOverachieved: progress.isOverachieved,
          overachievedAmount: progress.overachievedAmount,
          requiredMonthlyContribution: requiredMonthly,
          averageMonthlyContribution: averageMonthly,
          hasSufficientHistory,
          status,
          projectedCompletionDate,
          explanation,
        },
        contributionCount: goal.contributions.length,
      };
    });
  }

  static async getGoalById(userId: string, goalId: string) {
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId },
      include: {
        contributions: {
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!goal) return null;

    const now = new Date();
    const currentAmt = parseFloat(goal.currentAmount.toString());
    const targetAmt = parseFloat(goal.targetAmount.toString());
    const targetDate = goal.targetDate ? new Date(goal.targetDate) : null;

    const progress = calculateProgress(currentAmt, targetAmt);
    const remainingAmount = calculateRemaining(currentAmt, targetAmt);
    const requiredMonthly = calculateRequiredMonthlyContribution(currentAmt, targetAmt, targetDate, now);
    const { average: averageMonthly, hasSufficientHistory } = calculateAverageMonthlyContribution(goal.contributions, now);
    const status = calculateGoalStatus(currentAmt, targetAmt, targetDate, requiredMonthly, averageMonthly, hasSufficientHistory, now);
    const projectedCompletionDate = calculateProjectedCompletionDate(remainingAmount, averageMonthly, now);

    const explanation = generatePlanningExplanation({
      status,
      targetAmount: targetAmt,
      currentAmount: currentAmt,
      remainingAmount,
      requiredMonthlyContribution: requiredMonthly,
      averageMonthlyContribution: averageMonthly,
      projectedCompletionDate,
      isOverachieved: progress.isOverachieved,
      overachievedAmount: progress.overachievedAmount,
    });

    return {
      id: goal.id,
      userId: goal.userId,
      name: goal.name,
      type: goal.type || 'CUSTOM',
      targetAmount: targetAmt,
      currentAmount: currentAmt,
      targetDate: goal.targetDate ? goal.targetDate.toISOString() : null,
      createdAt: goal.createdAt.toISOString(),
      updatedAt: goal.updatedAt.toISOString(),

      metrics: {
        remainingAmount,
        progressPercentage: progress.progressPercentage,
        displayPercentage: progress.displayPercentage,
        isOverachieved: progress.isOverachieved,
        overachievedAmount: progress.overachievedAmount,
        requiredMonthlyContribution: requiredMonthly,
        averageMonthlyContribution: averageMonthly,
        hasSufficientHistory,
        status,
        projectedCompletionDate,
        explanation,
      },
      contributions: goal.contributions.map((c) => ({
        id: c.id,
        goalId: c.goalId,
        amount: parseFloat(c.amount.toString()),
        date: c.date.toISOString(),
        note: c.note,
        isInitial: c.isInitial,
        createdAt: c.createdAt.toISOString(),
      })),
    };
  }

  static async createGoal(
    userId: string,
    data: {
      name: string;
      targetAmount: number;
      currentAmount?: number;
      initialSavedAmount?: number;
      targetDate?: string | null;
      type?: string;
    }
  ) {
    if (!data.name || !data.name.trim()) {
      throw new Error('Goal name is required.');
    }
    if (typeof data.targetAmount !== 'number' || data.targetAmount <= 0) {
      throw new Error('Target amount must be a positive number greater than zero.');
    }

    const rawInitial = data.currentAmount !== undefined ? data.currentAmount : data.initialSavedAmount;
    const initialSaved = typeof rawInitial === 'number' && rawInitial > 0 ? rawInitial : 0;
    const targetDateObj = data.targetDate ? new Date(data.targetDate) : null;

    if (targetDateObj && isNaN(targetDateObj.getTime())) {
      throw new Error('Invalid target date provided.');
    }

    // Execute inside atomic transaction to ensure Goal.currentAmount == SUM(contributions)
    return await prisma.$transaction(async (tx) => {
      const newGoal = await tx.goal.create({
        data: {
          userId,
          name: data.name.trim(),
          type: data.type || 'CUSTOM',
          targetAmount: data.targetAmount,
          currentAmount: initialSaved,
          targetDate: targetDateObj,
        },
      });

      // If opening saved balance provided, record opening GoalContribution
      if (initialSaved > 0) {
        await tx.goalContribution.create({
          data: {
            goalId: newGoal.id,
            amount: initialSaved,
            date: new Date(),
            note: 'Initial saved balance',
            isInitial: true,
          },
        });
      }

      return newGoal;
    });
  }

  static async updateGoal(
    userId: string,
    goalId: string,
    data: {
      name?: string;
      targetAmount?: number;
      targetDate?: string | null;
      type?: string;
    }
  ) {
    const existing = await prisma.goal.findFirst({ where: { id: goalId, userId } });
    if (!existing) {
      throw new Error('Goal not found or access denied.');
    }

    if (data.targetAmount !== undefined && (typeof data.targetAmount !== 'number' || data.targetAmount <= 0)) {
      throw new Error('Target amount must be a positive number greater than zero.');
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.type !== undefined) updateData.type = data.type;
    if (data.targetAmount !== undefined) updateData.targetAmount = data.targetAmount;
    if (data.targetDate !== undefined) {
      updateData.targetDate = data.targetDate ? new Date(data.targetDate) : null;
    }

    return await prisma.goal.update({
      where: { id: goalId },
      data: updateData,
    });
  }

  static async deleteGoal(userId: string, goalId: string) {
    const existing = await prisma.goal.findFirst({ where: { id: goalId, userId } });
    if (!existing) {
      throw new Error('Goal not found or access denied.');
    }

    await prisma.goal.delete({ where: { id: goalId } });
    return { success: true };
  }

  static async addContribution(
    userId: string,
    goalId: string,
    data: { amount: number; note?: string; date?: string }
  ) {
    const goal = await prisma.goal.findFirst({ where: { id: goalId, userId } });
    if (!goal) {
      throw new Error('Goal not found or access denied.');
    }

    if (typeof data.amount !== 'number' || data.amount <= 0) {
      throw new Error('Contribution amount must be greater than zero.');
    }

    const contribDate = data.date ? new Date(data.date) : new Date();

    return await prisma.$transaction(async (tx) => {
      // 1. Create contribution
      const contrib = await tx.goalContribution.create({
        data: {
          goalId,
          amount: data.amount,
          note: data.note ? data.note.trim() : null,
          date: contribDate,
          isInitial: false,
        },
      });

      // 2. Compute exact sum of all contributions
      const agg = await tx.goalContribution.aggregate({
        where: { goalId },
        _sum: { amount: true },
      });

      const totalAmount = agg._sum.amount ? parseFloat(agg._sum.amount.toString()) : 0;

      // 3. Atomically sync Goal.currentAmount
      await tx.goal.update({
        where: { id: goalId },
        data: { currentAmount: totalAmount },
      });

      return contrib;
    });
  }

  static async updateContribution(
    userId: string,
    goalId: string,
    contributionId: string,
    data: { amount?: number; note?: string; date?: string }
  ) {
    const goal = await prisma.goal.findFirst({ where: { id: goalId, userId } });
    if (!goal) {
      throw new Error('Goal not found or access denied.');
    }

    const existingContrib = await prisma.goalContribution.findFirst({
      where: { id: contributionId, goalId },
    });
    if (!existingContrib) {
      throw new Error('Contribution not found or access denied.');
    }

    if (data.amount !== undefined && (typeof data.amount !== 'number' || data.amount <= 0)) {
      throw new Error('Contribution amount must be greater than zero.');
    }

    const updateData: any = {};
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.note !== undefined) updateData.note = data.note ? data.note.trim() : null;
    if (data.date !== undefined) updateData.date = new Date(data.date);

    return await prisma.$transaction(async (tx) => {
      // 1. Update contribution
      const updated = await tx.goalContribution.update({
        where: { id: contributionId },
        data: updateData,
      });

      // 2. Compute exact sum of all contributions
      const agg = await tx.goalContribution.aggregate({
        where: { goalId },
        _sum: { amount: true },
      });

      const totalAmount = agg._sum.amount ? parseFloat(agg._sum.amount.toString()) : 0;

      // 3. Atomically sync Goal.currentAmount
      await tx.goal.update({
        where: { id: goalId },
        data: { currentAmount: totalAmount },
      });

      return updated;
    });
  }

  static async deleteContribution(userId: string, goalId: string, contributionId: string) {
    const goal = await prisma.goal.findFirst({ where: { id: goalId, userId } });
    if (!goal) {
      throw new Error('Goal not found or access denied.');
    }

    const existingContrib = await prisma.goalContribution.findFirst({
      where: { id: contributionId, goalId },
    });
    if (!existingContrib) {
      throw new Error('Contribution not found or access denied.');
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Delete contribution
      await tx.goalContribution.delete({
        where: { id: contributionId },
      });

      // 2. Compute exact sum of remaining contributions
      const agg = await tx.goalContribution.aggregate({
        where: { goalId },
        _sum: { amount: true },
      });

      const totalAmount = agg._sum.amount ? parseFloat(agg._sum.amount.toString()) : 0;

      // 3. Atomically sync Goal.currentAmount
      await tx.goal.update({
        where: { id: goalId },
        data: { currentAmount: totalAmount },
      });

      return { success: true };
    });
  }
}
