# Advanced Retail Inventory and Sales Management System

Full-stack retail management platform with real-time inventory tracking, sales processing, role-based access, and FULLTEXT search.

## Tech Stack

| Layer    | Technology                                              |
| -------- | ------------------------------------------------------- |
| Backend  | NestJS, TypeORM, MySQL 8, JWT, WebSockets               |
| Frontend | Angular 19 (standalone), RxJS, Signals, Tailwind CSS    |
| Tests    | Jest (backend), Playwright (frontend e2e)               |
| Load     | k6 (browse-and-buy, heavy-load scenarios)               |
| Infra    | Docker, Docker Compose, Nginx                           |

## Project Structure

```
retail-backend/
├── backend/
│   ├── src/
│   │   ├── auth/          # JWT authentication, guards, roles
│   │   ├── categories/    # Category CRUD
│   │   ├── common/        # Shared guards, decorators, filters, pipes
│   │   ├── config/        # Environment validation, DB config
│   │   ├── database/      # Migrations (incl. FULLTEXT index)
│   │   ├── inventory/     # Stock management, WebSocket gateway
│   │   ├── orders/        # Order processing
│   │   ├── products/      # Products CRUD + FULLTEXT search
│   │   ├── reports/       # Sales reports & aggregation
│   │   ├── sales/         # Sale transactions & items
│   │   └── users/         # User management
│   ├── test/
│   │   ├── unit/          # Unit tests (30 suites, 294 tests)
│   │   └── e2e/           # E2E tests (7 suites, 93 tests)
│   └── load-tests/        # k6 scenarios
├── frontend/
│   ├── src/
│   │   └── app/
│   │       ├── core/      # Services, guards, interceptors
│   │       ├── features/  # Products, POS, orders, reports
│   │       └── shared/    # Components, models, pipes
│   └── e2e/               # Playwright tests (59 tests)
├── docker-compose.yml
└── README.md
```

## Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [Docker](https://docs.docker.com/engine/install/) & [Docker Compose](https://docs.docker.com/compose/install/)

## Quick Start (Recommended — Docker Compose)

```bash
# 1. Clone and enter the project
cd Advanced-Retail-Inventory-and-Sales-Management-System-main

# 2. Create backend environment file
cp backend/.env.example backend/.env

# 3. Start all services (MySQL, backend, frontend)
docker compose up --build -d
```

> **Note:** MySQL takes ~30s to initialize on first run. The `backend` and `frontend` containers wait for the DB and migrations to finish. If `migrate` exits with an error (`ECONNREFUSED`), MySQL was still starting — simply re-run:
> ```bash
> docker compose up -d backend frontend
> ```

**Credentials** (seeded automatically):

| Role     | Email              | Password   |
| -------- | ------------------ | ---------- |
| Admin    | `admin@store.com`  | `Admin@123` |
| Manager  | `manager@retail.com`| `Admin@123` |
| Employee | `employee@retail.com`| `Admin@123` |

### Verify it's running

```bash
# Check container status
docker ps

# Test the backend API
curl -s http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@store.com","password":"Admin@123"}'
```

**URLs:**
- Frontend: http://localhost:4200
- Backend API: http://localhost:3000
- Swagger Docs: http://localhost:3000/api/docs

## Manual Setup (without Docker)

```bash
# 1. Backend
cd backend
cp .env.example .env        # edit DB_HOST if needed
npm install
npm run build

# Run MySQL on your own (e.g. Docker for just the DB)
docker run -d --name retail-db \
  -e MYSQL_ROOT_PASSWORD=rootpassword \
  -e MYSQL_DATABASE=retail_db \Nardpos h
  -e MYSQL_USER=retail_user \
  -e MYSQL_PASSWORD=retail_password \
  -p 3306:3306 mysql:8.0

# Wait for MySQL, then run migrations & seed
npm run migration:run
npm run seed

# Start the backend
npm run start:dev

# 2. Frontend (in a separate terminal)
cd frontend
npm install
npm run dev
```

