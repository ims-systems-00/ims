# Production deployment (app.ims-os.com)

`./deploy.sh` builds the app image(s) on your laptop from the **current working tree** (uncommitted changes included), ships them to EC2 and recreates **only** the requested service. It runs health checks and rolls back on its own if they fail.

```bash
./deploy.sh backend            # backend only
./deploy.sh frontend           # frontend only
./deploy.sh all                # backend → verify → frontend → verify

./deploy.sh all --dry-run      # read-only: SSH + prod config checks, prints the plan
./deploy.sh frontend --build-only   # build + verify locally, nothing sent to EC2
./deploy.sh backend --yes      # skip the "type deploy" prompt (non-interactive use)
```

Requirements on the laptop: Docker + Compose plugin, `ssh`, `scp`, `gzip`, `sha256sum`, `flock`, and the key `~/.ssh/ims-systems-pem`.
Target defaults: `ubuntu@18.134.196.170:~/projects/ims`. You can override them with `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY` and `DEPLOY_REMOTE_DIR`.

## What it does

1. **Local checks and lock.** Only one `deploy.sh` can run at a time (`flock`). It checks that the tools are installed and that the compose project name is `ims-v5`. Git is read only to record the commit; it is never changed.
2. **SSH preflight (read-only).** This runs before the expensive build. It checks Docker/Compose, at least 3 GB of free disk, that no other deploy holds the EC2 lock, and that prod Compose expects `ims-v5-<svc>:latest`.
3. **Frontend build values** (frontend/all only). The `VITE_*` values are read from the **production `.env` on EC2**. The local `.env` is never used.
   - Provider, domain, audience, API base URL and OnlyOffice URL must equal the pinned values in `deploy.sh`: `auth0-openfga`, `auth.ims-os.com`, `https://api.ims.v5`, `/api/v1`, `/onlyoffice`.
   - The Auth0 client ID must already be in the JS bundle that is serving users now. Otherwise the deploy aborts.
4. **Build.** It runs `docker compose build <svc>` with the layer cache. Build settings are isolated:
   - `--env-file` points at a temp file that holds only the prod `VITE_*` values.
   - Any `VITE_*` or `COMPOSE_*` variables exported in your shell are dropped.
   - Infrastructure services are never built.
5. **Verify the image.** The image must not contain `*.bson`, `.env*` or `*.pem` files. The frontend bundle must contain the prod client ID, domain and audience.
6. **Ship.** The image is tagged `ims-v5-<svc>:deploy-YYYYMMDD-HHMMSS` (UTC), exported with `docker save | gzip`, and checked with SHA-256. It is copied by `scp` to `~/.ims-deploy/staging/<tag>/` on EC2, and the SHA-256 is checked again there.
7. **Deploy on EC2.** This step runs **detached** (`setsid nohup`), so an SSH drop or Ctrl‑C cannot stop it halfway. It holds a lock, then:
   - loads the image and checks that its image ID matches the local build;
   - for each service:
     - tags the running image as `ims-v5-<svc>:rollback-<timestamp>`;
     - retags `ims-v5-<svc>:latest` to the new image;
     - runs `docker compose up -d --no-deps --no-build --pull never <svc>`;
     - runs the health checks for that service.
8. **Cleanup.** After success, the local and remote archives are removed. Images and tags are **never deleted**.

### Health checks

| Service | Checks |
| --- | --- |
| backend | Docker health is `healthy` (wait up to 240 s)<br>`curl http://127.0.0.1:3001/api/v1/health`<br>logs since start contain `HTTP server listening` and no fatal, `uncaughtException` or `unhandledRejection` entries (error-level lines are only counted)<br>no restarts during a 15 s stability window<br>`/api` works through the frontend nginx: if it fails, nginx is **reloaded** (not recreated), because nginx caches the backend IP |
| frontend | container running<br>`curl http://127.0.0.1:7864/` returns the SPA shell<br>the deployed bundle contains the prod Auth0 client ID and domain<br>`/api` proxy works<br>no restarts during a 15 s stability window |

## Rollback

**Automatic.** If any check fails, the script:

1. retags `:latest` back to the previous image ID;
2. recreates that service only;
3. runs the same health checks again.

Exit codes:

| Exit code | Meaning |
| --- | --- |
| `0` | Deployed and healthy. |
| `10` | Deploy failed, rollback **succeeded**. |
| `20` | Rollback **failed**: manual action needed. |
| `1` | Failed before the failing service was changed. |
| `255` | SSH lost. The deploy carries on on EC2; see the log. |

With `all`, a failing frontend rolls back only the frontend; the backend that already passed stays deployed. If the backend fails, the frontend is not touched.

**Manual rollback** (on EC2, for example to undo a deploy that passed checks but is wrong):

```bash
cd ~/projects/ims
docker images ims-v5-backend          # find rollback-<timestamp> / deploy-<timestamp> tags
docker tag ims-v5-backend:rollback-20261127-101044 ims-v5-backend:latest
docker compose up -d --no-deps --no-build --pull never backend
```

## Audit and logs on EC2

- `~/.ims-deploy/logs/<tag>.log` holds the full remote log. `<tag>.rc` holds the exit code.
- `~/.ims-deploy/history.log` has one line per service deploy: previous and new image IDs, git ref and result.

## Never done by this script

- Running `docker compose down`, or `up` without a service name.
- Touching `mongodb`, `openfga`, `openfga-db`, `openfga-migrate` or `onlyoffice`.
- Copying `.env`, source code or data.
- Editing the prod `docker-compose.yml` or `.env`.
- Running migrations.
- Running `git pull`, `reset` or `stash`.
- Deleting images.

## Housekeeping

`deploy-*` and `rollback-*` tags build up on EC2, about 150–400 MB of unique layers per deploy. Prune old ones by hand when disk gets low. Never remove the image a running container uses:

```bash
docker images 'ims-v5-*' --format '{{.Repository}}:{{.Tag}} {{.ID}} {{.CreatedSince}}'
docker rmi ims-v5-frontend:deploy-20261101-120000   # one tag at a time
```

**Emergency only:** `DEPLOY_ALLOW_UNVERIFIED_CLIENT_ID=1` skips the "client ID is in the live bundle" check. Use it only if the live frontend is down and you have confirmed the client ID in the prod `.env` is correct.
