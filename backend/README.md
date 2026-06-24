# Retail Backend

NestJS REST API for the Advanced Retail Inventory and Sales Management System.

## Tech Stack

- **Runtime** — Node.js 20+, TypeScript 5
- **Framework** — NestJS 10
- **Database** — MySQL 8 with TypeORM 0.3
- **Auth** — JWT (access + refresh tokens), bcryptjs
- **Validation** — class-validator + class-transformer
- **Real-time** — Socket.IO (via `@nestjs/websockets`)
- **API Docs** — Swagger (via `@nestjs/swagger`)
- **Security** — Rate limiting (`@nestjs/throttler`), role-based guards
- **Testing** — Jest + supertest
- **Container** — Docker (multi-stage)

## Architecture

```
src/
├── auth/             # Auth module (login, refresh, logout, profile)
├── categories/       # Product categories CRUD
├── common/           # Shared guards, interceptors, filters, decorators, DTOs
├── config/           # Environment validation (Joi)
├── database/         # TypeORM data-source, migrations
├── inventory/        # Inventory management + WebSocket gateway
├── products/         # Product CRUD + search/filter
├── reports/          # Sales/stock reports
├── sales/            # Sales transactions + invoices
└── users/            # User management (admin only)
```

## Prerequisites

- Node.js 20+
- MySQL 8
- Docker (optional)

## Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | No | `development` | Environment |
| `PORT` | No | `3000` | API port |
| `DB_HOST` | **Yes** | — | MySQL host |
| `DB_PORT` | No | `3306` | MySQL port |
| `DB_USERNAME` | **Yes** | — | MySQL user |
| `DB_PASSWORD` | No | `""` | MySQL password |
| `DB_NAME` | **Yes** | — | MySQL database |
| `ACCESS_TOKEN_SECRET` | **Yes** | — | JWT access token secret |
| `ACCESS_TOKEN_EXPIRES_IN` | No | `15m` | Access token TTL |
| `REFRESH_TOKEN_SECRET` | **Yes** | — | JWT refresh token secret |
| `REFRESH_TOKEN_EXPIRES_IN` | No | `7d` | Refresh token TTL |
| `FRONTEND_URL` | No | `http://localhost:4200` | CORS origin |

## Getting Started

```bash
# Install dependencies
npm install

# Start database (Docker)
docker compose up -d db

# Run migrations
npm run migration:run

# Start in dev mode
npm run start:dev
```

API available at `http://localhost:3000/api/v1`.

## API Documentation

Swagger UI available at `http://localhost:3000/api/docs` (non-production only).

### Endpoints Overview

| Module | Method | Path | Auth |
|---|---|---|---|
| **Auth** | POST | `/auth/login` | No |
| | POST | `/auth/refresh` | No |
| | POST | `/auth/logout` | JWT |
| | GET | `/auth/profile` | JWT |
| **Categories** | POST | `/categories` | JWT |
| | GET | `/categories` | JWT |
| | GET | `/categories/:id` | JWT |
| | PATCH | `/categories/:id` | JWT |
| | DELETE | `/categories/:id` | JWT |
| **Products** | POST | `/products` | JWT |
| | GET | `/products` | JWT |
| | GET | `/products/low-stock` | JWT |
| | GET | `/products/:id` | JWT |
| | PATCH | `/products/:id` | JWT |
| | DELETE | `/products/:id` | JWT |
| **Inventory** | GET | `/inventory/low-stock` | JWT |
| | GET | `/inventory/stats` | JWT |
| | PATCH | `/inventory/:productId/minimum-stock` | JWT |
| **Sales** | POST | `/sales` | JWT |
| | GET | `/sales` | JWT |
| | GET | `/sales/:id` | JWT |
| | GET | `/sales/:id/invoice` | JWT |
| | PATCH | `/sales/:id/status` | JWT |
| **Reports** | GET | `/reports/summary` | JWT |
| | GET | `/reports/top-products` | JWT |
| | GET | `/reports/sales-by-day` | JWT |
| | GET | `/reports/sales-by-category` | JWT |
| | GET | `/reports/stock` | JWT |
| **Users** | POST | `/users` | JWT (admin) |
| | GET | `/users` | JWT (admin) |
| | GET | `/users/:id` | JWT (admin) |
| | PATCH | `/users/:id` | JWT (admin) |
| | PATCH | `/users/:id/toggle-active` | JWT (admin) |

All responses are wrapped in `{ success, data, message }`.

## Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# All tests
npm run test:all
```

## Docker

```bash
# Build image
docker build -t retail-backend .

# Run with compose (from project root)
docker compose up -d backend
```

## Database

```bash
# Generate migration
npm run migration:generate --name=MigrationName

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

## Features

- **JWT authentication** with access/refresh token rotation and account lockout
- **Role-based access control** (admin, manager, employee)
- **Full-text search** across products (name, description, SKU)
- **Filtering** by category, price range, stock status
- **Paginated responses** with sortable columns
- **Transactional sales processing** with pessimistic stock locking
- **Invoice generation** with auto-numbering
- **Real-time stock updates** via Socket.IO
- **Audit logging** for auth events and CRUD operations
- **Rate limiting** on auth endpoints
- **Swagger API documentation**
