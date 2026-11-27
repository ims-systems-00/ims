#!/usr/bin/env bash
# shellcheck disable=SC2029,SC2088  # remote-side expansion of ~ is intentional
# iMS Systems V5 — one-command production deploy (laptop → EC2).
#
#   ./deploy.sh backend|frontend|all [--dry-run] [--build-only] [--yes]
#
# Builds the requested app image(s) locally from the CURRENT working tree
# (uncommitted changes included), ships them as gzip'd `docker save` archives
# over SCP (SHA-256 verified), and recreates only the requested Compose
# service(s) on EC2 with automatic health checks and rollback.
#
# Never: copies .env/source/data, edits prod compose/.env, touches mongodb,
# openfga*, onlyoffice, runs migrations, changes git state, or deletes images.
# See DEPLOYMENT.md.

set -Eeuo pipefail
umask 077

# ------------------------------------------------------------------ config
DEPLOY_HOST="${DEPLOY_HOST:-18.134.196.170}"
DEPLOY_USER="${DEPLOY_USER:-ubuntu}"
DEPLOY_SSH_KEY="${DEPLOY_SSH_KEY:-$HOME/.ssh/ims-systems-pem}"
DEPLOY_REMOTE_DIR="${DEPLOY_REMOTE_DIR:-~/projects/ims}"

# Verified production frontend settings (public values baked into the SPA).
# The Auth0 client id is NOT pinned here: it is read from the production .env
# on EC2 and must already be present in the bundle currently serving users.
EXPECTED_VITE_SECURITY_PROVIDER="auth0-openfga"
EXPECTED_VITE_AUTH0_DOMAIN="auth.ims-os.com"
EXPECTED_VITE_AUTH0_AUDIENCE="https://api.ims.v5"
EXPECTED_VITE_API_BASE_URL="/api/v1"
EXPECTED_VITE_ONLYOFFICE_URL="/onlyoffice"

COMPOSE_PROJECT="ims-v5"        # `name:` in docker-compose.yml → image ims-v5-<svc>

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REMOTE_SCRIPT="$ROOT_DIR/scripts/deploy/remote.sh"
LOCK_FILE="${XDG_RUNTIME_DIR:-/tmp}/ims-v5-deploy.lock"
TARGET="$DEPLOY_USER@$DEPLOY_HOST"
SSH_OPTS=(-i "$DEPLOY_SSH_KEY" -o BatchMode=yes -o ConnectTimeout=15
          -o ServerAliveInterval=30 -o ServerAliveCountMax=10
          -o StrictHostKeyChecking=accept-new -o IdentitiesOnly=yes)

# ------------------------------------------------------------------ helpers
ts()   { date '+%F %T%z'; }
log()  { printf '%s [deploy] %s\n' "$(ts)" "$*" >&2; }
step() { printf '\n%s [deploy] ===== %s\n' "$(ts)" "$*" >&2; }
warn() { log "WARN: $*"; }
die()  { log "ERROR: $*"; exit 1; }

usage() {
  cat <<'EOF'
Usage: ./deploy.sh <backend|frontend|all> [options]

Options
  --dry-run     Read-only: local checks + SSH preflight + prod config validation.
                No build, no transfer, nothing changed on EC2.
  --build-only  Build + verify image(s) locally (with prod frontend values).
                No transfer, nothing changed on EC2.
  --yes, -y     Skip the interactive confirmation prompt.
  -h, --help    Show this help.

Environment overrides (defaults = production)
  DEPLOY_HOST, DEPLOY_USER, DEPLOY_SSH_KEY, DEPLOY_REMOTE_DIR
EOF
}

remote() { # run a remote.sh mode streamed over stdin
  local q; q="$(printf '%q ' "$@")"
  ssh "${SSH_OPTS[@]}" "$TARGET" "bash -s -- $q" <"$REMOTE_SCRIPT"
}

