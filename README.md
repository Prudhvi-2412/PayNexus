# StripeX: Production-Grade Payment Gateway & Merchant Settlement Platform

StripeX is a backend payment infrastructure engine inspired by Stripe, Razorpay, and Juspay. It handles payments, refunds, double-entry ledgers, wallet balances, and T+1 settlements in a modular monolith architecture. 

---

## 🚀 Key Architectural Pillars

### 1. GAAP-Compliant Double-Entry Ledger (No Direct Balances)
Accounts *never* maintain a "balance" column in the database. Balance columns suffer from race conditions, locking overhead, and lack auditability. Instead, we use a general double-entry ledger where:
- Every transaction creates a **Debit Entry** and a matching **Credit Entry**.
- The balance of any account is derived dynamically by summing entries: `Sum(Credits) - Sum(Debits)` for Credit-normal accounts (like Merchant wallets) or `Sum(Debits) - Sum(Credits)` for Debit-normal accounts (like cash assets or receivables).
- The system enforces `Sum(Debits) === Sum(Credits)` for every transaction before saving.

### 2. ACID Concurrency Control (Pessimistic Row Locking)
To prevent race conditions during captures and refunds (e.g., dual capture requests or double refund requests), we use PostgreSQL pessimistic row locking. Handlers query the record using `SELECT ... FOR UPDATE` before executing state transitions or ledger updates, ensuring sequential executions.

### 3. Outbox Pattern & Event Streaming (Kafka)
As soon as a transaction succeeds, events like `payment.captured` or `refund.completed` are published to Kafka. Separate asynchronous consumer groups handle:
- **Webhooks**: Triggers signed webhook calls to merchants.
- **Audit**: Appends actions and state diffs to database logs.
- **Analytics**: Aggregates real-time volumes and writes to Redis.
- **Notifications**: Fires mock customer/merchant alerts.

### 4. Database-Backed Idempotency Engine
Duplicate requests (payments, refunds, settlements) are prevented at the gateway layer using `Idempotency-Key` headers. An ACID Postgres write blocks concurrent identical calls, returns a `409 Conflict` if processing is in-flight, and saves responses to return cached results on retries.

---

## 🛠️ Tech Stack
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL.
- **Cache & Limits**: Redis.
- **Event Bus**: Kafka.
- **Frontend**: React (Vite + TypeScript + Vanilla CSS).
- **CI/CD**: GitHub Actions.
- **DevOps**: Docker, Docker Compose.

---

## 📂 Project Structure

```
d:\Payment Project\
├── .github/workflows/ci.yml # GitHub CI Configuration
├── apps/
│   ├── backend/             # Express Modular Monolith
│   │   ├── prisma/          # Prisma schema & seed scripts
│   │   ├── src/
│   │   │   ├── modules/     # Domain Services (payment, ledger, webhook, etc.)
│   │   │   ├── shared/      # Shared configs, Redis, Kafka, Middlewares
│   │   │   ├── app.ts       # Express app register
│   │   │   └── index.ts     # Main application bootstrap
│   │   └── package.json
│   └── dashboard/           # Vite + React Premium UI Console
│       ├── src/             # React dashboard & Stylesheets
│       └── package.json
├── docker-compose.yml       # Infra (Postgres, Redis, Kafka, Zookeeper)
└── README.md
```

---

## 📋 Ledger Journal Entries Flow

### Payment Capture ($100.00 with $2.30 platform fee):
- **Gateway Receivable (Asset - Debit-Normal)**: `DEBIT $100.00` (Gateway owes us $100)
- **Merchant Pending (Liability - Credit-Normal)**: `CREDIT $97.70` (We owe merchant $97.70)
- **Platform Revenue (Revenue - Credit-Normal)**: `CREDIT $2.30` (Platform earns $2.30)
- *Verify:* `Debits ($100.00) === Credits ($97.70 + $2.30)`

### Daily Settlement Payout (T+1):
1. **Move pending to settled in ledger**:
   - **Merchant Pending**: `DEBIT $97.70` (Clears pending)
   - **Merchant Settled**: `CREDIT $97.70` (Accrues to settled)
2. **Complete payout to merchant's bank account**:
   - **Merchant Settled**: `DEBIT $97.70` (Payout clears liability)
   - **Gateway Receivable**: `CREDIT $97.70` (Reduces cash asset as funds leave)

---

## 🚀 How to Run Locally

### 1. Launch Infrastructure
Start PostgreSQL, Redis, and Kafka:
```bash
docker-compose up -d
```

### 2. Configure & Run Backend
Navigate to backend, install dependencies, and run migrations:
```bash
cd apps/backend
npm install
# Run Prisma migrations to set up Postgres tables
npx prisma migrate dev
# Seed the database (Super Admin, Merchant accounts, and transaction logs)
npx prisma db seed
# Start the backend server
npm run dev
```

The database is seeded with a default API key: `sk_live_abc123merchantkeyforlocaldemo`.
The backend runs at `http://localhost:3000`.

### 3. Launch Dashboard Console
Navigate to dashboard, install dependencies, and start development server:
```bash
cd ../dashboard
npm install
npm run dev
```
The React Console is available at `http://localhost:5173`. 
- Select **Merchant View** to test orders checkout, issue refunds, view API keys, and configure webhooks.
- Select **Super Admin View** to trigger settlements, view platform revenue, audits, and manual risk reviews.

*Note: The React console has an integrated **In-Memory Fallback System**. If the backend server is offline, the UI operates seamlessly in-memory, letting you demo the entire payment capture, double-entry ledger adjustments, and settlement batches offline.*
