package com.finnex.analysis;

import com.finnex.model.Transaction;
import com.finnex.model.TransactionType;

import java.math.BigDecimal;
import java.util.*;

/**
 * Service providing spending analysis and category aggregation algorithms.
 * Demonstrates DSA concepts: HashMap, ArrayList, and Collections sorting.
 */
public class SpendingAnalyzer {

    public BigDecimal calculateTotalIncome(List<Transaction> transactions) {
        BigDecimal total = BigDecimal.ZERO;
        for (Transaction tx : transactions) {
            if (tx.getType() == TransactionType.INCOME) {
                total = total.add(tx.getAmount());
            }
        }
        return total;
    }

    public BigDecimal calculateTotalExpenses(List<Transaction> transactions) {
        BigDecimal total = BigDecimal.ZERO;
        for (Transaction tx : transactions) {
            if (tx.getType() == TransactionType.EXPENSE) {
                total = total.add(tx.getAmount());
            }
        }
        return total;
    }

    public BigDecimal calculateNetCashFlow(List<Transaction> transactions) {
        BigDecimal income = calculateTotalIncome(transactions);
        BigDecimal expenses = calculateTotalExpenses(transactions);
        return income.subtract(expenses);
    }

    /**
     * Groups expenses by category using HashMap.
     * DSA: HashMap lookup and aggregation.
     */
    public Map<String, BigDecimal> getSpendingByCategory(List<Transaction> transactions) {
        Map<String, BigDecimal> categoryMap = new HashMap<>();

        for (Transaction tx : transactions) {
            if (tx.getType() == TransactionType.EXPENSE) {
                String cat = tx.getCategory();
                BigDecimal current = categoryMap.getOrDefault(cat, BigDecimal.ZERO);
                categoryMap.put(cat, current.add(tx.getAmount()));
            }
        }
        return categoryMap;
    }

    /**
     * Ranks categories by spending in descending order.
     * DSA: Map Entry sorting with Comparator.
     */
    public List<Map.Entry<String, BigDecimal>> getTopSpendingCategories(List<Transaction> transactions) {
        Map<String, BigDecimal> categoryMap = getSpendingByCategory(transactions);
        List<Map.Entry<String, BigDecimal>> list = new ArrayList<>(categoryMap.entrySet());

        // Sort descending by value
        list.sort((e1, e2) -> e2.getValue().compareTo(e1.getValue()));
        return list;
    }
}
