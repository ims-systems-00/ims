#!/usr/bin/env bash
# Create (or reuse) a durable OpenFGA store + authorization model for IMS V5.
#
# Prerequisites: `docker compose up -d` so openfga is healthy on :18080
# (Postgres-backed — store/model/tuples survive restart; no daily recreate).
#
# Usage (from repo root):
#   ./scripts/docker/openfga-bootstrap.sh
#
# Prints OPENFGA_STORE_ID / OPENFGA_MODEL_ID for backend .env (or Compose .env).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MODEL_DIR="${ROOT}/docs/security/openfga"
MODEL_FILE="${MODEL_DIR}/authorization-model.fga"
STORE_NAME="${OPENFGA_STORE_NAME:-ims-v5}"
API_URL="${OPENFGA_BOOTSTRAP_API_URL:-http://127.0.0.1:18080}"
COMPOSE_API_URL="${OPENFGA_COMPOSE_API_URL:-http://openfga:8080}"
COMPOSE_PROJECT="${COMPOSE_PROJECT_NAME:-ims-v5}"

json_field() {
  local field="$1"
  node -e '
    const field = process.argv[1];
    let raw = "";
    process.stdin.on("data", (c) => (raw += c));
    process.stdin.on("end", () => {
      const data = JSON.parse(raw || "{}");
      const parts = field.split(".");
      let cur = data;
      for (const p of parts) {
        if (cur == null) { process.exit(2); }
        cur = cur[p];
      }
      if (cur == null || cur === "") process.exit(2);
      process.stdout.write(String(cur));
    });
  ' "$field"
}

find_store_id() {
  local name="$1"
  node -e '
    const name = process.argv[1];
    let raw = "";
    process.stdin.on("data", (c) => (raw += c));
    process.stdin.on("end", () => {
      const data = JSON.parse(raw || "{}");
      const hit = (data.stores || []).find((s) => s.name === name);
      if (hit?.id) process.stdout.write(hit.id);
    });
  ' "$name"
}

if [[ ! -f "$MODEL_FILE" ]]; then
  echo "error: model not found at $MODEL_FILE" >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "error: node is required to parse OpenFGA JSON responses" >&2
  exit 1
fi

echo "Waiting for OpenFGA at ${API_URL}/healthz …"
ready=0
for _ in $(seq 1 60); do
  if curl -sf "${API_URL}/healthz" >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done
if [[ "$ready" -ne 1 ]]; then
  echo "error: OpenFGA not ready at ${API_URL}. Run: docker compose up -d openfga" >&2
  exit 1
fi

echo "Looking for store named '${STORE_NAME}' …"
STORES_JSON="$(curl -sf "${API_URL}/stores")"
STORE_ID="$(printf '%s' "$STORES_JSON" | find_store_id "$STORE_NAME" || true)"

if [[ -z "${STORE_ID}" ]]; then
  echo "Creating store '${STORE_NAME}' …"
  CREATE_JSON="$(
    curl -sf -X POST "${API_URL}/stores" \
      -H 'Content-Type: application/json' \
      -d "{\"name\":\"${STORE_NAME}\"}"
  )"
  STORE_ID="$(printf '%s' "$CREATE_JSON" | json_field id)"
  echo "Created store id=${STORE_ID}"
else
  echo "Reusing existing store id=${STORE_ID}"
fi

echo "Writing authorization model …"
# CLI on the Compose network; bind-mount model (docs/ is dockerignored from builds).
NETWORK="${COMPOSE_PROJECT}_default"
if ! docker network inspect "$NETWORK" >/dev/null 2>&1; then
  # Fallback: attach to whatever network the openfga container uses.
  OO_CID="$(docker compose -p "$COMPOSE_PROJECT" ps -q openfga 2>/dev/null || true)"
  if [[ -n "$OO_CID" ]]; then
    NETWORK="$(docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}' "$OO_CID" | awk '{print $1}')"
  fi
fi

MODEL_OUT="$(
  docker run --rm \
    --network "$NETWORK" \
    -v "${MODEL_DIR}:/model:ro" \
    openfga/cli:latest \
    model write \
    --store-id "$STORE_ID" \
    --api-url "$COMPOSE_API_URL" \
    --file /model/authorization-model.fga
)"
echo "$MODEL_OUT"

MODEL_ID="$(printf '%s' "$MODEL_OUT" | json_field authorization_model_id 2>/dev/null \
  || printf '%s' "$MODEL_OUT" | json_field id)"

echo
echo "=== OpenFGA bootstrap complete (Postgres-durable) ==="
echo "Add these to ims-systems-v5-backend/.env (host-run backend) or repo-root .env (Compose):"
echo
echo "OPENFGA_API_URL=http://127.0.0.1:18080"
echo "OPENFGA_STORE_ID=${STORE_ID}"
echo "OPENFGA_MODEL_ID=${MODEL_ID}"
echo "OPENFGA_API_TOKEN="
echo
echo "For backend inside Compose, use OPENFGA_API_URL=http://openfga:8080 instead."
echo "Then run membership backfill against this stack."
