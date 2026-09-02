import { apiFetch } from './api';

export interface HealthComponentEvidence {
  label: string;
  value: string;
}

export interface HealthComponent {
  name: string;
  score: number;
  weight: number;
  weightedScore: number;
  explanation: string;
  evidence: HealthComponentEvidence[];
}

export interface FinancialHealthData {
  overallScore: number;
  healthLevel: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'NEEDS_ATTENTION' | 'CRITICAL';
  components: HealthComponent[];
  generatedAt: string;
}

export interface RunwayData {
  liquidAssets: number;
  averageMonthlyExpense: number;
  estimatedRunwayMonths: number | null;
  dataQuality: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA';
  explanation: string;
}

export interface ScenarioSimulationResult {
  scenarioType: string;
  baseline: {
    monthlyValue: number;
    annualValue: number;
    description: string;
  };
  scenario: {
    monthlyValue: number;
    annualValue: number;
    description: string;
  };
  difference: {
    monthlyDifference: number;
    annualDifference: number;
    description: string;
  };
  affectedGoals: {
    goalId: string;
    goalName: string;
    baselineRequiredMonthly: number;
    baselineProjectedDate: string | null;
    scenarioProjectedDate: string | null;
    monthsSaved: number;
    explanation: string;
    targetAmount?: number;
    currentAmount?: number;
    remainingAmount?: number;
    monthsToReach?: number | null;
  }[];
  explanations: string[];
  dataQuality: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA';
  isHypothetical: boolean;
}

export interface TimelineEvent {
  id: string;
  type: 'EXPECTED_INCOME' | 'EXPECTED_BILL' | 'GOAL_MILESTONE' | 'RECURRING_CHARGE' | 'BUDGET_REVIEW';
  date: string;
  title: string;
  description: string;
  amount?: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  source: string;
  isGuaranteed: boolean;
}

export const financialHealthService = {
  getHealth: () => apiFetch<FinancialHealthData>('/financial-health'),

  getRunway: () => apiFetch<RunwayData>('/financial-health/runway'),

  simulateScenario: (input: {
    scenarioType: string;
    scenarioParameters: any;
  }) =>
    apiFetch<ScenarioSimulationResult>('/scenarios/simulate', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  getTimeline: () => apiFetch<TimelineEvent[]>('/financial-timeline'),
};