# ------------------------------------------------------------------ args
MODE="" DRY_RUN=0 BUILD_ONLY=0 ASSUME_YES=0
for arg in "$@"; do
  case "$arg" in
    backend|frontend|all) [[ -z "$MODE" ]] || die "only one target allowed"; MODE="$arg" ;;
    --dry-run) DRY_RUN=1 ;;
    --build-only) BUILD_ONLY=1 ;;
    --yes|-y) ASSUME_YES=1 ;;
    -h|--help) usage; exit 0 ;;
    *) usage >&2; die "unknown argument: $arg" ;;
  esac
done
[[ -n "$MODE" ]] || { usage >&2; exit 2; }
(( DRY_RUN + BUILD_ONLY <= 1 )) || die "--dry-run and --build-only are mutually exclusive"

case "$MODE" in
  all) SERVICES=(backend frontend) ;;   # backend first, verified, then frontend
  *)   SERVICES=("$MODE") ;;
esac
needs_frontend() { [[ " ${SERVICES[*]} " == *" frontend "* ]]; }

# ------------------------------------------------------------------ lock
exec 8>"$LOCK_FILE"
flock -n 8 || die "another ./deploy.sh is already running (lock: $LOCK_FILE)"

TAG="deploy-$(date -u +%Y%m%d-%H%M%S)"
WORK_DIR=""
REMOTE_STAGE=".ims-deploy/staging/$TAG"   # relative to remote $HOME
SUCCESS=0
REMOTE_STARTED=0

on_exit() {
  local rc=$?
  if [[ -n "$WORK_DIR" && -d "$WORK_DIR" ]]; then
    if (( SUCCESS )) || (( REMOTE_STARTED == 0 )); then
      rm -rf -- "$WORK_DIR"
    else
      log "local archives kept for inspection: $WORK_DIR"
    fi
  fi
  (( rc == 0 )) || log "exit code $rc"
}
trap on_exit EXIT
trap 'die "interrupted"' INT TERM

# ------------------------------------------------------------------ local checks
step "Deploy $MODE → $TARGET:$DEPLOY_REMOTE_DIR  (tag $TAG)"
(( DRY_RUN )) && log "DRY RUN — nothing will be built, transferred or changed"
(( BUILD_ONLY )) && log "BUILD ONLY — nothing will be transferred or changed on EC2"

for bin in docker ssh scp gzip sha256sum flock git; do
  command -v "$bin" >/dev/null || die "missing required tool: $bin"
done
docker compose version >/dev/null 2>&1 || die "docker compose plugin missing"
docker info >/dev/null 2>&1 || die "docker daemon not reachable"
[[ -f "$ROOT_DIR/docker-compose.yml" ]] || die "docker-compose.yml not found in $ROOT_DIR"
[[ -f "$REMOTE_SCRIPT" ]] || die "missing $REMOTE_SCRIPT"
[[ -r "$DEPLOY_SSH_KEY" ]] || die "SSH key not readable: $DEPLOY_SSH_KEY"
grep -qE "^name:[[:space:]]*${COMPOSE_PROJECT}[[:space:]]*$" "$ROOT_DIR/docker-compose.yml" \
  || die "docker-compose.yml project name is not '$COMPOSE_PROJECT'"
grep -qE "VITE_API_BASE_URL:[[:space:]]*${EXPECTED_VITE_API_BASE_URL}[[:space:]]*$" "$ROOT_DIR/docker-compose.yml" \
  || die "docker-compose.yml frontend VITE_API_BASE_URL is not $EXPECTED_VITE_API_BASE_URL"
bash -n "$REMOTE_SCRIPT" || die "syntax error in $REMOTE_SCRIPT"

cd "$ROOT_DIR"
# Git is only read, never changed.
GIT_REF="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
DIRTY_COUNT="$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
if (( DIRTY_COUNT > 0 )); then
  GIT_REF="$GIT_REF+dirty"
  log "working tree has $DIRTY_COUNT uncommitted change(s) — they WILL be included in the build"
fi
log "source: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')@$GIT_REF"

# ------------------------------------------------------------------ remote preflight
step "SSH preflight (read-only)"
PREFLIGHT_OUT="$(remote preflight "$DEPLOY_REMOTE_DIR" "${SERVICES[@]}")" \
  || die "remote preflight failed — nothing was built or changed"
