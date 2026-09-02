import { TransactionType } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { RecommendationEngine } from './action/recommendationEngine.js';
import { GoalService } from './goalService.js';
import { BillReminder } from './action/actionTypes.js';

export type TimelineEventType =
  | 'EXPECTED_INCOME'
  | 'EXPECTED_BILL'
  | 'GOAL_MILESTONE'
  | 'RECURRING_CHARGE'
  | 'BUDGET_REVIEW';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  date: string;
  title: string;
  description: string;
  amount?: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  source: string;
  isGuaranteed: false;
}

export class FinancialTimelineService {
  /**
   * Evaluates whether a recurring bill reminder represents a fixed commitment
   * (Rent, Utilities, EMI, Insurance, Subscriptions) vs variable discretionary spending
   * (Swiggy, Zomato, Uber, Amazon shopping).
   */
  private static isFixedCommitment(bill: BillReminder): boolean {
    const m = bill.merchant.toLowerCase().trim();

    // 1. Explicit Discretionary Spending Merchants -> EXCLUDE from Timeline
    const discretionaryKeywords = [
      'swiggy', 'zomato', 'uber', 'ola', 'rapido', 'amazon', 'flipkart', 'myntra',
      'blinkit', 'zepto', 'instamart', 'bigbasket', 'dmart', 'restaurant', 'cafe',
      'food', 'dining', 'cab', 'taxi', 'apparel', 'clothing'
    ];

    if (discretionaryKeywords.some((kw) => m.includes(kw))) {
      return false;
    }

    // 2. Fixed Commitments & Scheduled Utilities / Subscriptions Keywords -> INCLUDE
    const fixedKeywords = [
      'rent', 'landlord', 'housing', 'apartment', 'flat',
      'bescom', 'electricity', 'electric', 'power', 'water', 'gas', 'utility', 'utilities',
      'broadband', 'wifi', 'internet', 'dth', 'tata play', 'fiber', 'airtel', 'jio',
      'emi', 'loan', 'mortgage', 'insurance', 'premium', 'lic', 'credit card',
      'netflix', 'spotify', 'prime', 'apple', 'youtube', 'gym', 'fitness', 'society', 'maintenance'
    ];

    if (fixedKeywords.some((kw) => m.includes(kw))) {
      return true;
    }

    // 3. Conservative Default: If uncertain, DO NOT put on Timeline!
    return false;
  }

  static async getTimeline(userId: string): Promise<TimelineEvent[]> {
    const now = new Date();
    const events: TimelineEvent[] = [];

    const fmtInr = (v: number) => `₹${Math.round(Math.abs(v)).toLocaleString('en-IN')}`;

    // 1. Fetch Stage 4 Action Engine Bill Reminders & Filter for Fixed Commitments
    const actions = await RecommendationEngine.getActions(userId);

    actions.billReminders.forEach((bill) => {
      // Conservative timeline eligibility: ONLY include fixed obligations and genuine subscriptions
      if (!FinancialTimelineService.isFixedCommitment(bill)) {
        return;
      }

      const targetDate = new Date(now.getFullYear(), now.getMonth(), bill.expectedDayOfMonth);
      if (targetDate < now) {
        targetDate.setMonth(targetDate.getMonth() + 1);
      }

      const m = bill.merchant.toLowerCase();
      let cleanMerchant = bill.merchant;
      let description = `Your ${bill.merchant} payment is usually due around the ${bill.expectedDayOfMonth}th.`;

      if (m.includes('rent') || m.includes('landlord')) {
        cleanMerchant = 'Rent';
        description = `Your rent payment is usually due around the ${bill.expectedDayOfMonth}th.`;
      } else if (m.includes('bescom') || m.includes('electricity') || m.includes('electric')) {
        cleanMerchant = 'Electricity';
        description = `Your electricity payment is usually due around the ${bill.expectedDayOfMonth}th.`;
      }

      events.push({
        id: `evt_${bill.id}`,
        type: 'EXPECTED_BILL',
        date: targetDate.toISOString(),
        title: `Upcoming payment: ${cleanMerchant}`,
        description,
        amount: bill.expectedAmount,
        confidence: 'MEDIUM',
        source: 'Based on your previous payments.',
        isGuaranteed: false,
      });
    });

    // 2. Detect Expected Recurring Salary Income
    const incomeTxs = await prisma.transaction.findMany({
      where: { userId, type: TransactionType.INCOME },
      orderBy: { date: 'desc' },
    });

    if (incomeTxs.length >= 2) {
      const topIncome = incomeTxs[0];
      const incomeDate = new Date(topIncome.date);
      const nextIncomeDate = new Date(now.getFullYear(), now.getMonth() + 1, Math.min(28, incomeDate.getDate()));

      events.push({
        id: `evt_income_${topIncome.id}`,
        type: 'EXPECTED_INCOME',
        date: nextIncomeDate.toISOString(),
        title: `Salary expected`,
        description: `Your usual salary payment is expected around this date.`,
        amount: parseFloat(topIncome.amount.toString()),
        confidence: 'HIGH',
        source: 'Based on your usual income.',
        isGuaranteed: false,
      });
    }

    // 3. Stage 3 Goal Target & Completion Milestones
    const goals = await GoalService.getGoals(userId);
    goals.forEach((g) => {
      const gNameLower = g.name.toLowerCase();
      let goalTitle = g.name;
      let description = `You're aiming to save ${fmtInr(g.targetAmount)} by this date.`;

      if (gNameLower.includes('laptop') || gNameLower.includes('macbook')) {
        goalTitle = 'Laptop goal';
      } else if (gNameLower.includes('goa') || gNameLower.includes('trip') || gNameLower.includes('vacation')) {
        goalTitle = 'Goa trip goal';
      } else if (gNameLower.includes('emergency')) {
        goalTitle = 'Emergency Fund';
        description = `You're aiming to build your ${fmtInr(g.targetAmount)} emergency fund by this date.`;
      } else if (gNameLower.includes('debt') || gNameLower.includes('loan')) {
        goalTitle = 'Debt-free goal';
        description = `You're aiming to clear ${fmtInr(g.targetAmount)} of debt by this date.`;
      }

      if (g.targetDate) {
        events.push({
          id: `evt_goal_target_${g.id}`,
          type: 'GOAL_MILESTONE',
          date: new Date(g.targetDate).toISOString(),
          title: goalTitle,
          description,
          amount: g.targetAmount,
          confidence: 'HIGH',
          source: 'Based on your goal plan.',
          isGuaranteed: false,
        });
      }
    });

    // Sort events chronologically ascending
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return events;
  }
}
