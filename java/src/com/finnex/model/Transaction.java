package com.finnex.model;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Model representing an individual financial transaction.
 * Demonstrates Object-Oriented Encapsulation.
 */
public class Transaction {
    private String id;
    private BigDecimal amount;
    private TransactionType type;
    private String category;
    private String merchant;
    private LocalDate date;
    private String description;

    public Transaction(String id, BigDecimal amount, TransactionType type, String category, String merchant, LocalDate date, String description) {
        this.id = id;
        this.amount = amount;
        this.type = type;
        this.category = category;
        this.merchant = merchant;
        this.date = date;
        this.description = description;
    }

    public String getId() {
        return id;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public TransactionType getType() {
        return type;
    }

    public String getCategory() {
        return category;
    }

    public String getMerchant() {
        return merchant;
    }

    public LocalDate getDate() {
        return date;
    }

    public String getDescription() {
        return description;
    }

    @Override
    public String toString() {
        return String.format("Transaction[ID=%s, Amount=₹%s, Type=%s, Category=%s, Merchant=%s, Date=%s]",
                id, amount.toPlainString(), type, category, merchant, date);
    }
}
