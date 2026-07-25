# MYS CONNECT

**Connecting Every Member, Digitally**

Maheshwari Yuva Sangathan (MYS), Ranchi — Community Management Platform

## Architecture

| Layer | Technology | Location |
|---|---|---|
| Mobile App | Expo React Native + TypeScript | `apps/mobile/` |
| Admin Dashboard | Next.js + TypeScript | `apps/admin/` |
| Backend API | Express.js + Prisma + Socket.io | `server/` |
| Database | PostgreSQL 16 (Docker) | `docker-compose.yml` |
| Auth | Clerk.com | Integrated in mobile + server |
| Storage | Cloudinary | Server-side integration |
| Shared Code | TypeScript types + constants | `packages/shared/` |

## Prerequisites

- Node.js >= 20
- Docker Desktop
- Clerk.com account
- Cloudinary account

## Quick Start

```bash
# 1. Start database
docker compose up -d

# 2. Run database migrations
npm run db:migrate

# 3. Seed initial data
npm run db:seed

# 4. Start backend server
npm run server

# 5. Start mobile app
npm run mobile
```

## Environment Variables

Copy `.env.example` files in each project directory and fill in your values:
- `apps/mobile/.env` — Clerk publishable key
- `server/.env` — Database URL, Clerk secret, Cloudinary credentials
