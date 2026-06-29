# MoveOn Sync API — Developer Handoff

**Date:** 2026-06-24  
**From:** Adexra (Operator OS team)  
**To:** MoveOn Admin dev team  
**Subject:** New `/api/admin/sync-tasks` endpoint + one required action to go live

---

## Overview

Operator OS (Adexra's internal execution dashboard at `tasks.adexra.com`) now automatically pushes tasks and sprint objectives to the MoveOn Admin dashboard whenever a task is created, updated, moved, or deleted — as long as that task is tagged as MoveOn-linked (see filter rule below).

Both sides have been built. The MoveOn API route is already committed to `adexra/moveon` on `main`. The only thing blocking it from going live is **one Vercel redeploy with build cache cleared** (explained at the bottom).

---

## What Was Added to `adexra/moveon`

### New File

```
apps/admin/src/app/api/admin/sync-tasks/route.ts
```

This is a Next.js App Router API route with two handlers:

#### `POST /api/admin/sync-tasks`

Receives a batch of tasks and sprint objectives from Operator OS and upserts them into MoveOn's Supabase database.

**Auth:** `Authorization: Bearer <INTERNAL_API_KEY>` — uses the existing server-to-server path already built into `apps/admin/src/lib/api-auth.ts` (`resolveUser` checks `INTERNAL_API_KEY` before Supabase auth).

**Request body:**
```json
{
  "tasks": [
    {
      "id": "uuid-from-operator-os",
      "titulo": "Configurar bot Melissa",
      "projeto": "Sprint 3 / MoveOn — Bot e Chatwoot",
      "planning_bucket": "sprint",
      "execution_status": "doing",
      "prioridade": 3,
      "urgencia": 2,
      "order_index": 1.5,
      "categoria": "automation",
      "notas": null,
      "url_verificacao": null
    }
  ],
  "objectives": [
    {
      "scope": "sprint",
      "key": "Sprint 3 / MoveOn — Bot e Chatwoot",
      "objetivo": "Bot real voltar a rodar corretamente"
    }
  ]
}
```

**Response (200 — success):**
```json
{
  "tasks_upserted": 1,
  "objectives_upserted": 1,
  "errors": []
}
```

**Response (207 — partial error):**
```json
{
  "tasks_upserted": 0,
  "objectives_upserted": 0,
  "errors": ["tasks: duplicate key violation on column x"]
}
```

**Upsert key:** tasks upsert on `id` (conflict: `id`). Objectives upsert on `scope, key` (conflict: `scope,key`). Re-sending the same payload is fully idempotent.

**Stripped fields:** `client`, `lead`, `client_id` are removed before upserting — these are Operator OS foreign keys that don't exist in MoveOn's schema.

---

#### `DELETE /api/admin/sync-tasks?id=<task_uuid>`

Removes a task from MoveOn when it is deleted in Operator OS.

**Auth:** Same `Bearer <INTERNAL_API_KEY>`.

**Response (200):**
```json
{ "deleted": "uuid-of-deleted-task" }
```

---

### Files It Depends On (already existed, not modified)

```
apps/admin/src/lib/api-auth.ts       — requireAdmin(), adminClient(), requireEnv()
apps/admin/src/lib/tasks.ts          — Task and RoadmapObjective types
```

The `resolveUser()` function in `api-auth.ts` already contains the internal key check:

```ts
const internalKey = process.env.INTERNAL_API_KEY;
if (internalKey && token === internalKey) {
  return { userId: "internal", role: "super_admin" };
}
```

This means the sync endpoint gets `super_admin` access without touching Supabase auth — correct and intentional.

---

### Tables Written To

Both tables already exist in MoveOn's Supabase schema (identical structure to Operator OS):

| Table | Operation | Conflict key |
|---|---|---|
| `tasks` | UPSERT | `id` |
| `roadmap_objectives` | UPSERT | `scope, key` |

No schema migrations required.

---

## What Was Added to Operator OS (`tasks.adexra.com`)

For reference — these files live in the `Client Tasks` repo, not the MoveOn repo.

### New File

```
src/lib/moveon-sync.ts
```

Contains three exported functions:

| Function | Purpose |
|---|---|
| `pushTaskToMoveOn(task)` | Fire-and-forget upsert of a single task |
| `deleteTaskOnMoveOn(taskId)` | Fire-and-forget DELETE to MoveOn |
| `fullSyncToMoveOn()` | Batch re-sync of ALL MoveOn-tagged tasks + their objectives (for manual force-sync or first setup) |

**Filter rule:** Only tasks where `projeto` matches `/moveon/i` (case-insensitive) are pushed. A task is linked to MoveOn by naming its sprint like `"Sprint 3 / MoveOn — Bot e Chatwoot"` or any value containing the word "moveon".

### Modified File

```
src/lib/tasks.ts
```

Four functions now call into `moveon-sync.ts` fire-and-forget after their Supabase operation completes:

| Function | Sync call |
|---|---|
| `createTask()` | `pushTaskToMoveOn(created)` |
| `updateTask()` | `pushTaskToMoveOn(data)` (returns full row now) |
| `moveTask()` | `pushTaskToMoveOn(data)` (fetches row after RPC since `move_task` RPC returns void) |
| `deleteTask()` | `deleteTaskOnMoveOn(id)` |

Fire-and-forget means: if MoveOn's API is down, the Operator OS UI never blocks or errors — the push silently fails and logs a warning to the console.

---

## Environment Variables

### On MoveOn Admin (`moveon-admin` Vercel project)

| Variable | Status | Description |
|---|---|---|
| `INTERNAL_API_KEY` | **Already set** (Production + Preview) | Shared secret — must match `VITE_MOVEON_INTERNAL_KEY` on Operator OS |

### On Operator OS (`client-tasks` Vercel project)

| Variable | Status | Description |
|---|---|---|
| `VITE_MOVEON_API_URL` | **Already set** (Production + Preview) | `https://moveon-admin-pi.vercel.app` |
| `VITE_MOVEON_INTERNAL_KEY` | **Already set** (Production + Preview) | Shared secret — must match `INTERNAL_API_KEY` on MoveOn |

Both values are encrypted/sensitive in Vercel. The secret is a 64-character hex string generated with `crypto.randomBytes(32)`.

---

## The One Required Action — Clean Redeploy

The `INTERNAL_API_KEY` env var was added to Vercel **after** the last build. Vercel's build cache is serving the old compiled output, so the env var is not visible to the running Lambda yet.

**What to do:**

1. Go to [Vercel Dashboard → adexras-projects → moveon-admin → Deployments](https://vercel.com/adexras-projects/moveon-admin/deployments)
2. Click the `...` menu on the latest production deployment
3. Select **Redeploy**
4. **Uncheck "Use existing Build Cache"**
5. Confirm

This forces a full `npm install` + `next build` from source, baking in the `INTERNAL_API_KEY` env var at build time.

Alternatively, trigger via CLI:
```bash
# From apps/admin directory with vercel linked
vercel redeploy <latest-deployment-url> --no-cache
```

---

## Testing After Redeploy

Run this `curl` from any terminal. Replace `<KEY>` with the value of `INTERNAL_API_KEY`:

```bash
# Test 1 — Empty push (should return 200 with zeros)
curl -s -X POST https://moveon-admin-pi.vercel.app/api/admin/sync-tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <KEY>" \
  -d '{"tasks": [], "objectives": []}' | jq .

# Expected:
# { "tasks_upserted": 0, "objectives_upserted": 0, "errors": [] }

# Test 2 — No auth (should return 401)
curl -s -X POST https://moveon-admin-pi.vercel.app/api/admin/sync-tasks \
  -H "Content-Type: application/json" \
  -d '{"tasks": []}' | jq .

# Expected:
# { "erro": "Não autorizado" }

# Test 3 — Wrong key (should return 401)
curl -s -X POST https://moveon-admin-pi.vercel.app/api/admin/sync-tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer wrongkey" \
  -d '{"tasks": []}' | jq .

# Expected:
# { "erro": "Não autorizado" }
```

Once Test 1 returns `200`, the sync is fully live. No further action needed — Operator OS will start pushing automatically on the next task save.

---

## Data Flow Diagram

```
Operator OS (tasks.adexra.com)
│
│  User creates / edits / moves / deletes a task
│  where task.projeto contains "moveon"
│
├── createTask()  ──┐
├── updateTask()  ──┤  fire-and-forget
├── moveTask()    ──┤──▶  src/lib/moveon-sync.ts
└── deleteTask()  ──┘         │
                               │  POST /api/admin/sync-tasks
                               │  DELETE /api/admin/sync-tasks?id=<uuid>
                               │  Bearer: INTERNAL_API_KEY
                               ▼
                    MoveOn Admin (moveon-admin-pi.vercel.app)
                               │
                               ├── apps/admin/src/app/api/admin/sync-tasks/route.ts
                               │        │
                               │        ├── requireAdmin()  ← api-auth.ts
                               │        │     checks INTERNAL_API_KEY → super_admin
                               │        │
                               │        └── adminClient()   ← api-auth.ts
                               │              Supabase service role
                               │
                               ▼
                    MoveOn Supabase (separate project)
                    ├── tasks  (upsert on id)
                    └── roadmap_objectives  (upsert on scope,key)
```

---

## File Index — Everything Touched

### `adexra/moveon` repo

| Path | Change |
|---|---|
| `apps/admin/src/app/api/admin/sync-tasks/route.ts` | **New file** — the receiving API endpoint |
| `apps/admin/src/lib/api-auth.ts` | Read-only — `INTERNAL_API_KEY` path was already there |
| `apps/admin/src/lib/tasks.ts` | Read-only — `Task` and `RoadmapObjective` types imported |
| `apps/admin/package.json` | Version bumped `0.1.0 → 0.1.1` (to bust Vercel build cache) |

### `Client Tasks` repo (Operator OS)

| Path | Change |
|---|---|
| `src/lib/moveon-sync.ts` | **New file** — sync client (push, delete, full-sync) |
| `src/lib/tasks.ts` | Modified — `createTask`, `updateTask`, `moveTask`, `deleteTask` now call sync |
| `.env` | Added `VITE_MOVEON_API_URL` and `VITE_MOVEON_INTERNAL_KEY` |
| `docs/PROGRESS_LOG.md` | Updated with session entry |

---

## Questions?

Contact Luan Varela (Adexra). The `INTERNAL_API_KEY` value can be retrieved from the Vercel dashboard under `adexras-projects → moveon-admin → Settings → Environment Variables`.