for svc in "${SERVICES[@]}"; do
  ref="$(grep -E "^IMAGE_${svc}=" <<<"$PREFLIGHT_OUT" | cut -d= -f2-)"
  [[ "$ref" == "$COMPOSE_PROJECT-$svc:latest" ]] \
    || die "prod compose image for $svc is '$ref', expected '$COMPOSE_PROJECT-$svc:latest'"
done
log "remote compose images match local naming ($COMPOSE_PROJECT-<svc>:latest)"

# ------------------------------------------------------------------ prod frontend build values
declare -A VITE=()
if needs_frontend; then
  step "Production frontend build values (from EC2 .env, read-only)"
  VITE_OUT="$(remote vite-env "$DEPLOY_REMOTE_DIR")" || die "could not read production VITE_* values"
  while IFS='=' read -r k v; do
    [[ "$k" =~ ^(VITE_[A-Z0-9_]+|CLIENT_ID_IN_RUNNING_BUNDLE)$ ]] && VITE["$k"]="$v"
  done <<<"$VITE_OUT"

  [[ -n "${VITE[VITE_ONLYOFFICE_URL]:-}" ]] || VITE[VITE_ONLYOFFICE_URL]="$EXPECTED_VITE_ONLYOFFICE_URL"
  VITE[VITE_API_BASE_URL]="$EXPECTED_VITE_API_BASE_URL"

  check_eq() { [[ "${VITE[$1]:-}" == "$2" ]] || die "prod $1 is '${VITE[$1]:-<unset>}', expected '$2' — refusing to build"; }
  check_eq VITE_SECURITY_PROVIDER "$EXPECTED_VITE_SECURITY_PROVIDER"
  check_eq VITE_AUTH0_DOMAIN      "$EXPECTED_VITE_AUTH0_DOMAIN"
  check_eq VITE_AUTH0_AUDIENCE    "$EXPECTED_VITE_AUTH0_AUDIENCE"
  check_eq VITE_ONLYOFFICE_URL    "$EXPECTED_VITE_ONLYOFFICE_URL"
  [[ "${VITE[VITE_AUTH0_CLIENT_ID]:-}" =~ ^[A-Za-z0-9_-]{16,64}$ ]] \
    || die "prod VITE_AUTH0_CLIENT_ID missing or malformed"
  if [[ "${VITE[CLIENT_ID_IN_RUNNING_BUNDLE]:-}" != "yes" ]]; then
    if [[ "${DEPLOY_ALLOW_UNVERIFIED_CLIENT_ID:-}" == "1" ]]; then
      warn "client id NOT found in the running frontend bundle; continuing because DEPLOY_ALLOW_UNVERIFIED_CLIENT_ID=1"
    else
      die "prod .env VITE_AUTH0_CLIENT_ID is not the one in the frontend currently serving users — refusing (see DEPLOYMENT.md)"
    fi
  else
    log "Auth0 client id verified against the live frontend bundle"
  fi
  log "provider=${VITE[VITE_SECURITY_PROVIDER]} domain=${VITE[VITE_AUTH0_DOMAIN]} audience=${VITE[VITE_AUTH0_AUDIENCE]} api=${VITE[VITE_API_BASE_URL]} onlyoffice=${VITE[VITE_ONLYOFFICE_URL]} client_id=${VITE[VITE_AUTH0_CLIENT_ID]:0:4}…"
fi

if (( DRY_RUN )); then
  step "DRY RUN complete — plan"
  log "would build: ${SERVICES[*]} (docker compose build <svc>, cached, local .env ignored)"
  log "would tag:   $COMPOSE_PROJECT-<svc>:$TAG, ship via scp to ~/$REMOTE_STAGE, verify SHA-256"
  for svc in "${SERVICES[@]}"; do
    log "would run:   docker compose up -d --no-deps --no-build --pull never $svc   (+ health checks, auto-rollback)"
  done
  exit 0
fi

