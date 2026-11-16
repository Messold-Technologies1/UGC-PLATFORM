#!/usr/bin/env bash
# Install a built Next.js artifact and reload the web process. Runs ON the host.
#
#   ./deploy-client.sh s3://gocollab-deploy-artifacts/client/<sha>.tar.gz   (CI)
#   ./deploy-client.sh /home/ec2-user/client.tar.gz                         (by hand)
#
# Mirrors server/deploy.sh: unpack side by side, flip a symlink, reload, health
# check, roll back on failure. The one real difference is that there is no
# `npm ci` here — `output: 'standalone'` means the artifact already contains the
# node_modules it needs, and they are plain JavaScript, so the GitHub runner's
# copy runs unchanged on this box. (The backend cannot do that: sharp and the
# Prisma engine are native and must be built where they run.)
set -euo pipefail

ARTIFACT="${1:-${ARTIFACT_URI:-}}"
APP_DIR="${APP_DIR:-/opt/gocollab-client}"
ENV_FILE="${ENV_FILE:-/etc/gocollab/client.env}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-60}"

[[ -n "$ARTIFACT" ]] || { echo "usage: $0 s3://bucket/key.tar.gz" >&2; exit 2; }
[[ -f "$ENV_FILE" ]] || { echo "missing env file: $ENV_FILE" >&2; exit 2; }

say() { printf '\n==> %s\n' "$*"; }

# Exported so the reloaded process inherits them. Values in this file are
# runtime-only; anything NEXT_PUBLIC_ was already compiled into the bundle at
# build time and cannot be changed here.
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a
PORT="${PORT:-3000}"

# Same trap as server/deploy.sh: `--update-env` refreshes variables a process
# already has, but will not reliably introduce one added since its last start.
# Compare the key SET (never the values) and recreate when it changes.
ENV_KEYS_FILE="$APP_DIR/shared/.env-keys"
ENV_KEYS_NOW="$(grep -oE '^[A-Za-z_][A-Za-z0-9_]*=' "$ENV_FILE" | tr -d '=' | sort -u)"
ENV_KEYS_WAS="$(cat "$ENV_KEYS_FILE" 2>/dev/null || true)"
if [[ "$ENV_KEYS_NOW" == "$ENV_KEYS_WAS" ]]; then
    PROCESS_MODE=reload
else
    PROCESS_MODE=recreate
fi

apply_processes() {
    local ecosystem="$APP_DIR/current/ecosystem.config.js"
    if [[ "$PROCESS_MODE" == recreate ]]; then
        pm2 delete "$ecosystem" >/dev/null 2>&1 || true
        pm2 start "$ecosystem"
    else
        pm2 startOrReload "$ecosystem" --update-env
    fi
}

RELEASE_ID="$(date -u +%Y%m%d%H%M%S)-$(basename "$ARTIFACT" .tar.gz)"
RELEASE_ID="${RELEASE_ID//\//-}"
RELEASE_DIR="$APP_DIR/releases/$RELEASE_ID"
PREVIOUS="$(readlink -f "$APP_DIR/current" 2>/dev/null || true)"

mkdir -p "$APP_DIR/releases" "$APP_DIR/shared/logs" "$RELEASE_DIR"

# ---------------------------------------------------------------------------
say "Fetching $ARTIFACT"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
if [[ "$ARTIFACT" == s3://* ]]; then
    aws s3 cp "$ARTIFACT" "$tmp/release.tar.gz" --only-show-errors
else
    [[ -f "$ARTIFACT" ]] || { echo "no such file: $ARTIFACT" >&2; exit 2; }
    cp "$ARTIFACT" "$tmp/release.tar.gz"
fi
tar -xzf "$tmp/release.tar.gz" -C "$RELEASE_DIR"

# Next deliberately leaves public/ and .next/static/ OUT of the standalone
# output, because it assumes a CDN serves them. Packaging has to copy them in.
# When it does not, the site still boots and still answers 200 — it just renders
# with no CSS and no images, which looks like a frontend bug rather than a
# packaging one. Assert instead of discovering it in a browser.
test -f "$RELEASE_DIR/server.js"           || { echo "artifact has no server.js" >&2; exit 1; }
test -f "$RELEASE_DIR/ecosystem.config.js" || { echo "artifact has no ecosystem.config.js" >&2; exit 1; }
test -d "$RELEASE_DIR/.next/static"        || { echo "artifact has no .next/static — the site would load unstyled" >&2; exit 1; }
test -d "$RELEASE_DIR/public"              || { echo "artifact has no public/ — images would 404" >&2; exit 1; }

# ---------------------------------------------------------------------------
say "Switching to $RELEASE_ID"
ln -sfn "$RELEASE_DIR" "$APP_DIR/current"
if [[ "$PROCESS_MODE" == recreate ]]; then
    say "Env file gained or lost a variable - recreating the web process"
fi
apply_processes

# ---------------------------------------------------------------------------
say "Health check (up to ${HEALTH_TIMEOUT}s)"
# Any HTTP answer that is not a server error counts. Deliberately NOT `curl -f`:
# the home page renders against the API, so a 4xx or a redirect still proves
# this process is up, and tying the frontend's health to the backend's would
# make an API blip roll back a perfectly good frontend release.
healthy=false
for _ in $(seq 1 "$HEALTH_TIMEOUT"); do
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "http://127.0.0.1:${PORT}/" || echo 000)"
    if [[ "$code" != "000" && "$code" -lt 500 ]]; then
        healthy=true
        echo "    responded $code"
        break
    fi
    sleep 1
done

if [[ "$healthy" != true ]]; then
    echo "!!! web did not answer on :${PORT}" >&2
    pm2 logs gocollab-web --lines 60 --nostream >&2 || true
    if [[ -n "$PREVIOUS" && -d "$PREVIOUS" && "$PREVIOUS" != "$RELEASE_DIR" ]]; then
        echo "!!! rolling back to $(basename "$PREVIOUS")" >&2
        ln -sfn "$PREVIOUS" "$APP_DIR/current"
        apply_processes
    fi
    exit 1
fi

pm2 save --force
# After the health check, not before: a failed deploy must not teach the next
# one that these keys are already live.
mkdir -p "$(dirname "$ENV_KEYS_FILE")"
printf '%s\n' "$ENV_KEYS_NOW" > "$ENV_KEYS_FILE"

# ---------------------------------------------------------------------------
say "Pruning old releases (keeping $KEEP_RELEASES)"
cd "$APP_DIR/releases"
current="$(basename "$(readlink -f "$APP_DIR/current")")"
ls -1dt */ 2>/dev/null | sed 's#/$##' | tail -n +"$((KEEP_RELEASES + 1))" | while read -r old; do
    [[ "$old" == "$current" ]] && continue
    echo "    removing $old"
    rm -rf "${APP_DIR:?}/releases/${old:?}"
done

say "Deployed $RELEASE_ID"
pm2 list
