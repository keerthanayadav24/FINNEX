package com.finnex.analysis;

import com.finnex.model.Transaction;
import com.finnex.model.TransactionType;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

/**
 * Rule-based anomaly detection to flag unusually large transactions.
 */
public class AnomalyAnalyzer {

    /**
     * Flags transactions whose expense amount exceeds threshold (e.g. ₹10,000 or 2x average expense).
     */
    public List<Transaction> findUnusualExpenses(List<Transaction> transactions, BigDecimal staticThreshold) {
        List<Transaction> anomalies = new ArrayList<>();
        List<Transaction> expenses = new ArrayList<>();

        for (Transaction tx : transactions) {
            if (tx.getType() == TransactionType.EXPENSE) {
                expenses.add(tx);
            }
        }

        if (expenses.isEmpty()) {
            return anomalies;
        }

        BigDecimal total = BigDecimal.ZERO;
        for (Transaction tx : expenses) {
            total = total.add(tx.getAmount());
        }

        BigDecimal averageExpense = total.divide(new BigDecimal(expenses.size()), 2, RoundingMode.HALF_UP);
        BigDecimal dynamicThreshold = averageExpense.multiply(new BigDecimal("2.5")); // 2.5x average

        for (Transaction tx : expenses) {
            if (tx.getAmount().compareTo(staticThreshold) >= 0 || tx.getAmount().compareTo(dynamicThreshold) >= 0) {
                anomalies.add(tx);
            }
        }

        return anomalies;
    }
}
