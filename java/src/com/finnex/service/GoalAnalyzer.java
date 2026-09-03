package com.finnex.service;

import com.finnex.model.Goal;

import java.util.List;

/**
 * Service for analyzing goal progress percentages and remaining targets.
 */
public class GoalAnalyzer {

    public void printGoalReport(List<Goal> goals) {
        System.out.println("\n🎯 GOAL PROGRESS REPORT");
        System.out.println("----------------------------------------------------------------------");
        System.out.printf("%-20s | %-12s | %-12s | %-10s | %-10s%n", "Goal Name", "Target", "Current", "Progress", "Target Date");
        System.out.println("----------------------------------------------------------------------");

        for (Goal g : goals) {
            System.out.printf("%-20s | ₹%-11s | ₹%-11s | %-9.1f%% | %-10s%n",
                    g.getName(),
                    g.getTargetAmount().toPlainString(),
                    g.getCurrentAmount().toPlainString(),
                    g.getProgressPercentage(),
                    g.getTargetDate().toString());
        }
        System.out.println("----------------------------------------------------------------------");
    }
}
