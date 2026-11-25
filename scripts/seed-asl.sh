#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../ims-systems-v5-backend"
export ORG_ID="${ORG_ID:-65cdfa93b05b1d6e6f4a392c}"
echo "Seeding ASL for ORG_ID=$ORG_ID"
# Prefer explicit local URI if host mongo is up; else use backend .env
if (echo >/dev/tcp/127.0.0.1/27017) >/dev/null 2>&1; then
  export MONGODB_URI="${MONGODB_URI:-mongodb://127.0.0.1:27017/ims_v5_dev?directConnection=true}"
  echo "Using local Mongo at 127.0.0.1:27017"
else
  echo "Local :27017 not open — using MONGODB_URI from backend .env"
fi
pnpm seed:asl
