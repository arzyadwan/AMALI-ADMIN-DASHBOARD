## BACKEND (Node.js)
- **Runtime:** Node.js v20 (LTS).
- **Framework:** Express 4.19.
  - *Why:* Stability and massive community support.
- **Language:** TypeScript 5.x (Strict Mode: ON).
- **ORM:** Prisma 5.x.
  - *Why:* Best-in-class type safety for PostgreSQL and JSONB handling.
- **Validation:** Zod 3.x.
  - *Usage:* Validate incoming JSON requests AND validate JSONB data structure stored in DB.
- **Math Library:** `decimal.js-light`.

## FRONTEND (React)
- **Framework:** Vite 5.x + React 18.3.
- **State Management:** Zustand (Simple, minimal boilerplate).
- **Form Handling:** React Hook Form + Zod Resolver.
  - *Critical:* Used for the dynamic product forms.
- **UI Library:** Tailwind CSS v3.4 + shadcn/ui (optional, for pre-built accessible components).
- **Data Fetching:** TanStack Query (React Query) v5.

## DATABASE
- **PostgreSQL 16** (Required for performance JSONB indexing).