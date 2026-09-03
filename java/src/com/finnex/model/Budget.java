package com.finnex.model;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Model representing category budget allocations and pacing.
 */
public class Budget {
    private String id;
    private String category;
    private BigDecimal budgetAmount;
    private BigDecimal spentAmount;

    public Budget(String id, String category, BigDecimal budgetAmount, BigDecimal spentAmount) {
        this.id = id;
        this.category = category;
        this.budgetAmount = budgetAmount;
        this.spentAmount = spentAmount;
    }

    public String getId() {
        return id;
    }

    public String getCategory() {
        return category;
    }

    public BigDecimal getBudgetAmount() {
        return budgetAmount;
    }

    public BigDecimal getSpentAmount() {
        return spentAmount;
    }

    public void setSpentAmount(BigDecimal spentAmount) {
        this.spentAmount = spentAmount;
    }

    public BigDecimal getRemainingAmount() {
        return budgetAmount.subtract(spentAmount);
    }

    public double getUsagePercentage() {
        if (budgetAmount.compareTo(BigDecimal.ZERO) == 0) {
            return 0.0;
        }
        return spentAmount
                .divide(budgetAmount, 4, RoundingMode.HALF_UP)
                .multiply(new BigDecimal("100"))
                .doubleValue();
    }

    public boolean isOverBudget() {
        return spentAmount.compareTo(budgetAmount) > 0;
    }

    public boolean isNearLimit() {
        return !isOverBudget() && getUsagePercentage() >= 80.0;
    }
}
