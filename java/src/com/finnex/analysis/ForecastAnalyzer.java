package com.finnex.analysis;

import com.finnex.model.Transaction;
import com.finnex.model.TransactionType;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * Predicts future monthly expenditure based on historic transaction trends.
 */
public class ForecastAnalyzer {

    /**
     * Forecasts next month's total spending using weighted average of historic data.
     */
    public BigDecimal forecastNextMonthExpenses(List<Transaction> transactions, int historicMonthsCount) {
        SpendingAnalyzer spendingAnalyzer = new SpendingAnalyzer();
        BigDecimal totalExpenses = spendingAnalyzer.calculateTotalExpenses(transactions);

        if (historicMonthsCount <= 0) {
            historicMonthsCount = 1;
        }

        // Simple moving average calculation
        return totalExpenses.divide(new BigDecimal(historicMonthsCount), 2, RoundingMode.HALF_UP);
    }
}
