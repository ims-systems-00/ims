# Production OpenFGA — self-hosted + API token

**Decision:** production uses **self-hosted OpenFGA** (free / open source) with a **static API token**, not Auth0 FGA (`api.*.fga.dev`).

**Related:** [OPENFGA_LOCAL_DEV.md](./OPENFGA_LOCAL_DEV.md) · [OPENFGA_MEMBERSHIP_BACKFILL.md](./OPENFGA_MEMBERSHIP_BACKFILL.md) · [DOCKER_COMPOSE.md](../development/DOCKER_COMPOSE.md)

---

## Hosting layout (EC2)

Typical layout under `~/projects/`:

| Directory | Role |
| --- | --- |
| `openfga/` | Shared OpenFGA API (Postgres + token auth) on `ims_network` |
| `ims/` | IMS V5 Compose — `backend` joins `ims_network` |
| `carbon-os/` | Peer stack on the same network |

**Confirmed URL convention for IMS backend containers**

| From | `OPENFGA_API_URL` |
| --- | --- |
| IMS `backend` on `ims_network` | `http://<openfga-service-name>:8080` — usually `http://openfga:8080` if the shared Compose service is named `openfga` |
| Host / SSH debug | Host-mapped port from the openfga stack (ask lead), **not** Auth0 FGA |

Confirm the DNS name:

```bash
./scripts/docker/ensure-ims-network.sh
docker network inspect ims_network --format '{{range .Containers}}{{.Name}} {{.IPv4Address}}{{println}}{{end}}'
```

Use the shared stack’s service/alias name in `OPENFGA_API_URL`. Do **not** use `https://api.eu1.fga.dev`.

Compose OpenFGA inside the IMS project stays on the **private** default network (local/dev). Production authority is the shared `~/projects/openfga` service.

---

## Env shape (production)

Clear **all** Auth0 FGA OAuth fields. If any of `OPENFGA_CLIENT_*` / issuer / audience are set, the backend uses client credentials and **ignores** the API token.

```env
OPENFGA_API_URL=http://openfga:8080
OPENFGA_STORE_ID=<store-id-from-lead>
OPENFGA_MODEL_ID=<model-id>
OPENFGA_CLIENT_ID=
OPENFGA_CLIENT_SECRET=
OPENFGA_API_TOKEN_ISSUER=
OPENFGA_API_AUDIENCE=
OPENFGA_API_TOKEN=<preshared-token-from-lead>
```

| Variable | Required | Notes |
| --- | --- | --- |
| `OPENFGA_API_URL` | yes | Shared OpenFGA base URL on `ims_network` |
| `OPENFGA_STORE_ID` | yes | From lead |
| `OPENFGA_MODEL_ID` | yes | Boot requires it; fetch if lead only gave store + token |
| `OPENFGA_API_TOKEN` | yes (prod) | Bearer token configured on the OpenFGA server |
| Client credential quartet | empty | Must stay empty for API-token mode |

### If you only have store ID + token

```bash
export OPENFGA_API_URL=http://127.0.0.1:<host-port>   # or reach via docker exec
export OPENFGA_STORE_ID=<store-id-from-lead>
export OPENFGA_API_TOKEN=<token-from-lead>
./scripts/docker/openfga-fetch-model-id.sh
```

Paste the printed `OPENFGA_MODEL_ID` into production env. If the store has no model yet, write [`openfga/authorization-model.fga`](./openfga/authorization-model.fga) with the OpenFGA CLI against that store (same file as local bootstrap).

---

## Cutover steps

1. Ensure `ims_network` exists and shared OpenFGA + IMS `backend` are attached.
2. Set production env as above (never commit real token / ids).
3. Verify:

```bash
./scripts/docker/openfga-verify.sh
```

4. Recreate the IMS backend so Compose reloads env (`docker compose up -d --force-recreate backend`).
5. If the store has no membership tuples yet:

```bash
cd ims-systems-v5-backend
pnpm backfill:openfga-memberships
```

6. Smoke-test org-scoped reads as Super Admin and a basic member.

---

## Local / Compose (unchanged)

Keep local no-auth Compose OpenFGA:

```env
OPENFGA_API_URL=http://openfga:8080
OPENFGA_STORE_ID=…   # from ./scripts/docker/openfga-bootstrap.sh
OPENFGA_MODEL_ID=…
OPENFGA_CLIENT_ID=
OPENFGA_CLIENT_SECRET=
OPENFGA_API_TOKEN_ISSUER=
OPENFGA_API_AUDIENCE=
OPENFGA_API_TOKEN=
```

---

## Auth0 FGA (legacy)

`OPENFGA_CLIENT_ID` / `SECRET` / `OPENFGA_API_TOKEN_ISSUER` / `OPENFGA_API_AUDIENCE` remain supported for temporary cloud FGA, but production standard is **self-hosted + `OPENFGA_API_TOKEN`**.
