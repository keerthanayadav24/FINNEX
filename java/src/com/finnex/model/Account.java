package com.finnex.model;

import java.math.BigDecimal;

/**
 * Model representing a user's financial account.
 */
public class Account {
    private String id;
    private String name;
    private AccountType type;
    private BigDecimal currentBalance;

    public Account(String id, String name, AccountType type, BigDecimal currentBalance) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.currentBalance = currentBalance;
    }

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public AccountType getType() {
        return type;
    }

    public BigDecimal getCurrentBalance() {
        return currentBalance;
    }

    public void deposit(BigDecimal amount) {
        if (amount != null && amount.compareTo(BigDecimal.ZERO) > 0) {
            this.currentBalance = this.currentBalance.add(amount);
        }
    }

    public void withdraw(BigDecimal amount) {
        if (amount != null && amount.compareTo(BigDecimal.ZERO) > 0) {
            this.currentBalance = this.currentBalance.subtract(amount);
        }
    }

    @Override
    public String toString() {
        return String.format("Account[Name=%s, Type=%s, Balance=₹%s]", name, type, currentBalance.toPlainString());
    }
}
