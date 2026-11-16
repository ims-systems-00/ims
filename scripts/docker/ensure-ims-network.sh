#!/usr/bin/env bash
# Create the shared Docker network used by peer stacks (carbon-os, openfga, …).
# Idempotent — safe to run before every `docker compose up`.
set -euo pipefail

NETWORK_NAME="${IMS_DOCKER_NETWORK:-ims_network}"

if docker network inspect "$NETWORK_NAME" >/dev/null 2>&1; then
  echo "Docker network '$NETWORK_NAME' already exists."
  exit 0
fi

docker network create "$NETWORK_NAME"
echo "Created Docker network '$NETWORK_NAME'."
