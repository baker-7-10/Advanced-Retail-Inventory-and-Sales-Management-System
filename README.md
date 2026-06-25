# Advanced Retail Inventory and Sales Management System

Backend built with NestJS, TypeORM, MySQL, and Docker.
Frontend built with Angular 19.

## Setup

```bash
cd backend && npm install
docker compose up -d
cd backend && npm run build
```

## API Docs
```
http://localhost:3000/api/docs
```

## Tests

### Backend (cd into `backend/` first)

```bash
cd backend

npm test            # unit tests (30 suites, 294 tests)
npm run test:e2e    # e2e tests (7 suites, 93 tests)
npm run test:all    # all tests (37 suites, 387 tests)
```

### Frontend (cd into `frontend/` first)

```bash
cd frontend

npx playwright test                              # all e2e (59 tests)
npx playwright test app.spec.ts                  # UI tests only (14)
npx playwright test backend-api.spec.ts          # API tests only (35)
npx playwright test contention-scenarios.spec.ts # contention tests only (10)
```

> **Note:** Frontend e2e tests require Docker containers to be running (`docker compose up -d` from the root).
