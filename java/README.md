# FINNEX — Core Java & Data Structures Analytical Engine

> **Academic & OOP/DSA Demonstration Module**  
> *Note: This Java module is a standalone backend/analytical implementation created for academic reports, object-oriented design, and data structures demonstration. It operates independently and does NOT replace or alter the active FINNEX React + TypeScript + Express web application.*

---

## 📌 Module Purpose

The **FINNEX Java Analytical Engine** demonstrates the core Object-Oriented Programming (OOP) principles and Data Structures & Algorithms (DSA) required for financial data processing, budget pacing, anomaly detection, health scoring, and debt repayment optimization.

---

## 🏗️ Architecture & Package Structure

```text
java/
└── src/
    └── com/
        └── finnex/
            ├── model/
            │   ├── Transaction.java         # Financial transaction model
            │   ├── TransactionType.java     # Transaction classification Enum (INCOME, EXPENSE, TRANSFER)
            │   ├── Account.java             # User financial account model
            │   ├── AccountType.java         # Account classification Enum (CHECKING, SAVINGS, etc.)
            │   ├── Budget.java              # Category budget pacing model
            │   ├── Goal.java                # Financial savings goal model
            │   └── Debt.java                # Liabilities model
            │
            ├── analysis/
            │   ├── SpendingAnalyzer.java    # Income/Expense cashflow & Category ranking
            │   ├── ForecastAnalyzer.java    # Moving average expenditure forecasting
            │   └── AnomalyAnalyzer.java     # Rule-based unusual expense detection
            │
            ├── service/
            │   ├── BudgetAnalyzer.java      # Budget usage & limit warnings
            │   ├── GoalAnalyzer.java        # Goal progress & target date tracking
            │   ├── FinancialHealthAnalyzer.java # 0-100 composite health score algorithm
            │   └── DebtAnalyzer.java        # Debt Snowball vs Avalanche prioritization
            │
            └── Main.java                    # Entry point & execution demonstration
```

---

## 💡 Object-Oriented Programming (OOP) Concepts Demonstrated

1. **Encapsulation**: Private class attributes (`amount`, `balance`, `spentAmount`, etc.) exposed strictly through getter/setter methods.
2. **Abstraction**: Complex financial calculations (e.g. debt repayment strategies, anomaly detection logic, composite health scoring) hidden behind clean analyzer service interfaces.
3. **Domain Modeling & Enums**: Type-safe enumerations (`TransactionType`, `AccountType`) preventing invalid financial classifications.
4. **Immutability & Precise Precision**: Use of `java.math.BigDecimal` for exact monetary calculations, avoiding floating-point arithmetic errors.

---

## 🧠 Data Structures & Algorithms (DSA) Demonstrated

| DSA Concept | Java Implementation | FINNEX Application Use Case |
| :--- | :--- | :--- |
| **Dynamic Collections** | `ArrayList<T>` | Storing transactions, accounts, budgets, goals, and debts. |
| **Key-Value Aggregations** | `HashMap<String, BigDecimal>` | Grouping spending by category and calculating sums. |
| **Sorting Algorithms** | `Collections.sort()` / `List.sort()` | Ranking top spending categories descending. |
| **Comparator Strategies** | `Comparator.comparing()` | Sorting debts by lowest balance (**Snowball**) vs highest interest rate (**Avalanche**). |
| **Rule-Based Anomaly Detection** | Statistical Multiplier Filter | Identifying transactions exceeding 2.5x mean expense or static thresholds. |

---

## 🛠️ How to Compile & Run

### Prerequisites
- Java Development Kit (JDK 17 or higher)

### Step 1: Compile the Java Source Code
From the project root directory (`FINNEX`):

```bash
cd java
javac -d bin src/com/finnex/model/*.java src/com/finnex/analysis/*.java src/com/finnex/service/*.java src/com/finnex/Main.java
```

### Step 2: Run the Main Analytical Engine
```bash
java -cp bin com.finnex.Main
```

---

## 📊 Sample Output Format (INR / Indian Rupees)

The engine prints a structured console report formatted in Indian Rupees (₹):
- Total Monthly Income & Expenses
- Category Spending Rankings
- Budget Usage & Over-Limit Warnings
- Goal Progress Percentages
- Moving Average Spending Forecast
- Anomaly Flagging
- 0-100 Composite Financial Health Score
- Debt Snowball vs. Avalanche Prioritization Comparison