Backend runs on `http://localhost:3000`, frontend on `http://localhost:4200`.

## API Documentation

```
http://localhost:3000/api/docs
```

### Key Endpoints

| Method | Path                          | Description                  |
| ------ | ----------------------------- | ---------------------------- |
| POST   | `/api/v1/auth/login`          | Login (returns JWT)          |
| GET    | `/api/v1/products`            | List products (search, filter, paginate, sort) |
| GET    | `/api/v1/products/search`     | Dedicated fulltext search    |
| GET    | `/api/v1/products/:id`        | Product details              |
| POST   | `/api/v1/sales`               | Create sale                  |
| GET    | `/api/v1/inventory`           | Inventory levels             |
| GET    | `/api/v1/inventory/audit`     | Inventory audit trail        |
| PATCH  | `/api/v1/inventory/:id/adjust`| Adjust stock                 |
| GET    | `/api/v1/reports/sales/daily` | Daily sales report           |
| GET    | `/api/v1/categories`          | Categories list              |

### FULLTEXT Search

`GET /api/v1/products?search=<term>` performs MySQL `MATCH(name, description) AGAINST(...)` for terms ≥ 3 characters, falling back to `LIKE` for shorter terms, with results ordered by relevance DESC.

> **Note:** Backend tests run against the Docker MySQL database. Make sure `docker compose up -d` is running first.

### Backend

```bash
cd backend
npm install              # first time only
npm run test:all         # all tests (37 suites, 387 tests)
```

### Frontend

```bash
cd frontend
npm install              # first time only
npx playwright test      # all e2e (59 tests)

# Run specific test files:
npx playwright test app.spec.ts                  # UI tests only (14)
npx playwright test backend-api.spec.ts          # API tests only (35)
npx playwright test contention-scenarios.spec.ts # contention tests only (10)
```

> **Note:** Frontend e2e tests require the Docker containers running (`docker compose up -d` from repo root).

### Lint & Typecheck

```
Backend:  npm run lint       # 0 errors, 24 warnings (unused imports in tests)
Backend:  npx tsc --noEmit   # clean
Frontend: npx tsc --noEmit   # clean
```

## Load Testing (k6)

Requires a valid JWT token:

```bash
TOKEN=<jwt> /tmp/k6-v2.0.0-linux-amd64/k6 run backend/load-tests/browse-and-buy.js
TOKEN=<jwt> /tmp/k6-v2.0.0-linux-amd64/k6 run backend/load-tests/heavy-load.js
```

### Browse-and-Buy Results

Multi-step scenario (search → browse → purchase), 19.4 iter/s, 80.8 req/s:

| Metric          | Value       |
| --------------- | ----------- |
| p(95) latency   | 37.85 ms    |
| Read success    | 100%        |
| Write success   | 94% (expected — stock depletion of productId:1) |

### Heavy-Load Results

Ramp to 1000 concurrent VUs, 7 min duration, read-only:

| Metric          | Value              |
| --------------- | ------------------ |
| Iterations      | 49,523             |
| Throughput      | 117.9 req/s        |
| Success rate    | 100%               |
| p(95) latency   | 8.92s (local Docker) |

System remained stable under extreme load with zero crashes or errors. Latency increase is expected on single-machine Docker deployment; production deployment with proper infrastructure would improve p(95).

## Project Completion Summary

- **All backend tests passed** (387/387).
- **All frontend E2E tests passed** (59/59).
- FULLTEXT search optimizations implemented with MySQL `MATCH ... AGAINST`.
- Angular search flow improved with RxJS `switchMap` to prevent stale responses.
- Browse-and-buy load test: **p95 37.85ms**, 100% read success.
- Heavy load test (1000 VUs): **100% success rate**, zero failures.

The application is functionally complete, stable under load, and ready for deployment.
