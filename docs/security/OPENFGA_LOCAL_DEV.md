# OpenFGA local Docker (memory) — morning recovery

**Related:** [OPENFGA_MEMBERSHIP_BACKFILL.md](./OPENFGA_MEMBERSHIP_BACKFILL.md) · [openfga/authorization-model.fga](./openfga/authorization-model.fga) · [PRODUCTION_READINESS_PLAN.md](./PRODUCTION_READINESS_PLAN.md)

## Why this exists

Local OpenFGA (`openfga-ims-v5`) uses an **in-memory** store. After you stop Docker or shut down the PC:

- store id, model id, and membership tuples are **gone**
- backend + frontend alone are **not** enough when `SECURITY_PROVIDER=auth0-openfga`
- AuthZ **fail-closes** → e.g. “User does not have permission to access the Dashboard”

You must: start OpenFGA → recreate store + model → update `.env` → backfill → restart backend.

**Do not** put store/model ids in `.env.example` (git template). Only in gitignored `.env`.

---

## Prerequisites

- Docker installed
- Container already created once as `openfga-ims-v5` (API on host port **18080**)
- Backend `.env` has `SECURITY_PROVIDER=auth0-openfga` and `OPENFGA_API_URL=http://127.0.0.1:18080`
- Frontend `.env.local` has `VITE_SECURITY_PROVIDER=auth0-openfga` (for Auth0 dual-run)

---

## Full recovery (copy-paste)

### 1. Start OpenFGA

```bash
docker start openfga-ims-v5
curl -s http://127.0.0.1:18080/healthz
```

Expect: `{"status":"SERVING"}`

### 2. Create store

```bash
curl -s -X POST http://127.0.0.1:18080/stores \
  -H 'Content-Type: application/json' \
  -d '{"name":"ims-v5-local"}'
```

Copy the `"id"` from the JSON response (e.g. `01M52…`).

### 3. Write authorization model

```bash
STORE_ID='PASTE_STORE_ID_HERE'
docker run --rm --network host \
  -v /home/mehrab/ims-v5/docs/security/openfga:/model \
  openfga/cli:latest \
  model write \
  --store-id "$STORE_ID" \
  --api-url http://127.0.0.1:18080 \
  --file /model/authorization-model.fga
```

Copy the `"authorization_model_id"` from the response.

### 4. Update backend `.env`

Edit `ims-systems-v5-backend/.env` only:

```env
OPENFGA_API_URL=http://127.0.0.1:18080
OPENFGA_STORE_ID=PASTE_STORE_ID
OPENFGA_MODEL_ID=PASTE_MODEL_ID
OPENFGA_API_TOKEN=
```

### 5. Backfill membership tuples

```bash
cd ~/ims-v5/ims-systems-v5-backend
pnpm backfill:openfga-memberships
```

Expect lines like `OK … → … (Super Admin)` and exit code `0`.  
`SKIP … already present` is also fine (idempotent).

### 6. Restart backend so it reloads `.env`

`tsx watch` does **not** reload env when only `.env` changes.

- Stop and re-run `pnpm dev:backend`, **or**
- With watch already running: `touch src/app/server.ts`

Then hard-refresh the UI (or log out/in once).

---

## Optional: verify Ada can read

```bash
STORE_ID='PASTE_STORE_ID'
MODEL_ID='PASTE_MODEL_ID'
curl -s -X POST "http://127.0.0.1:18080/stores/$STORE_ID/check" \
  -H 'Content-Type: application/json' \
  -d "{\"authorization_model_id\":\"$MODEL_ID\",\"tuple_key\":{\"user\":\"user:100000000000000000000001\",\"relation\":\"can_read\",\"object\":\"organization:000000000000000000000001\"}}"
```

Expect: `{"allowed":true,...}`

---

## First-time container create (only if `docker start` fails)

If the container does not exist yet (adjust if your original `docker run` differed):

```bash
docker run -d --name openfga-ims-v5 \
  -p 18080:8080 \
  openfga/openfga:latest \
  run
```

Then continue from **Create store** above.

---

## Stub mode (no OpenFGA)

If you only want FE + BE without Auth0/OpenFGA:

```env
# backend .env
SECURITY_PROVIDER=development-stub

# frontend .env.local
VITE_SECURITY_PROVIDER=development-stub
```

Restart both apps. Logout stays disabled; no Bearer header — that is expected.

---

## Common mistakes

| Symptom | Cause |
| --- | --- |
| Dashboard / modules 403 after reboot | OpenFGA down or memory wiped |
| Backfill: model `… not found` | `.env` still has old `OPENFGA_MODEL_ID` |
| Still 403 after backfill OK | Backend not restarted after `.env` change |
| Ids in `.env.example` but app fails | App loads `.env`, not the example file |

---

## Production note

Memory OpenFGA is **local lab only**. Staging/prod need a durable store (e.g. Postgres) so ids and tuples survive restarts — see Phase 6 in [PRODUCTION_READINESS_PLAN.md](./PRODUCTION_READINESS_PLAN.md).
