# PCB Feeder Tracker

Next.js (App Router) application that tracks feeder stock for PCB placement machines with Prisma/PostgreSQL, JWT authentication, and a minimal Tailwind UI.

## Quick start

```bash
docker compose up -d
cp .env.example .env
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Open http://localhost:3000 and log in.

## Credentials

- admin / admin123 (ADMIN)
- op / operator123 (OPERATOR)

## Tech

- Next.js 16 + TypeScript + Tailwind (app router)
- Prisma ORM + PostgreSQL (Docker)
- JWT auth, bcrypt password hashing

## Notes

- Each feeder is a single DB row; `machineId` null means free stock.
- All changes (assign/unassign/create) are logged to the Audit table.