if (( ! BUILD_ONLY && ! ASSUME_YES )); then
  [[ -t 0 ]] || die "not a terminal; pass --yes to confirm a production deploy"
  printf '\nDeploy %s (%s) to PRODUCTION app.ims-os.com? Type "deploy" to continue: ' "${SERVICES[*]}" "$GIT_REF" >&2
  read -r answer
  [[ "$answer" == "deploy" ]] || die "aborted by user"
fi

# ------------------------------------------------------------------ build
WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/ims-deploy.XXXXXX")"
: >"$WORK_DIR/build.env"
if needs_frontend; then
  for k in VITE_SECURITY_PROVIDER VITE_AUTH0_DOMAIN VITE_AUTH0_CLIENT_ID VITE_AUTH0_AUDIENCE VITE_AUTH0_ORGANIZATION_ID VITE_ONLYOFFICE_URL; do
    printf '%s=%s\n' "$k" "${VITE[$k]:-}" >>"$WORK_DIR/build.env"
  done
fi

build_service() {
  local svc="$1"
  # Isolated env: the local .env is NOT used (--env-file points at a file
  # holding only the production VITE_* values) and any VITE_*/COMPOSE_*
  # variables exported in this shell are dropped first.
  (
    while read -r v; do unset "$v"; done < <(compgen -e | grep -E '^(VITE_|COMPOSE_)' || true)
    if [[ "$svc" == frontend ]]; then
      for k in VITE_SECURITY_PROVIDER VITE_AUTH0_DOMAIN VITE_AUTH0_CLIENT_ID VITE_AUTH0_AUDIENCE VITE_AUTH0_ORGANIZATION_ID VITE_ONLYOFFICE_URL; do
        export "$k=${VITE[$k]:-}"
      done
    fi
    docker compose --project-directory "$ROOT_DIR" -f "$ROOT_DIR/docker-compose.yml" \
      --env-file "$WORK_DIR/build.env" build "$svc"
  )
}

verify_image() {
  local svc="$1" img="$2" found
  # No data dumps / env files may ship inside the image.
  found="$(docker run --rm --network none --entrypoint sh "$img" -c \
    'find /app /usr/share/nginx/html \( -name node_modules -prune \) -o \( -name "*.bson" -o -name ".env" -o -name ".env.*" -o -name "*.pem" \) -print 2>/dev/null | head -n 5' || true)"
  [[ -z "$found" ]] || die "$svc image contains forbidden files: $found"
  if [[ "$svc" == frontend ]]; then
    docker run --rm --network none --entrypoint sh "$img" -c \
      'grep -rqF -- "$1" /usr/share/nginx/html/assets && grep -rqF -- "$2" /usr/share/nginx/html/assets && grep -rqF -- "$3" /usr/share/nginx/html/assets' \
      sh "${VITE[VITE_AUTH0_CLIENT_ID]}" "${VITE[VITE_AUTH0_DOMAIN]}" "${VITE[VITE_AUTH0_AUDIENCE]}" \
      || die "built frontend bundle does not contain the production Auth0 client id/domain/audience"
    log "frontend bundle contains production Auth0 client id, domain and audience"
  fi
}

declare -A IMAGE_ID=()
for svc in "${SERVICES[@]}"; do
  step "Build $svc (local working tree, cached)"
  build_service "$svc" || die "build failed for $svc — nothing deployed"
  img="$COMPOSE_PROJECT-$svc:latest"
  docker image inspect "$img" >/dev/null 2>&1 || die "expected image $img not found after build"
  docker tag "$img" "$COMPOSE_PROJECT-$svc:$TAG"
  IMAGE_ID[$svc]="$(docker image inspect -f '{{.Id}}' "$COMPOSE_PROJECT-$svc:$TAG")"
  verify_image "$svc" "$COMPOSE_PROJECT-$svc:$TAG"
  log "$svc built: $COMPOSE_PROJECT-$svc:$TAG (${IMAGE_ID[$svc]:0:19})"
done

if (( BUILD_ONLY )); then
  step "BUILD ONLY complete"
  for svc in "${SERVICES[@]}"; do log "$COMPOSE_PROJECT-$svc:$TAG ${IMAGE_ID[$svc]}"; done
  SUCCESS=1; exit 0
fi

