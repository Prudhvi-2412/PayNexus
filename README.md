# PayNexus: Production-Grade Payment Gateway & Merchant Settlement Platform

PayNexus is a high-throughput, enterprise-grade payment infrastructure platform inspired by modern payment gateways like Stripe, Razorpay, and Juspay. It handles real-time transaction ingestion, risk checking, double-entry ledger accounting, automated settlements, and webhook event streaming in a highly resilient architecture.

---

## 🚀 Key Architectural Pillars

### 1. GAAP-Compliant Double-Entry Ledger (No Direct Balances)
To prevent race conditions, locking overhead, and auditability gaps, accounts *never* maintain a raw "balance" column in the database. Instead, all balances are dynamically derived from a general double-entry ledger:
- Every action creates a balanced pair of **Debit** and **Credit** entries.
- The balance of any account is aggregated dynamically by summing entries: `Sum(Credits) - Sum(Debits)` for Credit-normal accounts (e.g., Merchant Pending/Settled/Platform Revenue) or `Sum(Debits) - Sum(Credits)` for Debit-normal accounts (e.g., Gateway Receivable).
- The ledger service enforces the accounting equation `Sum(Debits) === Sum(Credits)` atomically for every transaction before saving to Postgres.

### 2. Multi-Layer API Protection & Concurrency Control
- **Token Bucket Rate Limiting**: Redis Lua scripts atomically manage requests per API key to guarantee sub-millisecond overhead and absolute rate-limiting precision.
- **Database-Backed Idempotency Engine**: Duplicate requests are rejected early using `Idempotency-Key` headers. Processing states (`IN_PROGRESS` or `COMPLETED`) are checked in Redis and Postgres, resolving concurrent duplicate calls via database-level unique constraints and caching responses for 24 hours.
- **ACID Pessimistic Row Locking**: PostgreSQL `SELECT ... FOR UPDATE` locks records sequentially during key state transitions (like Captures, Refunds, or Settlement payouts) to avoid race conditions.
- **Distributed Locks (Redlock)**: Mutatively intensive batch processes (e.g., settlement runs) are locked via Redis to guarantee single-instance execution in cluster environments.

### 3. Smart Routing & Gateway Failover
- Dynamic, metrics-driven transaction routing automatically steers payments between primary and secondary bank rails (e.g., HDFC and ICICI) based on real-time success rates stored in Redis.
- If HDFC bank rails drop below an 80% success rate (simulated by checking if an amount ends in `5`), new transaction traffic dynamically shifts 100% to healthy secondary bank rails.

### 4. Outbox Pattern & Event Streaming (Kafka)
As soon as a transaction changes state, events (e.g., `payment.captured`, `refund.completed`, `settlement.completed`) are published to a Kafka message broker. Distributed, decoupled consumer groups handle:
- **Webhook Delivery Engine**: Signs and delivers HTTP POST payloads to registered merchant endpoints, featuring exponential backoff retries (up to 5 times) for robust reliability.
- **Audit Trails**: Appends event histories, actor details, and state diffs into PostgreSQL logs for administrative compliance.
- **Real-Time Analytics**: Decouples aggregation pipelines by tracking volumes in Redis, which are polled by the dashboard.

---

## 🛠️ Tech Stack
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL.
- **Cache & Limits**: Redis (Rate Limiter, Idempotency Cache, Redlocks).
- **Event Bus**: Apache Kafka & Zookeeper.
- **Frontend**: React (Vite + TypeScript + TailwindCSS + Framer Motion).
- **CI/CD**: GitHub Actions.
- **DevOps**: Docker, Docker Compose.

---

## 📂 Project Structure

```
PayNexus/
├── .github/
│   └── workflows/
│       └── ci.yml             # GitHub CI/CD workflow configuration
├── apps/
│   ├── backend/               # Express Modular Monolith
│   │   ├── prisma/            # Prisma schema, migrations, and seed scripts
│   │   ├── src/
│   │   │   ├── modules/       # Domain Services (payment, ledger, webhook, fraud, etc.)
│   │   │   ├── shared/        # Shared database clients (Redis, Kafka, Prisma) and middleware
│   │   │   ├── app.ts         # Express routers registry
│   │   │   └── index.ts       # Main application bootstrap entrypoint
│   │   └── package.json
│   └── dashboard/             # Vite + React Premium Glassmorphic Admin Console
│       ├── src/               # React components, styles, and dashboard analytics
│       └── package.json
├── docker-compose.yml         # Containerized Postgres, Redis, Kafka, and Zookeeper
└── README.md
```

---

## 📋 Ledger Journal Entries Flow

### Payment Capture ($100.00 with $2.30 platform fee):
- **Gateway Receivable (Asset - Debit-Normal)**: `DEBIT $100.00` (Gateway owes us $100)
- **Merchant Pending (Liability - Credit-Normal)**: `CREDIT $97.70` (We owe merchant $97.70)
- **Platform Revenue (Revenue - Credit-Normal)**: `CREDIT $2.30` (Platform earns $2.30)
- *Verification:* `Debits ($100.00) === Credits ($97.70 + $2.30)`

### Daily Settlement Payout (T+1):
1. **Move pending to settled in ledger**:
   - **Merchant Pending**: `DEBIT $97.70` (Clears pending)
   - **Merchant Settled**: `CREDIT $97.70` (Accrues to settled)
2. **Complete payout to merchant's bank account**:
   - **Merchant Settled**: `DEBIT $97.70` (Payout clears liability)
   - **Gateway Receivable**: `CREDIT $97.70` (Reduces gateway receivable)

---

## 🚀 How to Run Locally

### 1. Launch Infrastructure
Start PostgreSQL, Redis, and Kafka in the background:
```bash
docker-compose up -d
```

### 2. Configure & Run Backend
Navigate to backend, install dependencies, run Prisma migrations, and start the development server:
```bash
cd apps/backend
npm install
# Run Prisma migrations to set up PostgreSQL database tables
npx prisma migrate dev
# Seed the database with default Super Admin, Merchants, API keys, and transaction logs
npx prisma db seed
# Start the backend API server
npm run dev
```

- The database is seeded with a default API key: `sk_live_abc123merchantkeyforlocaldemo`.
- The backend API runs at `http://localhost:3000`.

### 3. Launch Dashboard Console
In a new terminal window, navigate to the dashboard directory, install dependencies, and start Vite:
```bash
cd apps/dashboard
npm install
npm run dev
```
The React Console is available at `http://localhost:5173`. 
- **Merchant View**: Test checkouts, issue refunds, view API keys, and configure webhooks.
- **Super Admin View**: Trigger settlements, view platform revenue, track audit logs, and trigger manual risk reviews.

*Note: The React console includes an integrated **In-Memory Fallback System**. If the backend server is offline, the UI operates seamlessly in-memory, allowing you to demo payment captures, double-entry ledger adjustments, and settlement batches offline.*

