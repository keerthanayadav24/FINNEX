package com.finnex.model;

import java.math.BigDecimal;

/**
 * Model representing liabilities and debt balances.
 */
public class Debt {
    private String id;
    private String name;
    private BigDecimal balance;
    private double interestRate; // Annual Percentage Rate (e.g. 15.5 for 15.5%)
    private BigDecimal minimumPayment;

    public Debt(String id, String name, BigDecimal balance, double interestRate, BigDecimal minimumPayment) {
        this.id = id;
        this.name = name;
        this.balance = balance;
        this.interestRate = interestRate;
        this.minimumPayment = minimumPayment;
    }

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public BigDecimal getBalance() {
        return balance;
    }

    public double getInterestRate() {
        return interestRate;
    }

    public BigDecimal getMinimumPayment() {
        return minimumPayment;
    }

    @Override
    public String toString() {
        return String.format("Debt[Name=%s, Balance=₹%s, Interest=%.1f%%, MinPayment=₹%s]",
                name, balance.toPlainString(), interestRate, minimumPayment.toPlainString());
    }
}
