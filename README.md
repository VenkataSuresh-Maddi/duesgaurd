# DuesGuard AI — MSME Payment Intelligence & Dispute Preparation Platform

**Tagline:** *From Delayed Payments to Evidence-Ready Resolution.*

DuesGuard AI is a full-stack MSME payment intelligence platform built directly on Node.js, Express, MySQL, and vanilla modern frontend technologies. It secures MSME receivables, computes statutory 3x RBI penal interest under Chapter V of the MSMED Act 2006, runs background overdue email notifications, and generates evidence-ready MSME Samadhaan dispute packages.

---

## 🚀 Key Features

1. **Secure Session-Based Authentication**:
   - Server-side MySQL session storage with session regeneration.
   - bcrypt password hashing, rate limiting, and time-limited reset tokens.
   - Zero exposure of secrets or client-side storage tokens.

2. **Multi-Business Ownership & Data Isolation**:
   - Single user accounts can own and switch between multiple enterprises.
   - Backend ownership validation on every business-scoped endpoint via `x-business-id`.

3. **Product & Customer Management**:
   - Product catalog with internal cost price vs client selling price privacy.
   - Customer directory with state tracking for Indian GST Place of Supply rules.

4. **Tax Invoicing & Authoritative GST Engine**:
   - Automatic Intra-State (CGST + SGST) vs Inter-State (IGST) calculation.
   - Concurrency-safe sequential invoice numbering per business.
   - Server-side snapshotting of line-item prices and tax rates.
   - Instant PDF generation with statutory MSMED Act notice.

5. **Invoice Upload & Digital Extraction**:
   - Secure digital PDF and scanned invoice uploads.
   - Extraction of invoice number, GSTIN, dates, and amounts with duplicate detection.

6. **Payment Tracking & Reconciliation**:
   - Partial payments, multiple payments per invoice, and live balance updates.
   - Automatic transition across `issued`, `partially_paid`, `paid`, and `overdue`.

7. **Background Overdue Reminder Scheduler**:
   - Idempotent rules (3 days before due date, on due date, +1 day, +7 days, +15 days).
   - Resend, SMTP, or built-in test mock delivery with database audit logs.

8. **Aging Analytics & Dashboard**:
   - Real-time SQL aggregations for statutory MSME aging buckets: Current, 1-7, 8-15, 16-30, and >30 days overdue.

9. **Agentic AI & MSME Samadhaan Dispute Preparation**:
   - **Financial Validation Agent**: Deterministic verification of invoice arithmetic.
   - **Evidence Verification Agent**: Audits purchase orders, invoices, and delivery challans.
   - **Payment & Overdue Analysis Agent**: Applies Section 16 MSMED Act statutory compound penal interest (3x RBI repo rate ~19.5% p.a.).
   - **Dispute Preparation Agent**: Generates structured dispute claims ready for MSME Samadhaan filing.

---

## 🛠️ Local Setup & Running

### 1. Prerequisites
- Node.js (v18+)
- MySQL Server (v8.0+)

### 2. Configure Environment
Copy `.env.example` to `.env` and configure your database and email credentials:
```bash
cp .env.example .env
```

Example `.env`:
```env
PORT=3000
NODE_ENV=development
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=users
SESSION_SECRET=a_long_random_session_secret_32_characters_minimum
FRONTEND_URL=http://localhost:3000
EMAIL_PROVIDER=resend
RESEND_API_KEY=replace_with_api_key
EMAIL_FROM=notifications@duesguard.com
APP_BASE_URL=http://localhost:3000
REMINDER_TIMEZONE=Asia/Kolkata
```

### 3. Run Safe Migrations
Migrations preserve existing user and business data without data loss:
```bash
node migrations.js
```

### 4. Start the Application
```bash
npm start
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing
Run the automated test suite:
```bash
node tests/integration.test.js
```

---

## 📚 API Endpoints Summary

- **Auth**: `POST /api/signup`, `POST /api/login`, `POST /api/logout`, `GET /api/session`, `POST /api/forgot-password`, `POST /api/reset-password`
- **Businesses**: `GET /api/businesses`, `POST /api/businesses`, `PUT /api/businesses/:id`
- **Customers**: `GET /api/customers`, `POST /api/customers`, `PUT /api/customers/:id`
- **Products**: `GET /api/products`, `POST /api/products`, `PUT /api/products/:id`, `DELETE /api/products/:id`
- **Invoices**: `GET /api/invoices`, `GET /api/invoices/:id`, `POST /api/invoices`, `POST /api/invoices/upload`
- **Payments**: `POST /api/payments`
- **Reminders**: `POST /api/reminders/trigger`, `POST /api/reminders/test-send`, `GET /api/reminders/logs`
- **Dashboard**: `GET /api/dashboard/metrics`
- **Agentic AI Disputes**: `POST /api/ai/dispute-prep`, `GET /api/ai/cases`
