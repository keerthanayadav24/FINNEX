# FINNEX — STAGE 0: FOUNDATION & ARCHITECTURE

FINNEX is a Personal & Business Finance Management System built from scratch with a robust, extensible foundational architecture.

---

## 🏗️ Architecture & Tech Stack

### Tech Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Clerk SDK
- **Backend**: Node.js, Express, TypeScript, Zod, `@clerk/express` & `@clerk/backend`
- **Database**: PostgreSQL 18
- **ORM**: Prisma Client v6 (`Decimal(14,2)` precision for financial accuracy)

### Data Architecture Overview
```text
                    DATA SOURCES
Manual Entry ───────┐
CSV Import ─────────┤
Bank Imports ───────┼───> NORMALIZATION LAYER ───> NORMALIZED TRANSACTION SCHEMA
Card Imports ───────┤
API Connections ────┘
                                                            │
                                        ┌───────────────────┼───────────────────┐
                                        ▼                   ▼                   ▼
                                 Categorization     Anomaly Engine     Forecasting Engine
                                                            │
                                                            ▼
                                                       Action Engine
```

---

## 📁 Repository Structure

```text
FINNEX/
│
├── frontend/                     # React + Vite + Tailwind CSS Frontend
│   ├── src/
│   │   ├── components/           # UI Header, Sidebar, Cards, Modals
│   │   ├── layouts/              # AppLayout container
│   │   ├── pages/                # Dashboard, Accounts, Transactions, Budgets, Goals, Settings
│   │   ├── services/             # Modular API fetch services
│   │   ├── types/                # Shared TypeScript entity interfaces
│   │   ├── index.css             # Tailwind CSS & custom glassmorphism styles
│   │   └── App.tsx               # Main application component
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                      # Node.js + Express + Prisma Backend
│   ├── prisma/
│   │   ├── schema.prisma         # Normalized database models & enums
│   │   ├── migrations/           # PostgreSQL migration history
│   │   └── seed.ts               # Reproducible development seed script
│   ├── src/
│   │   ├── config/               # Prisma singleton & Zod environment parsing
│   │   ├── controllers/          # Express route controllers
│   │   ├── middleware/           # Auth resolution & centralized error handling
│   │   ├── routes/               # API endpoint routers
│   │   ├── services/             # Prisma database query services
│   │   ├── validators/           # Zod payload validation schemas
│   │   └── server.ts             # Main Express server entrypoint
│   ├── package.json
│   └── tsconfig.json
│
├── .env.example                  # Environment configuration template
├── package.json                  # Root monorepo scripts
└── README.md                     # Project documentation
```

---

## ⚡ Quick Start Guide

### Prerequisites
- Node.js (v20+) & npm
- PostgreSQL 18 running locally on port `5432`

### Setup Steps

1. **Configure Environment Variables**:
   Copy `.env.example` to `.env` in root and `backend/`:
   ```bash
   DATABASE_URL="postgresql://postgres:Hello@localhost:5432/finnex?schema=public"
   PORT=5000
   NODE_ENV="development"
   DEV_AUTH_ENABLED="true"
   ```

2. **Run Migrations & Seed Data**:
   ```bash
   npm run prisma:migrate
   npm run prisma:seed
   ```

3. **Start Backend Engine**:
   ```bash
   npm run dev:backend
   ```
   *Health Check*: `http://localhost:5000/api/health`

4. **Start Frontend Dashboard**:
   ```bash
   npm run dev:frontend
   ```
   *Dashboard UI*: `http://localhost:5173`

---

## 🔒 Security & Data Isolation
- All financial queries in `backend/src/services/` explicitly enforce `where: { userId: req.user.id }`.
- Frontend-supplied `userId` parameters are strictly ignored for authorization.
- `x-dev-user-id` header fallback is **ONLY** allowed when `NODE_ENV=development` AND `DEV_AUTH_ENABLED=true`. It is strictly disabled in production.

---

## 🔌 API Endpoints Reference

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/health` | System & DB connection status | No |
| `GET` | `/api/users/me` | Current authenticated user profile | Yes |
| `GET` | `/api/accounts` | User financial accounts | Yes |
| `POST` | `/api/accounts` | Create new financial account | Yes |
| `GET` | `/api/accounts/:id` | Fetch specific account details | Yes |
| `DELETE` | `/api/accounts/:id` | Delete account | Yes |
| `GET` | `/api/categories` | System default & user categories | Yes |
| `POST` | `/api/categories` | Create custom user category | Yes |
| `GET` | `/api/transactions` | Normalized transaction ledger | Yes |
| `POST` | `/api/transactions` | Record new transaction (MANUAL/CSV) | Yes |
| `PUT` | `/api/transactions/:id` | Update transaction | Yes |
| `DELETE` | `/api/transactions/:id` | Delete transaction & revert balance | Yes |
| `GET` | `/api/budgets` | Category budgets list | Yes |
| `POST` | `/api/budgets` | Create category budget limit | Yes |
| `GET` | `/api/goals` | Financial savings goals | Yes |
| `POST` | `/api/goals` | Create savings goal | Yes |
| `GET` | `/api/notifications` | User system notifications | Yes |
