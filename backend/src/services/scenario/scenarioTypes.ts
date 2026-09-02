export type ScenarioType =
  | 'SPENDING_REDUCTION'
  | 'ADDITIONAL_GOAL_CONTRIBUTION'
  | 'INCOME_CHANGE'
  | 'DEBT_PAYMENT';

export interface SimulateScenarioInput {
  scenarioType: ScenarioType;
  scenarioParameters: {
    categoryId?: string;
    monthlyReduction?: number;
    goalId?: string;
    additionalMonthlyContribution?: number;
    monthlyIncomeChange?: number;
    accountId?: string;
    additionalMonthlyPayment?: number;
  };
}

export interface ScenarioAffectedGoal {
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
}

export interface ScenarioSimulationResult {
  scenarioType: ScenarioType;
  baseline: {
    monthlyValue: number;
    annualValue: number;
    description: string;
    variableMonthlyIncome?: number;
    hasConfidentRecurringIncome?: boolean;
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
  affectedGoals: ScenarioAffectedGoal[];
  explanations: string[];
  dataQuality: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA';
  isHypothetical: true;
}