# ------------------------------------------------------------------ export
step "Export + compress"
for svc in "${SERVICES[@]}"; do
  out="$WORK_DIR/ims-v5-$svc-$TAG.tar.gz"
  docker save "$COMPOSE_PROJECT-$svc:$TAG" | gzip -6 >"$out"
  gzip -t "$out" || die "archive corrupt: $out"
  log "$svc archive: $(du -h "$out" | cut -f1)"
done
cp "$REMOTE_SCRIPT" "$WORK_DIR/remote.sh"
( cd "$WORK_DIR" && sha256sum ims-v5-*-"$TAG".tar.gz remote.sh >SHA256SUMS )

# ------------------------------------------------------------------ transfer
step "Transfer to EC2"
ssh "${SSH_OPTS[@]}" "$TARGET" "mkdir -p ~/$REMOTE_STAGE && chmod 700 ~/.ims-deploy ~/$REMOTE_STAGE" \
  || die "could not create remote staging dir"
REMOTE_STARTED=1
scp -q "${SSH_OPTS[@]}" "$WORK_DIR"/ims-v5-*-"$TAG".tar.gz "$WORK_DIR/remote.sh" "$WORK_DIR/SHA256SUMS" \
  "$TARGET:$REMOTE_STAGE/" || die "scp failed — nothing deployed (remote staging: ~/$REMOTE_STAGE)"
ssh "${SSH_OPTS[@]}" "$TARGET" "cd ~/$REMOTE_STAGE && sha256sum --quiet -c SHA256SUMS" \
  || die "SHA-256 mismatch after transfer — nothing deployed"
log "transfer verified (SHA-256)"

# ------------------------------------------------------------------ deploy
step "Deploy on EC2 (${SERVICES[*]})"
trap 'warn "interrupted locally — the remote deployment keeps running; check ~/.ims-deploy/logs/$TAG.log on EC2"; exit 130' INT TERM
pairs=()
for svc in "${SERVICES[@]}"; do pairs+=("$svc=${IMAGE_ID[$svc]}"); done
q="$(printf '%q ' deploy-detached "$DEPLOY_REMOTE_DIR" "$TAG" "~/$REMOTE_STAGE" "$GIT_REF" "${pairs[@]}")"
set +e
ssh "${SSH_OPTS[@]}" "$TARGET" "bash ~/$REMOTE_STAGE/remote.sh $q"
rc=$?
set -e

case "$rc" in
  0)
    step "Cleanup"
    remote cleanup "~/$REMOTE_STAGE" || warn "remote cleanup failed (~/$REMOTE_STAGE)"
    SUCCESS=1
    step "SUCCESS: deployed ${SERVICES[*]} as $TAG ($GIT_REF)"
    log "previous image(s) kept as $COMPOSE_PROJECT-<svc>:rollback-${TAG#deploy-} on EC2"
    log "remote log: ~/.ims-deploy/logs/$TAG.log"
    ;;
  10)
    step "FAILED — ROLLBACK SUCCEEDED"
    log "the failing service was restored to its previous image and is healthy"
    log "services listed as 'DEPLOYED OK' earlier in this run (e.g. backend in 'all') stay deployed"
    log "details: ~/.ims-deploy/logs/$TAG.log on EC2; staging kept at ~/$REMOTE_STAGE"
    exit 10 ;;
  20)
    step "FAILED — ROLLBACK FAILED: MANUAL ACTION REQUIRED"
    log "see ~/.ims-deploy/logs/$TAG.log on EC2 and DEPLOYMENT.md § Manual rollback"
    exit 20 ;;
  255)
    step "SSH CONNECTION LOST"
    log "the deployment continues on EC2 detached; check: ssh … 'tail -f ~/.ims-deploy/logs/$TAG.log; cat ~/.ims-deploy/logs/$TAG.rc'"
    exit 255 ;;
  *)
    step "FAILED (exit $rc) — the failing service was NOT changed"
    log "services listed as 'DEPLOYED OK' earlier in this run stay deployed"
    log "details: ~/.ims-deploy/logs/$TAG.log on EC2"
    exit "$rc" ;;
esac
