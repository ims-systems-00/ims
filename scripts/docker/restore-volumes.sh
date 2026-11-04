#!/usr/bin/env bash
# Restore IMS V5 Docker named volumes from a backup directory created by
# scripts/docker/backup-volumes.sh
#
# Usage:
#   docker compose -p ims-v5 stop
#   ./scripts/docker/restore-volumes.sh ./backups/ims-v5-YYYYMMDD-HHMM
#   docker compose -p ims-v5 up -d
#
# Existing volume contents are replaced.

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: $0 <backup-dir>" >&2
  exit 1
fi

BACKUP_DIR="$(cd "$1" && pwd)"
VOLUMES=(
  ims_v5_mongodb_data
  ims_v5_backend_files
  ims_v5_onlyoffice_data
  ims_v5_openfga_pg
)

echo "Restoring from ${BACKUP_DIR}"
echo "Ensure the Compose stack is stopped (docker compose stop) before continuing."

for vol in "${VOLUMES[@]}"; do
  archive="${BACKUP_DIR}/${vol}.tar.gz"
  if [[ ! -f "$archive" ]]; then
    echo "skip: missing $(basename "$archive")"
    continue
  fi

  if ! docker volume inspect "$vol" >/dev/null 2>&1; then
    echo "creating volume ${vol}"
    docker volume create "$vol" >/dev/null
  fi

  echo "  restoring ${vol}"
  # Clear then extract so we do not merge stale files with the backup.
  docker run --rm \
    -v "${vol}:/data" \
    alpine:3.20 \
    sh -c 'rm -rf /data/* /data/.[!.]* /data/..?* 2>/dev/null || true'
  docker run --rm \
    -v "${vol}:/data" \
    -v "${BACKUP_DIR}:/backup:ro" \
    alpine:3.20 \
    tar xzf "/backup/$(basename "$archive")" -C /data
done

echo
echo "Restore complete. Start the stack: docker compose -p ims-v5 up -d"
