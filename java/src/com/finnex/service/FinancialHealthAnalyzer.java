package com.finnex.service;

import com.finnex.analysis.SpendingAnalyzer;
import com.finnex.model.Account;
import com.finnex.model.Debt;
import com.finnex.model.Transaction;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * Evaluates user's financial health score (0 - 100) based on savings rate, liquidity, and debt.
 */
public class FinancialHealthAnalyzer {

    public int calculateHealthScore(List<Transaction> transactions, List<Account> accounts, List<Debt> debts) {
        SpendingAnalyzer analyzer = new SpendingAnalyzer();
        BigDecimal income = analyzer.calculateTotalIncome(transactions);
        BigDecimal expenses = analyzer.calculateTotalExpenses(transactions);

        int score = 50; // Base score

        // 1. Savings Ratio Factor (+/- 25 points)
        if (income.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal net = income.subtract(expenses);
            double savingsRate = net.divide(income, 4, RoundingMode.HALF_UP).doubleValue();

            if (savingsRate >= 0.30) {
                score += 25; // Saved 30%+
            } else if (savingsRate >= 0.15) {
                score += 15;
            } else if (savingsRate < 0) {
                score -= 20; // Over-spending
            }
        }

        // 2. Liquidity Factor (+15 points if liquid balance > 2x monthly expenses)
        BigDecimal totalLiquidBalance = BigDecimal.ZERO;
        for (Account acc : accounts) {
            totalLiquidBalance = totalLiquidBalance.add(acc.getCurrentBalance());
        }

        if (expenses.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal ratio = totalLiquidBalance.divide(expenses, 2, RoundingMode.HALF_UP);
            if (ratio.compareTo(new BigDecimal("2.0")) >= 0) {
                score += 15;
            }
        }

        // 3. Debt Burden Factor (-15 points if debt balance > 3x monthly income)
        BigDecimal totalDebt = BigDecimal.ZERO;
        for (Debt d : debts) {
            totalDebt = totalDebt.add(d.getBalance());
        }

        if (income.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal debtRatio = totalDebt.divide(income, 2, RoundingMode.HALF_UP);
            if (debtRatio.compareTo(new BigDecimal("3.0")) > 0) {
                score -= 15;
            }
        }

        // Clamp score between 0 and 100
        return Math.max(0, Math.min(100, score));
    }

    public String getHealthCategory(int score) {
        if (score >= 80) return "EXCELLENT (Strong financial foundation)";
        if (score >= 65) return "GOOD (Healthy savings and managed debt)";
        if (score >= 50) return "MODERATE (Fair cash flow, room for optimization)";
        return "NEEDS ATTENTION (High expenses relative to income)";
    }
}
