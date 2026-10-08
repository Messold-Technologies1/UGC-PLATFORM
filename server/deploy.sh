#!/usr/bin/env bash
# Build, migrate and restart both processes on the EC2 host.
#
# Deliberately boring: pull, build, migrate, up. The interesting decisions
# (which process is the worker, which env each gets) live in docker-compose.yml.
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/gocollab}"
ENV_FILE="${ENV_FILE:-/etc/gocollab/server.env}"
COMPOSE="docker compose -f ${REPO_DIR}/server/docker-compose.yml --env-file ${ENV_FILE}"

cd "$REPO_DIR"

echo "==> Fetching"
git fetch --all --prune
git checkout "${BRANCH:-main}"
git pull --ff-only

echo "==> Building image"
docker build -t gocollab-server:latest ./server

echo "==> Running migrations"
# One-shot container rather than an entrypoint hook: with two services, an
# entrypoint migration would race — both would try, and one would fail on the
# advisory lock. DIRECT_URL is used because migrations need a real session,
# which transaction-mode pooling does not give.
docker run --rm --env-file "$ENV_FILE" gocollab-server:latest \
  npx prisma migrate deploy

echo "==> Restarting"
$COMPOSE up -d --remove-orphans

echo "==> Waiting for the API to report healthy"
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:4000/api/health >/dev/null 2>&1; then
    echo "    healthy after ${i}s"
    docker image prune -f >/dev/null 2>&1 || true
    exit 0
  fi
  sleep 1
done

echo "!!! API did not become healthy. Recent logs:" >&2
$COMPOSE logs --tail 50 api >&2
exit 1
