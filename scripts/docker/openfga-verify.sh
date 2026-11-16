#!/usr/bin/env bash
# Verify OpenFGA reachability + store + model (API-token or no-auth).
#
# Reads OPENFGA_API_URL, OPENFGA_STORE_ID, OPENFGA_MODEL_ID, optional OPENFGA_API_TOKEN
# from the environment or from a dotenv file:
#
#   ./scripts/docker/openfga-verify.sh
#   ./scripts/docker/openfga-verify.sh /path/to/.env
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${1:-}"

load_dotenv() {
  local file="$1"
  [[ -f "$file" ]] || return 0
  # shellcheck disable=SC1090
  set -a
  # Only OpenFGA_* lines — avoid sourcing unrelated secrets into the shell broadly
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" =~ ^[[:space:]]*$ ]] && continue
    if [[ "$line" =~ ^OPENFGA_[A-Z0-9_]+= ]]; then
      export "$line"
    fi
  done <"$file"
  set +a
}

if [[ -n "$ENV_FILE" ]]; then
  load_dotenv "$ENV_FILE"
else
  load_dotenv "${ROOT}/.env"
  load_dotenv "${ROOT}/ims-systems-v5-backend/.env"
fi

API_URL="${OPENFGA_API_URL:?Set OPENFGA_API_URL}"
STORE_ID="${OPENFGA_STORE_ID:?Set OPENFGA_STORE_ID}"
MODEL_ID="${OPENFGA_MODEL_ID:?Set OPENFGA_MODEL_ID}"
TOKEN="${OPENFGA_API_TOKEN:-}"

API_URL="${API_URL%/}"

AUTH_ARGS=()
if [[ -n "$TOKEN" ]]; then
  AUTH_ARGS=(-H "Authorization: Bearer ${TOKEN}")
  echo "Auth: Bearer token (OPENFGA_API_TOKEN set)"
else
  echo "Auth: none (local Compose style)"
fi

echo "GET ${API_URL}/stores/${STORE_ID}"
curl -fsS "${AUTH_ARGS[@]}" "${API_URL}/stores/${STORE_ID}" >/dev/null
echo "OK store ${STORE_ID}"

echo "GET ${API_URL}/stores/${STORE_ID}/authorization-models/${MODEL_ID}"
curl -fsS "${AUTH_ARGS[@]}" \
  "${API_URL}/stores/${STORE_ID}/authorization-models/${MODEL_ID}" >/dev/null
echo "OK model ${MODEL_ID}"

echo
echo "OpenFGA verify passed."
