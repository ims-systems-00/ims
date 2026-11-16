#!/usr/bin/env bash
# Print the latest authorization model id for a store (API-token or no-auth).
#
#   export OPENFGA_API_URL=http://127.0.0.1:18080
#   export OPENFGA_STORE_ID=01…
#   export OPENFGA_API_TOKEN=…   # optional for local Compose
#   ./scripts/docker/openfga-fetch-model-id.sh
set -euo pipefail

API_URL="${OPENFGA_API_URL:?Set OPENFGA_API_URL}"
STORE_ID="${OPENFGA_STORE_ID:?Set OPENFGA_STORE_ID}"
TOKEN="${OPENFGA_API_TOKEN:-}"

API_URL="${API_URL%/}"
URL="${API_URL}/stores/${STORE_ID}/authorization-models?page_size=1"

AUTH_ARGS=()
if [[ -n "$TOKEN" ]]; then
  AUTH_ARGS=(-H "Authorization: Bearer ${TOKEN}")
fi

BODY="$(curl -fsS "${AUTH_ARGS[@]}" "$URL")"

MODEL_ID="$(
  printf '%s' "$BODY" | python3 -c '
import json, sys
data = json.load(sys.stdin)
models = data.get("authorization_models") or []
if not models:
    sys.stderr.write("No authorization models on this store. Write the model first.\n")
    sys.exit(1)
print(models[0].get("id") or "")
' 2>/dev/null || true
)"

if [[ -z "$MODEL_ID" ]]; then
  # Fallback without python (jq or sed)
  if command -v jq >/dev/null 2>&1; then
    MODEL_ID="$(printf '%s' "$BODY" | jq -r '.authorization_models[0].id // empty')"
  fi
fi

if [[ -z "$MODEL_ID" || "$MODEL_ID" == "null" ]]; then
  echo "Could not parse authorization model id from response:" >&2
  echo "$BODY" >&2
  exit 1
fi

echo "OPENFGA_MODEL_ID=${MODEL_ID}"
