package com.finnex.service;

import com.finnex.model.Debt;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Service demonstrating debt repayment prioritization algorithms (Snowball vs Avalanche).
 * Demonstrates DSA Concepts: Comparator sorting algorithms on List collections.
 */
public class DebtAnalyzer {

    /**
     * Debt Snowball Strategy: Prioritizes lowest balance first for psychological momentum.
     * DSA: Ascending sort on balance property.
     */
    public List<Debt> getSnowballPrioritization(List<Debt> debts) {
        List<Debt> sorted = new ArrayList<>(debts);
        sorted.sort(Comparator.comparing(Debt::getBalance));
        return sorted;
    }

    /**
     * Debt Avalanche Strategy: Prioritizes highest interest rate first to minimize total interest paid.
     * DSA: Descending sort on interestRate property.
     */
    public List<Debt> getAvalanchePrioritization(List<Debt> debts) {
        List<Debt> sorted = new ArrayList<>(debts);
        sorted.sort((d1, d2) -> Double.compare(d2.getInterestRate(), d1.getInterestRate()));
        return sorted;
    }

    public void printDebtStrategyReport(List<Debt> debts) {
        System.out.println("\n💳 DEBT REPAYMENT PRIORITIZATION ANALYSIS");
        System.out.println("----------------------------------------------------------------------");

        System.out.println("🔹 Strategy 1: Debt Snowball (Lowest Balance First)");
        List<Debt> snowball = getSnowballPrioritization(debts);
        int rank = 1;
        for (Debt d : snowball) {
            System.out.printf("  %d. %-18s - Balance: ₹%-10s (Interest: %.1f%%)%n",
                    rank++, d.getName(), d.getBalance().toPlainString(), d.getInterestRate());
        }

        System.out.println("\n🔹 Strategy 2: Debt Avalanche (Highest Interest First - Mathematically Optimal)");
        List<Debt> avalanche = getAvalanchePrioritization(debts);
        rank = 1;
        for (Debt d : avalanche) {
            System.out.printf("  %d. %-18s - Interest: %.1f%% (Balance: ₹%-10s)%n",
                    rank++, d.getName(), d.getInterestRate(), d.getBalance().toPlainString());
        }
        System.out.println("----------------------------------------------------------------------");
    }
}
