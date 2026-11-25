#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../ims-systems-v5-backend"
# Default ORG = Blue Manufacturing (active local Docker tenant that hits training).
export ORG_ID="${ORG_ID:-65cdfa93b05b1d6e6f4a392c}"
echo "Seeding Training for ORG_ID=$ORG_ID"
# Prefer the same local Mongo the Docker backend uses (host.docker.internal → host :27017).
# Pass MONGODB_URI explicitly to avoid seeding Atlas from backend .env by accident.
if (echo >/dev/tcp/127.0.0.1/27017) >/dev/null 2>&1; then
  export MONGODB_URI="${MONGODB_URI:-mongodb://127.0.0.1:27017/ims_v5_dev?directConnection=true}"
  echo "Using local Mongo at 127.0.0.1:27017"
else
  echo "Local :27017 not open — using MONGODB_URI from environment / backend .env"
fi
pnpm seed:training
