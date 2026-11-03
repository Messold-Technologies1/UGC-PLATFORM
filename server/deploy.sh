#!/usr/bin/env bash
# Install a built artifact and restart both processes. Runs ON the EC2 host.
#
#   ./deploy.sh s3://gocollab-deploy-artifacts/server/<sha>.tar.gz   (CI)
#   ./deploy.sh /home/ec2-user/first.tar.gz                           (by hand)
#
# CI builds the artifact (TypeScript compile, tests, asset checks) and this
# script only installs it. The box never compiles: a t3.medium should not be
# running `nest build` while it is also serving requests and encoding video.
#
# Releases are unpacked side by side and a symlink is flipped, so a failed
# health check can put the previous release back in one `ln -sfn`. The previous
# release's node_modules are still on disk, so that rollback needs no network.
set -euo pipefail

ARTIFACT="${1:-${ARTIFACT_URI:-}}"
APP_DIR="${APP_DIR:-/opt/gocollab}"
ENV_FILE="${ENV_FILE:-/etc/gocollab/server.env}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-90}"

[[ -n "$ARTIFACT" ]] || { echo "usage: $0 s3://bucket/key.tar.gz" >&2; exit 2; }
[[ -f "$ENV_FILE" ]] || { echo "missing env file: $ENV_FILE" >&2; exit 2; }

say() { printf '\n==> %s\n' "$*"; }

# `set -a` exports everything the file defines, so the npm/prisma/pm2 children
# below inherit it. `source` (unlike docker --env-file) strips the quotes around
# values, which is why the quoted style in the env file is safe here.
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a
PORT="${PORT:-4000}"

RELEASE_ID="$(date -u +%Y%m%d%H%M%S)-$(basename "$ARTIFACT" .tar.gz)"
# basename already strips any directory, but a stray slash here would make
# RELEASE_DIR a nested path and silently break the symlink flip.
RELEASE_ID="${RELEASE_ID//\//-}"
RELEASE_DIR="$APP_DIR/releases/$RELEASE_ID"
PREVIOUS="$(readlink -f "$APP_DIR/current" 2>/dev/null || true)"

# ---------------------------------------------------------------------------
say "Fetching $ARTIFACT"
mkdir -p "$RELEASE_DIR"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
# A local path as well as an s3:// URI, so the very first deploy can be done by
# hand with nothing but scp — before the artifact bucket and the CI role exist.
if [[ "$ARTIFACT" == s3://* ]]; then
    aws s3 cp "$ARTIFACT" "$tmp/release.tar.gz" --only-show-errors
else
    [[ -f "$ARTIFACT" ]] || { echo "no such file: $ARTIFACT" >&2; exit 2; }
    cp "$ARTIFACT" "$tmp/release.tar.gz"
fi
tar -xzf "$tmp/release.tar.gz" -C "$RELEASE_DIR"

# The build is supposed to contain these. Assert rather than discover it at
# runtime: the mail templates in particular are the renderer's fallback until
# every template exists in the database, so an artifact without them starts
# fine and then renders nothing.
test -f "$RELEASE_DIR/dist/main.js"         || { echo "artifact has no dist/main.js" >&2; exit 1; }
test -f "$RELEASE_DIR/dist/main.worker.js"  || { echo "artifact has no dist/main.worker.js" >&2; exit 1; }
test "$(find "$RELEASE_DIR/dist/mail/templates" -name '*.hbs' 2>/dev/null | wc -l)" -gt 0 \
    || { echo "artifact has no mail templates" >&2; exit 1; }

# ---------------------------------------------------------------------------
say "Installing production dependencies"
cd "$RELEASE_DIR"
# Installed HERE, not shipped from CI: sharp and the Prisma query engine are
# native, built for the host they are installed on. A node_modules tarred up on
# a GitHub runner is linked against that runner's glibc, and the mismatch shows
# up as a module-load failure at boot rather than at build time.
#
# `prisma generate` runs on postinstall and writes the engine for THIS platform,
# which is the other half of the same reason.
npm ci --omit=dev --no-audit --no-fund

# ---------------------------------------------------------------------------
say "Verifying host media dependencies"
# Fonts and ffmpeg both fail SILENTLY — a missing font ships a near-invisible
# watermark, a drifted ffmpeg writes audio-only previews and exits 0. Checked on
# every deploy because a dnf update can take either of them away.
node scripts/verify-media-deps.js

# ---------------------------------------------------------------------------
say "Running migrations"
# DIRECT_URL, not the pooled URL: migrations need a real session, which
# transaction-mode pooling does not give. Prisma reads it from the datasource
# block, which is already sourced above.
npx prisma migrate deploy

# ---------------------------------------------------------------------------
say "Switching to $RELEASE_ID"
ln -sfn "$RELEASE_DIR" "$APP_DIR/current"

# --update-env so the processes pick up this shell's environment (the sourced
# env file) rather than the one captured at their last start. Without it, an
# env-file change would need a full `pm2 delete` to take effect.
pm2 startOrReload "$APP_DIR/current/ecosystem.config.js" --update-env

# ---------------------------------------------------------------------------
say "Health check (up to ${HEALTH_TIMEOUT}s)"
healthy=false
for _ in $(seq 1 "$HEALTH_TIMEOUT"); do
    if curl -fsS "http://127.0.0.1:${PORT}/api/health" >/dev/null 2>&1; then
        healthy=true
        break
    fi
    sleep 1
done

if [[ "$healthy" != true ]]; then
    echo "!!! API did not become healthy on :${PORT}" >&2
    pm2 logs gocollab-api --lines 60 --nostream >&2 || true
    if [[ -n "$PREVIOUS" && -d "$PREVIOUS" && "$PREVIOUS" != "$RELEASE_DIR" ]]; then
        echo "!!! rolling back to $(basename "$PREVIOUS")" >&2
        ln -sfn "$PREVIOUS" "$APP_DIR/current"
        pm2 startOrReload "$APP_DIR/current/ecosystem.config.js" --update-env
    fi
    exit 1
fi

# Only now: persist the process list so `pm2 resurrect` at boot brings back a
# release that is known to serve traffic, not one that failed its health check.
pm2 save --force

# ---------------------------------------------------------------------------
say "Pruning old releases (keeping $KEEP_RELEASES)"
cd "$APP_DIR/releases"
# Never delete what `current` points at, whatever the sort order says.
current="$(basename "$(readlink -f "$APP_DIR/current")")"
ls -1dt */ 2>/dev/null | sed 's#/$##' | tail -n +"$((KEEP_RELEASES + 1))" | while read -r old; do
    [[ "$old" == "$current" ]] && continue
    echo "    removing $old"
    rm -rf "${APP_DIR:?}/releases/${old:?}"
done

say "Deployed $RELEASE_ID"
pm2 list
