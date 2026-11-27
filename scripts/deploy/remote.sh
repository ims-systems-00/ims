#!/usr/bin/env bash
# shellcheck disable=SC2088  # literal ~ from the client is expanded here on purpose
# Remote half of ./deploy.sh — runs ON the production EC2 host.
#
# deploy.sh streams it over SSH for read-only modes
#   ssh host "bash -s -- <mode> <args…>" < scripts/deploy/remote.sh
# and uploads it into the per-deployment staging dir (checksummed, removed by
# cleanup) for the deploy itself, so the server always runs the version from
# the current working tree.
#
# Modes
#   preflight  <project_dir> <svc…>                   read-only checks
#   vite-env   <project_dir>                          print prod VITE_* build values (stdout)
#   deploy-detached <project_dir> <tag> <stage_dir> <git_ref> <svc=image_id…>
#              runs `deploy` detached (survives SSH drop) and tails its log;
#              log kept at ~/.ims-deploy/logs/<tag>.log
#   deploy     <project_dir> <tag> <stage_dir> <git_ref> <svc=image_id…>
#   cleanup    <stage_dir>                            remove uploaded archives
#
# Exit codes (deploy)
#   0  all requested services deployed and healthy
#   10 a service failed health checks and was rolled back successfully
#   20 a service failed and ROLLBACK ALSO FAILED (manual action required)
#   1  failed before any running container was touched
#
# Safety rules enforced here:
#   * only `docker compose up -d --no-deps --no-build --pull never <svc>`
#   * never `down`, never unrestricted `up`, never touches mongodb/openfga*/onlyoffice
#   * never edits docker-compose.yml or .env; never prints env values
#   * never deletes images (previous image kept under a rollback tag)

set -Eeuo pipefail
umask 077

STATE_DIR="$HOME/.ims-deploy"
LOCK_FILE="$STATE_DIR/deploy.lock"
HISTORY_LOG="$STATE_DIR/history.log"
STAGING_ROOT="$STATE_DIR/staging"

# Overridable only for mock testing; production uses the defaults.
BACKEND_HEALTH_URL="${BACKEND_HEALTH_URL:-http://127.0.0.1:3001/api/v1/health}"
FRONTEND_URL="${FRONTEND_URL:-http://127.0.0.1:7864/}"
FRONTEND_PROXY_HEALTH_URL="${FRONTEND_PROXY_HEALTH_URL:-http://127.0.0.1:7864/api/v1/health}"
BACKEND_HEALTH_TIMEOUT="${BACKEND_HEALTH_TIMEOUT:-240}"
FRONTEND_START_TIMEOUT="${FRONTEND_START_TIMEOUT:-60}"
STABILITY_WAIT="${STABILITY_WAIT:-15}"
MIN_FREE_GB="${MIN_FREE_GB:-3}"

ALLOWED_SERVICES="backend frontend"

log()  { printf '%s [remote] %s\n' "$(date '+%F %T%z')" "$*" >&2; }
warn() { log "WARN: $*"; }
die()  { log "ERROR: $*"; exit 1; }

expand_home() { local p="$1"; [[ "$p" == "~/"* ]] && p="$HOME/${p#\~/}"; [[ "$p" == "~" ]] && p="$HOME"; printf '%s' "$p"; }

valid_service() { [[ " $ALLOWED_SERVICES " == *" $1 "* ]]; }

cd_project() {
  PROJECT_DIR="$(expand_home "$1")"
  [[ -d "$PROJECT_DIR" ]] || die "project dir not found: $PROJECT_DIR"
  [[ -f "$PROJECT_DIR/docker-compose.yml" ]] || die "no docker-compose.yml in $PROJECT_DIR"
  [[ -f "$PROJECT_DIR/.env" ]] || die "no production .env in $PROJECT_DIR"
  cd "$PROJECT_DIR"
}

dc() { docker compose "$@"; }

# Image reference Compose uses for a service, e.g. "ims-v5-backend:latest".
compose_image_ref() {
  local svc="$1" ref
  ref="$(dc config --images "$svc" 2>/dev/null | head -n1)"
  [[ -n "$ref" ]] || die "compose has no image for service '$svc'"
  [[ "$ref" == *:* ]] || ref="$ref:latest"
  printf '%s' "$ref"
}

container_id() { dc ps -a -q "$1" 2>/dev/null | head -n1; }

inspect() { docker inspect -f "$2" "$1" 2>/dev/null || true; }

