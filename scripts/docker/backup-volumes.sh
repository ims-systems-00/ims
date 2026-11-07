#!/usr/bin/env bash
# Backup IMS V5 Docker named volumes to ./backups/ims-v5-<timestamp>/
#
# Safe to run while the stack is up (best effort). For a cold backup, stop first:
#   docker compose stop
#   ./scripts/docker/backup-volumes.sh
#
# Volumes:
#   ims_v5_mongodb_data
#   ims_v5_backend_files
#   ims_v5_onlyoffice_data
#   ims_v5_openfga_pg

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STAMP="$(date +%Y%m%d-%H%M)"
OUT_DIR="${BACKUP_DIR:-${ROOT}/backups/ims-v5-${STAMP}}"
VOLUMES=(
  ims_v5_mongodb_data
  ims_v5_backend_files
  ims_v5_onlyoffice_data
  ims_v5_openfga_pg
)

mkdir -p "$OUT_DIR"
echo "Backing up volumes → ${OUT_DIR}"

for vol in "${VOLUMES[@]}"; do
  if ! docker volume inspect "$vol" >/dev/null 2>&1; then
    echo "skip: volume ${vol} does not exist yet"
    continue
  fi
  archive="${OUT_DIR}/${vol}.tar.gz"
  echo "  ${vol} → $(basename "$archive")"
  docker run --rm \
    -v "${vol}:/data:ro" \
    -v "${OUT_DIR}:/backup" \
    alpine:3.20 \
    tar czf "/backup/$(basename "$archive")" -C /data .
done

cat >"${OUT_DIR}/README.txt" <<EOF
IMS V5 Docker volume backup
Created: $(date -Iseconds)
Host: $(hostname 2>/dev/null || echo unknown)

Restore (stack must be stopped):
  docker compose -p ims-v5 stop
  ./scripts/docker/restore-volumes.sh ${OUT_DIR}
  docker compose -p ims-v5 up -d

WARNING: docker compose down -v deletes these volumes permanently.
EOF

echo
echo "Backup complete: ${OUT_DIR}"
ls -lh "$OUT_DIR"
