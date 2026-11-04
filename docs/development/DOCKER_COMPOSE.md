# Docker Compose — full V5 local stack

One command starts MongoDB, backend, frontend, OnlyOffice, and durable OpenFGA (Postgres).

**Related:** [OPENFGA_LOCAL_DEV.md](../security/OPENFGA_LOCAL_DEV.md) · [`.env.docker.example`](../../.env.docker.example)

## Quick start (stub demo)

```bash
docker compose up -d --build
```

| Service | URL |
| --- | --- |
| **App** | **http://localhost:7864** |
| Backend health | http://localhost:3001/api/v1/health |
| OnlyOffice | http://localhost:8088 |
| OpenFGA | http://localhost:18080 |

**Not** http://localhost:3000 — that is host Vite only (`pnpm dev:frontend`).

Default security is **`development-stub`** (demo user). OpenFGA still runs so you can switch to Auth0 without a memory wipe.

```bash
docker compose down          # volumes kept
# NEVER: docker compose down -v
```

---

## Auth0 + OpenFGA in Docker (prod-like local)

Yes — this is supported. Stub was only the safe default. Use Auth0 in Compose before prod.

### 1. Create Compose env

```bash
cp .env.docker.example .env
```

Copy Auth0 values from:

- `ims-systems-v5-backend/.env` → `AUTH0_*`, secrets
- `ims-systems-v5-frontend/.env.local` → `VITE_AUTH0_*`

### 2. Start infra + bootstrap OpenFGA

```bash
docker compose up -d mongodb openfga-db openfga-migrate openfga
./scripts/docker/openfga-bootstrap.sh
```

Paste printed `OPENFGA_STORE_ID` / `OPENFGA_MODEL_ID` into `.env`.  
Keep `OPENFGA_API_URL=http://openfga:8080` for the backend container.

### 3. Enable Auth0 mode in `.env`

```env
SECURITY_PROVIDER=auth0-openfga
VITE_SECURITY_PROVIDER=auth0-openfga
# AUTH0_* and VITE_AUTH0_* already filled
# OPENFGA_STORE_ID / OPENFGA_MODEL_ID from bootstrap
```

### 4. Mongo: Compose empty DB vs your real host DB

| Choice | `.env` |
| --- | --- |
| Fresh Compose Mongo | `MONGODB_URI=mongodb://mongodb:27017/ims_v5` |
| Existing host data (same as pnpm) | `MONGODB_URI=mongodb://host.docker.internal:27017/ims_v5_dev` |

Host Mongo must be listening (your local mongod). Backend already has `host.docker.internal`.

### 5. Auth0 Dashboard URLs

Add Compose origin alongside Vite:

- Callback: `http://localhost:7864`, `http://localhost:3000`
- Logout: same
- Web origins: same

### 6. Rebuild and start

```bash
docker compose up -d --build
```

Frontend **must** rebuild when `VITE_*` changes (Vite bakes them at build time).

### 7. Backfill OpenFGA memberships

Against the same Mongo the container uses:

```bash
# If using host Mongo + host Node (typical):
cd ims-systems-v5-backend
# .env: SECURITY_PROVIDER=auth0-openfga
#       OPENFGA_API_URL=http://127.0.0.1:18080
#       OPENFGA_STORE_ID / MODEL_ID matching Compose bootstrap
pnpm backfill:openfga-memberships
```

Then open **http://localhost:7864** and log in with Auth0.

---

## Named volumes

| Volume | Contents |
| --- | --- |
| `ims_v5_mongodb_data` | Compose Mongo (not used if you point at host Mongo) |
| `ims_v5_backend_files` | Local uploads |
| `ims_v5_onlyoffice_data` | OnlyOffice |
| `ims_v5_openfga_pg` | OpenFGA store/model/tuples (survives reboot) |

```bash
./scripts/docker/backup-volumes.sh
./scripts/docker/restore-volumes.sh ./backups/ims-v5-YYYYMMDD-HHMM
```

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Stub user on :7864 | `.env` still stub, or frontend image not rebuilt with Auth0 `VITE_*` |
| Backend unhealthy | `docker compose logs backend --tail 100` — often missing `OPENFGA_STORE_ID` / Auth0 vars |
| Port 27017 in use | Mongo is internal-only; host mongod can keep :27017 |
| Auth0 callback error | Add `http://localhost:7864` in Auth0 Application URLs |
| Empty org after Auth0 login | Wrong Mongo URI, or membership backfill not run |
