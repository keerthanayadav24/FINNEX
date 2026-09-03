package com.finnex.service;

import com.finnex.model.Budget;
import com.finnex.model.Transaction;
import com.finnex.model.TransactionType;

import java.math.BigDecimal;
import java.util.List;

/**
 * Service for updating and evaluating category budget performance.
 */
public class BudgetAnalyzer {

    public void updateBudgetsFromTransactions(List<Budget> budgets, List<Transaction> transactions) {
        for (Budget budget : budgets) {
            BigDecimal spent = BigDecimal.ZERO;
            for (Transaction tx : transactions) {
                if (tx.getType() == TransactionType.EXPENSE && budget.getCategory().equalsIgnoreCase(tx.getCategory())) {
                    spent = spent.add(tx.getAmount());
                }
            }
            budget.setSpentAmount(spent);
        }
    }

    public void printBudgetReport(List<Budget> budgets) {
        System.out.println("\n📊 BUDGET PERFORMANCE REPORT");
        System.out.println("----------------------------------------------------------------------");
        System.out.printf("%-18s | %-12s | %-12s | %-10s | %-10s%n", "Category", "Budget", "Spent", "Used %", "Status");
        System.out.println("----------------------------------------------------------------------");

        for (Budget b : budgets) {
            String status = "OK";
            if (b.isOverBudget()) {
                status = "EXCEEDED ⚠️";
            } else if (b.isNearLimit()) {
                status = "WARNING ⚠️";
            }

            System.out.printf("%-18s | ₹%-11s | ₹%-11s | %-9.1f%% | %-10s%n",
                    b.getCategory(),
                    b.getBudgetAmount().toPlainString(),
                    b.getSpentAmount().toPlainString(),
                    b.getUsagePercentage(),
                    status);
        }
        System.out.println("----------------------------------------------------------------------");
    }
}
