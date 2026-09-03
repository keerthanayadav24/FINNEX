package com.finnex;

import com.finnex.analysis.AnomalyAnalyzer;
import com.finnex.analysis.ForecastAnalyzer;
import com.finnex.analysis.SpendingAnalyzer;
import com.finnex.model.*;
import com.finnex.service.BudgetAnalyzer;
import com.finnex.service.DebtAnalyzer;
import com.finnex.service.FinancialHealthAnalyzer;
import com.finnex.service.GoalAnalyzer;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Main application entry point for the FINNEX Java Analytical Demonstration Engine.
 * Demonstrates Object-Oriented Programming (OOP) and Data Structures & Algorithms (DSA).
 */
public class Main {

    public static void main(String[] args) {
        System.out.println("=======================================================================");
        System.out.println("🚀 FINNEX — FINANCIAL INTELLIGENCE & ANALYTICAL DEMONSTRATION ENGINE");
        System.out.println("   Academic OOP & Data Structures Implementation (Core Java)");
        System.out.println("=======================================================================\n");

        // 1. Initialize Sample Accounts (ArrayList)
        List<Account> accounts = new ArrayList<>();
        accounts.add(new Account("acc_1", "HDFC Salary Checking", AccountType.CHECKING, new BigDecimal("35000.00")));
        accounts.add(new Account("acc_2", "ICICI Emergency Savings", AccountType.SAVINGS, new BigDecimal("125000.00")));
        accounts.add(new Account("acc_3", "Zerodha Investment Portfolio", AccountType.INVESTMENT, new BigDecimal("85000.00")));
        accounts.add(new Account("acc_4", "Axis Bank Credit Card", AccountType.CREDIT_CARD, new BigDecimal("-12000.00")));

        // 2. Initialize Sample Transactions (ArrayList)
        List<Transaction> transactions = new ArrayList<>();
        LocalDate now = LocalDate.now();

        // Income
        transactions.add(new Transaction("tx_1", new BigDecimal("60000.00"), TransactionType.INCOME, "Salary", "TechCorp India Salary", now.minusDays(25), "Monthly regular salary credit"));
        transactions.add(new Transaction("tx_2", new BigDecimal("8000.00"), TransactionType.INCOME, "Freelance", "Upwork Payout", now.minusDays(10), "Web design consulting payout"));

        // Expenses
        transactions.add(new Transaction("tx_3", new BigDecimal("18000.00"), TransactionType.EXPENSE, "Housing", "Landlord Rent", now.minusDays(24), "Monthly apartment rent payment"));
        transactions.add(new Transaction("tx_4", new BigDecimal("3500.00"), TransactionType.EXPENSE, "Food & Dining", "Swiggy", now.minusDays(20), "Food delivery & dining out"));
        transactions.add(new Transaction("tx_5", new BigDecimal("2500.00"), TransactionType.EXPENSE, "Food & Dining", "Zomato", now.minusDays(15), "Weekend family dinner order"));
        transactions.add(new Transaction("tx_6", new BigDecimal("3500.00"), TransactionType.EXPENSE, "Transportation", "Uber India / Petrol", now.minusDays(18), "Fuel & daily commuting rides"));
        transactions.add(new Transaction("tx_7", new BigDecimal("5000.00"), TransactionType.EXPENSE, "Shopping", "Amazon India", now.minusDays(12), "Electronics accessories purchase"));
        transactions.add(new Transaction("tx_8", new BigDecimal("3000.00"), TransactionType.EXPENSE, "Utilities", "BESCOM Electricity", now.minusDays(8), "Monthly electricity bill"));
        transactions.add(new Transaction("tx_9", new BigDecimal("2000.00"), TransactionType.EXPENSE, "Entertainment", "BookMyShow / Netflix", now.minusDays(5), "Movie tickets and subscriptions"));
        transactions.add(new Transaction("tx_10", new BigDecimal("2500.00"), TransactionType.EXPENSE, "Healthcare", "Apollo Pharmacy", now.minusDays(3), "Health checkup and vitamins"));

        // Transfers (Ignored in cashflow)
        transactions.add(new Transaction("tx_11", new BigDecimal("10000.00"), TransactionType.TRANSFER, "Transfer", "HDFC -> ICICI", now.minusDays(22), "Monthly automated savings transfer"));

        // 3. Initialize Sample Budgets (ArrayList)
        List<Budget> budgets = new ArrayList<>();
        budgets.add(new Budget("b_1", "Food & Dining", new BigDecimal("7000.00"), BigDecimal.ZERO));
        budgets.add(new Budget("b_2", "Housing", new BigDecimal("18000.00"), BigDecimal.ZERO));
        budgets.add(new Budget("b_3", "Shopping", new BigDecimal("4000.00"), BigDecimal.ZERO));
        budgets.add(new Budget("b_4", "Transportation", new BigDecimal("5000.00"), BigDecimal.ZERO));

        // 4. Initialize Sample Goals (ArrayList)
        List<Goal> goals = new ArrayList<>();
        goals.add(new Goal("g_1", "Emergency Fund", new BigDecimal("300000.00"), new BigDecimal("125000.00"), now.plusMonths(12)));
        goals.add(new Goal("g_2", "Goa Vacation", new BigDecimal("50000.00"), new BigDecimal("35000.00"), now.plusMonths(3)));
        goals.add(new Goal("g_3", "MacBook Pro Upgrade", new BigDecimal("80000.00"), new BigDecimal("45000.00"), now.plusMonths(6)));

        // 5. Initialize Sample Debts (ArrayList)
        List<Debt> debts = new ArrayList<>();
        debts.add(new Debt("d_1", "Credit Card Debt", new BigDecimal("35000.00"), 24.0, new BigDecimal("2000.00")));
        debts.add(new Debt("d_2", "Personal Loan", new BigDecimal("150000.00"), 12.5, new BigDecimal("4500.00")));
        debts.add(new Debt("d_3", "Two-Wheeler Loan", new BigDecimal("20000.00"), 10.0, new BigDecimal("1500.00")));

        // =======================================================================
        // EXECUTE ANALYSES
        // =======================================================================

        SpendingAnalyzer spendingAnalyzer = new SpendingAnalyzer();

        BigDecimal totalIncome = spendingAnalyzer.calculateTotalIncome(transactions);
        BigDecimal totalExpenses = spendingAnalyzer.calculateTotalExpenses(transactions);
        BigDecimal netCashFlow = spendingAnalyzer.calculateNetCashFlow(transactions);

        System.out.println("📊 CASH FLOW OVERVIEW");
        System.out.println("----------------------------------------------------------------------");
        System.out.printf("  Total Monthly Income:   ₹%s%n", totalIncome.toPlainString());
        System.out.printf("  Total Monthly Expenses: ₹%s%n", totalExpenses.toPlainString());
        System.out.printf("  Net Cash Flow:          ₹%s (%s)%n",
                netCashFlow.toPlainString(),
                netCashFlow.compareTo(BigDecimal.ZERO) >= 0 ? "POSITIVE SURPLUS" : "DEFICIT");
        System.out.println("----------------------------------------------------------------------");

        // Category Breakdown
        System.out.println("\n🏷️ SPENDING BY CATEGORY (Ranked)");
        System.out.println("----------------------------------------------------------------------");
        List<Map.Entry<String, BigDecimal>> topCategories = spendingAnalyzer.getTopSpendingCategories(transactions);
        for (Map.Entry<String, BigDecimal> entry : topCategories) {
            System.out.printf("  %-20s : ₹%s%n", entry.getKey(), entry.getValue().toPlainString());
        }
        System.out.println("----------------------------------------------------------------------");

        // Budget Analysis
        BudgetAnalyzer budgetAnalyzer = new BudgetAnalyzer();
        budgetAnalyzer.updateBudgetsFromTransactions(budgets, transactions);
        budgetAnalyzer.printBudgetReport(budgets);

        // Goal Analysis
        GoalAnalyzer goalAnalyzer = new GoalAnalyzer();
        goalAnalyzer.printGoalReport(goals);

        // Forecast Analysis
        ForecastAnalyzer forecastAnalyzer = new ForecastAnalyzer();
        BigDecimal nextMonthForecast = forecastAnalyzer.forecastNextMonthExpenses(transactions, 1);
        System.out.println("\n🔮 EXPENSE FORECAST");
        System.out.println("----------------------------------------------------------------------");
        System.out.printf("  Projected Next Month Expenditure: ₹%s%n", nextMonthForecast.toPlainString());
        System.out.println("----------------------------------------------------------------------");

        // Anomaly Analysis
        AnomalyAnalyzer anomalyAnalyzer = new AnomalyAnalyzer();
        List<Transaction> anomalies = anomalyAnalyzer.findUnusualExpenses(transactions, new BigDecimal("10000.00"));
        System.out.println("\n⚠️ ANOMALY DETECTION (Unusually Large Expenses)");
        System.out.println("----------------------------------------------------------------------");
        if (anomalies.isEmpty()) {
            System.out.println("  No unusual expense anomalies detected.");
        } else {
            for (Transaction a : anomalies) {
                System.out.printf("  • %-18s | ₹%-10s | %s (%s)%n",
                        a.getCategory(), a.getAmount().toPlainString(), a.getMerchant(), a.getDescription());
            }
        }
        System.out.println("----------------------------------------------------------------------");

        // Financial Health Score
        FinancialHealthAnalyzer healthAnalyzer = new FinancialHealthAnalyzer();
        int healthScore = healthAnalyzer.calculateHealthScore(transactions, accounts, debts);
        String category = healthAnalyzer.getHealthCategory(healthScore);
        System.out.println("\n💚 FINANCIAL HEALTH SCORE");
        System.out.println("----------------------------------------------------------------------");
        System.out.printf("  Overall FINNEX Score: %d / 100%n", healthScore);
        System.out.printf("  Evaluation:          %s%n", category);
        System.out.println("----------------------------------------------------------------------");

        // Debt Prioritization Analysis
        DebtAnalyzer debtAnalyzer = new DebtAnalyzer();
        debtAnalyzer.printDebtStrategyReport(debts);

        System.out.println("\n✅ FINNEX Java Demonstration Analysis Completed Successfully.\n");
    }
}