# Read KEY from production .env without sourcing it (no code execution).
env_value() {
  local key="$1" line
  line="$(grep -E "^[[:space:]]*(export[[:space:]]+)?${key}=" .env | tail -n1 || true)"
  [[ -n "$line" ]] || return 0
  line="${line#*=}"
  line="${line%$'\r'}"
  if [[ "$line" =~ ^\"(.*)\"$ ]] || [[ "$line" =~ ^\'(.*)\'$ ]]; then line="${BASH_REMATCH[1]}"; fi
  printf '%s' "$line"
}

record() { mkdir -p "$STATE_DIR"; printf '%s\t%s\n' "$(date -u '+%FT%TZ')" "$*" >> "$HISTORY_LOG"; }

http_ok() { curl -fsS -o /dev/null -m 10 "$1" 2>/dev/null; }

retry_http() { # url attempts
  local i
  for ((i = 1; i <= $2; i++)); do http_ok "$1" && return 0; sleep 3; done
  return 1
}

# ---------------------------------------------------------------- preflight
mode_preflight() {
  local dir="$1"; shift
  command -v docker >/dev/null || die "docker not installed"
  docker compose version >/dev/null 2>&1 || die "docker compose plugin missing"
  command -v curl >/dev/null || die "curl missing"
  command -v sha256sum >/dev/null || die "sha256sum missing"
  command -v flock >/dev/null || die "flock missing"
  cd_project "$dir"

  mkdir -p "$STATE_DIR"
  exec 9>"$LOCK_FILE"
  flock -n 9 || die "another deployment holds $LOCK_FILE"
  flock -u 9

  local free_gb
  free_gb="$(df -BG --output=avail / | tail -n1 | tr -dc '0-9')"
  (( free_gb >= MIN_FREE_GB )) || die "only ${free_gb}G free on / (need >= ${MIN_FREE_GB}G)"
  log "disk free: ${free_gb}G"

  local svc ref cid
  for svc in "$@"; do
    valid_service "$svc" || die "invalid service: $svc"
    ref="$(compose_image_ref "$svc")"
    cid="$(container_id "$svc")"
    if [[ -n "$cid" ]]; then
      log "$svc: compose image $ref; running image $(inspect "$cid" '{{.Image}}' | cut -c1-19) ($(inspect "$cid" '{{.State.Status}}'))"
    else
      warn "$svc: no existing container — rollback will rely on the $ref tag if present"
    fi
    printf 'IMAGE_%s=%s\n' "$svc" "$ref"
  done
  log "preflight OK"
}

# ---------------------------------------------------------------- vite-env
# Prints the production frontend build values (KEY=VALUE, stdout only).
# These are public SPA settings baked into the JS bundle, not secrets.
mode_vite_env() {
  cd_project "$1"
  local k v
  for k in VITE_SECURITY_PROVIDER VITE_AUTH0_DOMAIN VITE_AUTH0_CLIENT_ID VITE_AUTH0_AUDIENCE VITE_AUTH0_ORGANIZATION_ID VITE_ONLYOFFICE_URL; do
    v="$(env_value "$k")"
    [[ "$v" != *$'\n'* ]] || die "multi-line value for $k"
    printf '%s=%s\n' "$k" "$v"
  done
  # Cross-check: the client id in prod .env must already be baked into the
  # frontend that is serving users right now (i.e. it is the verified value).
  local cid client
  client="$(env_value VITE_AUTH0_CLIENT_ID)"
  cid="$(container_id frontend)"
  if [[ -n "$cid" && -n "$client" && "$(inspect "$cid" '{{.State.Running}}')" == "true" ]] \
     && docker exec "$cid" grep -rqF -- "$client" /usr/share/nginx/html/assets 2>/dev/null; then
    printf 'CLIENT_ID_IN_RUNNING_BUNDLE=yes\n'
  else
    printf 'CLIENT_ID_IN_RUNNING_BUNDLE=no\n'
  fi
}

# ---------------------------------------------------------------- health checks
check_backend() {
  local cid="$1" started deadline status restarts logs

  deadline=$((SECONDS + BACKEND_HEALTH_TIMEOUT))
  while :; do
    status="$(inspect "$cid" '{{.State.Status}}/{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}')"
    case "$status" in
      running/healthy) break ;;
      running/none) warn "backend has no healthcheck; relying on HTTP probe"; break ;;
      running/unhealthy) log "backend reported unhealthy"; return 1 ;;
      exited/*|dead/*|restarting/*) log "backend container state: $status"; return 1 ;;
    esac
    (( SECONDS < deadline )) || { log "backend not healthy after ${BACKEND_HEALTH_TIMEOUT}s (state $status)"; return 1; }
    sleep 5
  done
  log "backend container healthy"

  retry_http "$BACKEND_HEALTH_URL" 5 || { log "HTTP probe failed: $BACKEND_HEALTH_URL"; return 1; }
  log "HTTP probe OK: $BACKEND_HEALTH_URL"

  started="$(inspect "$cid" '{{.State.StartedAt}}')"
  logs="$(docker logs --since "$started" "$cid" 2>&1 || true)"
  if ! grep -q 'HTTP server listening' <<<"$logs"; then
    log "startup line 'HTTP server listening' not found in backend logs"; return 1
  fi
  if grep -qE '"level":60|uncaughtException|unhandledRejection|UnhandledPromiseRejection' <<<"$logs"; then
    log "fatal/uncaught errors in backend startup logs:"
    grep -E '"level":60|uncaughtException|unhandledRejection|UnhandledPromiseRejection' <<<"$logs" | tail -n 20 | cut -c1-400 >&2
    return 1
  fi
  local errs; errs="$(grep -c '"level":50' <<<"$logs" || true)"
  (( errs == 0 )) || warn "backend logged $errs error-level line(s) since start (not fatal; review with: docker compose logs backend)"

  restarts="$(inspect "$cid" '{{.RestartCount}}')"
  log "stability window ${STABILITY_WAIT}s…"
  sleep "$STABILITY_WAIT"
  [[ "$(inspect "$cid" '{{.RestartCount}}')" == "$restarts" ]] || { log "backend restarted during stability window"; return 1; }
  [[ "$(inspect "$cid" '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}')" =~ ^(healthy|none)$ ]] || { log "backend became unhealthy"; return 1; }
  http_ok "$BACKEND_HEALTH_URL" || { log "HTTP probe failed after stability window"; return 1; }

  # Frontend nginx resolves `backend` once at start; a recreated backend may
  # have a new IP. Verify the user-facing /api path and reload nginx if stale.
  check_frontend_proxy || return 1
  return 0
}

check_frontend_proxy() {
  local fcid; fcid="$(container_id frontend)"
  if [[ -z "$fcid" || "$(inspect "$fcid" '{{.State.Running}}')" != "true" ]]; then
    warn "frontend not running; skipping /api proxy check"; return 0
  fi
  if retry_http "$FRONTEND_PROXY_HEALTH_URL" 3; then log "frontend → backend proxy OK"; return 0; fi
  warn "frontend /api proxy failing; reloading nginx config in frontend (no recreate)"
  docker exec "$fcid" nginx -s reload >/dev/null 2>&1 || true
  sleep 2
  if retry_http "$FRONTEND_PROXY_HEALTH_URL" 5; then log "frontend → backend proxy OK after nginx reload"; return 0; fi
  log "frontend /api proxy still failing: $FRONTEND_PROXY_HEALTH_URL"; return 1
}

check_frontend() {
  local cid="$1" deadline status restarts body client domain
  deadline=$((SECONDS + FRONTEND_START_TIMEOUT))
  while :; do
    status="$(inspect "$cid" '{{.State.Status}}')"
    [[ "$status" == "running" ]] && break
    [[ "$status" =~ ^(exited|dead)$ ]] && { log "frontend container state: $status"; return 1; }
    (( SECONDS < deadline )) || { log "frontend not running after ${FRONTEND_START_TIMEOUT}s"; return 1; }
    sleep 3
  done
  log "frontend container running"

  retry_http "$FRONTEND_URL" 5 || { log "HTTP probe failed: $FRONTEND_URL"; return 1; }
  body="$(curl -fsS -m 10 "$FRONTEND_URL" 2>/dev/null || true)"
  grep -q 'id="root"' <<<"$body" || { log "frontend index.html missing app root"; return 1; }
  log "HTTP probe OK: $FRONTEND_URL"

  client="$(env_value VITE_AUTH0_CLIENT_ID)"; domain="$(env_value VITE_AUTH0_DOMAIN)"
  if [[ -n "$client" ]]; then
    docker exec "$cid" grep -rqF -- "$client" /usr/share/nginx/html/assets \
      || { log "deployed bundle does not contain the production Auth0 client id"; return 1; }
    docker exec "$cid" grep -rqF -- "$domain" /usr/share/nginx/html/assets \
      || { log "deployed bundle does not contain the production Auth0 domain"; return 1; }
    log "bundle contains production Auth0 client id + domain"
  fi

  check_frontend_proxy || return 1

  restarts="$(inspect "$cid" '{{.RestartCount}}')"
  sleep "$STABILITY_WAIT"
  [[ "$(inspect "$cid" '{{.RestartCount}}')" == "$restarts" && "$(inspect "$cid" '{{.State.Status}}')" == "running" ]] \
    || { log "frontend restarted/stopped during stability window"; return 1; }
  http_ok "$FRONTEND_URL" || { log "HTTP probe failed after stability window"; return 1; }
  return 0
}

check_service() { case "$1" in backend) check_backend "$2" ;; frontend) check_frontend "$2" ;; esac; }

# Recreate exactly one service from the image currently tagged as its compose ref.
recreate() { dc up -d --no-deps --no-build --pull never "$1"; }

# ---------------------------------------------------------------- deploy
deploy_one() { # svc new_ref new_id tag git_ref
  local svc="$1" new_ref="$2" new_id="$3" tag="$4" git_ref="$5"
  local ref cid prev_id rollback_ref new_cid

  ref="$(compose_image_ref "$svc")"
  cid="$(container_id "$svc")"
  prev_id=""
  [[ -n "$cid" ]] && prev_id="$(inspect "$cid" '{{.Image}}')"
  [[ -n "$prev_id" ]] || prev_id="$(docker image inspect -f '{{.Id}}' "$ref" 2>/dev/null || true)"

  log "==== $svc: deploying $new_ref"
  rollback_ref=""
  if [[ -n "$prev_id" ]]; then
    rollback_ref="${ref%:*}:rollback-${tag#deploy-}"
    docker tag "$prev_id" "$rollback_ref" || { log "$svc: could not create rollback tag — aborting before any change"; return 1; }
    log "$svc: previous image ${prev_id:0:19} preserved as $rollback_ref"
  else
    warn "$svc: no previous image found — automatic rollback impossible"
  fi

  if [[ "$prev_id" == "$new_id" ]]; then
    log "$svc: new image is identical to the running image (no code change); verifying only"
  fi

  docker tag "$new_ref" "$ref" || { log "$svc: could not retag $new_ref -> $ref — aborting before any change"; return 1; }
  log "$svc: $ref -> ${new_id:0:19}; recreating $svc only"
  if recreate "$svc" && new_cid="$(container_id "$svc")" && [[ -n "$new_cid" ]] \
     && [[ "$(inspect "$new_cid" '{{.Image}}')" == "$new_id" ]] && check_service "$svc" "$new_cid"; then
    log "$svc: DEPLOYED OK ($tag)"
    record "$tag	$svc	prev=${prev_id:-none}	new=$new_id	git=$git_ref	result=success"
    return 0
  fi

  log "$svc: deployment FAILED health verification"
  if [[ -z "$prev_id" ]]; then
    record "$tag	$svc	prev=none	new=$new_id	git=$git_ref	result=failed-no-rollback"
    return 20
  fi

  log "$svc: ROLLING BACK to ${prev_id:0:19} ($rollback_ref)"
  if docker tag "$prev_id" "$ref" && recreate "$svc" && new_cid="$(container_id "$svc")" && [[ -n "$new_cid" ]] \
     && [[ "$(inspect "$new_cid" '{{.Image}}')" == "$prev_id" ]] && check_service "$svc" "$new_cid"; then
    log "$svc: ROLLBACK SUCCEEDED — previous version is serving and healthy"
    record "$tag	$svc	prev=$prev_id	new=$new_id	git=$git_ref	result=failed-rolled-back"
    return 10
  fi
  log "$svc: ROLLBACK FAILED — manual intervention required"
  record "$tag	$svc	prev=$prev_id	new=$new_id	git=$git_ref	result=failed-rollback-failed"
  return 20
}

mode_deploy() {
  local dir="$1" tag="$2" stage="$3" git_ref="$4"; shift 4
  [[ "$tag" =~ ^deploy-[0-9]{8}-[0-9]{6}$ ]] || die "bad tag: $tag"
  stage="$(expand_home "$stage")"
  [[ "$stage" == "$STAGING_ROOT/$tag" ]] || die "unexpected staging dir: $stage"
  cd_project "$dir"

  mkdir -p "$STATE_DIR"
  exec 9>"$LOCK_FILE"
  flock -n 9 || die "another deployment holds $LOCK_FILE"
  log "acquired deploy lock"

  log "verifying archive checksums"
  (cd "$stage" && sha256sum --quiet -c SHA256SUMS) || die "SHA-256 verification failed — nothing deployed"
  log "SHA-256 OK"

  local pair svc id ref new_ref loaded
  local -a svcs=() ids=()
  for pair in "$@"; do
    svc="${pair%%=*}"; id="${pair#*=}"
    valid_service "$svc" || die "invalid service: $svc"
    [[ "$id" =~ ^sha256:[0-9a-f]{64}$ ]] || die "bad image id for $svc"
    svcs+=("$svc"); ids+=("$id")
  done

  # Load everything first so a transfer/load problem never leaves a half-deploy.
  local i
  for i in "${!svcs[@]}"; do
    svc="${svcs[$i]}"; id="${ids[$i]}"
    ref="$(compose_image_ref "$svc")"
    new_ref="${ref%:*}:$tag"
    log "loading $svc image"
    gunzip -c "$stage/ims-v5-$svc-$tag.tar.gz" | docker load -q >&2 || die "docker load failed for $svc"
    loaded="$(docker image inspect -f '{{.Id}}' "$new_ref" 2>/dev/null || true)"
    [[ "$loaded" == "$id" ]] || die "$svc: loaded image id ${loaded:-<missing>} != built id $id — nothing deployed"
    log "$svc: loaded $new_ref (${id:0:19}) — id matches local build"
  done

  local rc
  for i in "${!svcs[@]}"; do
    svc="${svcs[$i]}"; id="${ids[$i]}"
    ref="$(compose_image_ref "$svc")"
    rc=0
    deploy_one "$svc" "${ref%:*}:$tag" "$id" "$tag" "$git_ref" || rc=$?
    if (( rc != 0 )); then
      local rest=("${svcs[@]:i+1}")
      (( ${#rest[@]} == 0 )) || warn "skipping remaining service(s): ${rest[*]} (not touched)"
      return "$rc"
    fi
  done
  log "all requested services deployed and healthy"
}

# Runs `deploy` detached from the SSH session (setsid + nohup) so a dropped
# connection or Ctrl-C on the laptop can never stop it half way between
# retagging and recreating. The SSH session only tails the log.
mode_deploy_detached() {
  local tag="$2"
  [[ "$tag" =~ ^deploy-[0-9]{8}-[0-9]{6}$ ]] || die "bad tag: $tag"
  mkdir -p "$STATE_DIR/logs"
  local logf="$STATE_DIR/logs/$tag.log" rcf="$STATE_DIR/logs/$tag.rc" self
  [[ ! -e "$rcf" ]] || die "deployment $tag already ran (see $logf)"
  self="$(readlink -f "${BASH_SOURCE[0]}")"
  [[ -f "$self" ]] || die "deploy-detached must run from a file, not stdin"

  setsid nohup bash "$self" deploy-run "$rcf" "$@" >"$logf" 2>&1 </dev/null &
  log "deployment running detached on server; log: $logf"

  tail -n +1 -F "$logf" >&2 2>/dev/null &
  local tail_pid=$!
  while [[ ! -s "$rcf" ]]; do sleep 2; done
  sleep 1; kill "$tail_pid" 2>/dev/null || true; wait "$tail_pid" 2>/dev/null || true
  return "$(cat "$rcf")"
}

mode_deploy_run() {
  local rcf="$1"; shift
  set +e
  bash "$(readlink -f "${BASH_SOURCE[0]}")" deploy "$@"
  local rc=$?
  printf '%s\n' "$rc" >"$rcf"
  exit "$rc"
}

mode_cleanup() {
  local stage; stage="$(expand_home "$1")"
  [[ "$stage" =~ ^"$STAGING_ROOT"/deploy-[0-9]{8}-[0-9]{6}$ ]] || die "refusing to clean unexpected path: $stage"
  rm -rf -- "$stage"
  log "removed staging dir $stage"
}

main() {
  local mode="${1:-}"; shift || true
  case "$mode" in
    preflight) (( $# >= 2 )) || die "usage: preflight <dir> <svc…>"; mode_preflight "$@" ;;
    vite-env)  (( $# == 1 )) || die "usage: vite-env <dir>"; mode_vite_env "$@" ;;
    deploy)    (( $# >= 5 )) || die "usage: deploy <dir> <tag> <stage> <git> <svc=id…>"; mode_deploy "$@" ;;
    deploy-detached) (( $# >= 5 )) || die "usage: deploy-detached <dir> <tag> <stage> <git> <svc=id…>"; mode_deploy_detached "$@" ;;
    deploy-run) mode_deploy_run "$@" ;;
    cleanup)   (( $# == 1 )) || die "usage: cleanup <stage>"; mode_cleanup "$@" ;;
    *) die "unknown mode: ${mode:-<none>}" ;;
  esac
}

main "$@"
