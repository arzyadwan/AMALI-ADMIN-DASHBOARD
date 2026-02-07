# PROJECT CONTEXT: AMALI RETAIL SYSTEM (ARMS)

## 1. Core Principles
- **Financial Precision:** NEVER use native JavaScript `number` (float) for currency calculations.
  - **Rule:** You MUST use `decimal.js` or `dinero.js` library for ALL money math.
  - **Database:** Store money as `DECIMAL(19,4)` in PostgreSQL.
- **Snapshot Logic:** Credit transactions are IMMUTABLE.
  - When a transaction is created, you MUST deep-copy the current interest rate and penalty rules from `loan_schemes` into the `transactions` table (JSONB column). Do not rely on relations for historical data.
- **Strict Typing:** Use TypeScript for both Backend and Frontend. `any` type is strictly forbidden in business logic files.

## 2. Architecture Pattern
- **Backend:** Service-Repository Pattern (Controller -> Service -> Repository/ORM -> DB).
  - Do not put business logic inside Controllers.
- **Frontend:** Component-based. Use Custom Hooks for logic separation (e.g., `useCreditCalculator`).

## 3. Naming Conventions
- **Database:** snake_case (e.g., `loan_schemes`, `is_active`, `created_at`).
- **API Responses:** camelCase (standard JS/JSON practice).
- **Files:**
  - Components: `ProductForm.tsx` (PascalCase)
  - Utilities: `formatCurrency.ts` (camelCase)

## 4. API Response Standard
```json
{
  "success": true,
  "data": { ... },
  "message": "Transaction created successfully",
  "error": null
}