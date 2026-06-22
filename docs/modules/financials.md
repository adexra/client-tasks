# Financials — Operator OS

Last updated: 2026-06-21

## Purpose
Track all Adexra income (client payments) and expenses. Show net margin, bank balance, and revenue in the user's chosen currency (BRL/USD/EUR).

## Entry Points
- `/financials` → `src/pages/Financials.jsx`
- `src/context/FinancialContext.jsx` — provides financial totals to all components

## Key Files
| File | Responsibility |
|---|---|
| `src/pages/Financials.jsx` | Income/expense dashboard with add expense form |
| `src/context/FinancialContext.jsx` | Aggregates payments + expenses, provides converted totals |

## Tables Used
- `client_payments` — income records (see ISSUE-001 — table may be missing from migrations)
- `expenses` — expense records (see ISSUE-001 — table may be missing from migrations)
- `clients` — for listing active projects in the income section

## Data Model Notes
- All amounts stored in their original currency (BRL, USD, EUR)
- BRL snapshot captured at time of payment mark (`paid_brl_amount`) — prevents FX drift on historical records
- FX rates are hardcoded: USD→BRL: 5.20, EUR→BRL: 6.00 (ISSUE-009 — stale rates)
- Totals: `incomeBRL`, `expensesBRL`, `paidBRL`, `marginBRL`, `bankBRL`
- `bankBRL = paidBRL - expensesBRL`

## Calculated Totals (FinancialContext)
```
incomeBRL  = sum of all client_payments converted to BRL (including unpaid)
paidBRL    = sum of paid client_payments in BRL (uses paid_brl_amount snapshot if available)
expensesBRL = sum of all expenses converted to BRL
marginBRL  = paidBRL - expensesBRL
bankBRL    = paidBRL - expensesBRL
```

## Known Gotchas
- `client_payments` and `expenses` tables are missing from migrations. App will fail on any financial page until `complete_migration.sql` is run (ISSUE-001).
- FX rates are frozen at 5.20/6.00. Any multi-currency display is approximate for live amounts (but historical paid amounts use snapshots, which are accurate).
- Recurring payments: tracked via `is_recurring` + `recurring_start_date` + `terminated_at`. Monthly payment count is calculated in JS from these dates.
