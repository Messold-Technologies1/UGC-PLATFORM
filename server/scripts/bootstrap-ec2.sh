#!/usr/bin/env bash
# One-time host setup for the GoCollab backend on Amazon Linux 2023.
#
# Run this ONCE on a fresh instance, as a user with sudo. It is idempotent —
# re-running it is safe and is the way to pick up a pinned-version bump.
#
# Everything here is a HOST dependency: the things the app needs that are not
# in package.json. Deploys never touch them, which is the point — a deploy
# should not be able to change which ffmpeg you are running.
set -euo pipefail

NODE_MAJOR="${NODE_MAJOR:-22}"
# Pinned deliberately. `ffmpeg-release-amd64-static.tar.xz` is a moving target:
# the same URL served 6.1.1 and now serves 7.x. A moving ffmpeg is how an
# encode path silently changes behaviour between two deploys of the same commit,
# so we name the version and keep it until we choose to move it.
FFMPEG_VERSION="${FFMPEG_VERSION:-7.0.2}"
# johnvansickle publishes exactly one build under a VERSION-LESS name in
# releases/, and moves it into old-releases/ only once a newer one supersedes it.
# So the versioned URL 404s for whatever is currently the latest build. Try the
# archive first, fall back to the moving name, and then assert the version we
# actually got — which keeps the pin honest in both directions: a rotation fails
# loudly here instead of quietly installing a different encoder.
FFMPEG_URLS=(
    "https://johnvansickle.com/ffmpeg/old-releases/ffmpeg-${FFMPEG_VERSION}-amd64-static.tar.xz"
    "https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz"
)

APP_USER="${APP_USER:-ec2-user}"
APP_DIR="${APP_DIR:-/opt/gocollab}"
WEB_DIR="${WEB_DIR:-/opt/gocollab-client}"
ENV_DIR="${ENV_DIR:-/etc/gocollab}"

say() { printf '\n==> %s\n' "$*"; }

# ---------------------------------------------------------------------------
say "System packages"
sudo dnf -y update
# openssl        Prisma's query engine links against it
# fontconfig +
#   dejavu-sans  the watermark is SVG text rendered by sharp/librsvg. With no
#                font installed librsvg does NOT error — it renders near-blank
#                glyphs and ships a watermark that is barely there.
# git            used by the deploy for nothing, but you will want it
# tar/xz         to unpack the ffmpeg build and release tarballs
sudo dnf -y install \
    openssl ca-certificates \
    fontconfig dejavu-sans-fonts \
    git tar xz jq \
    nginx \
    redis6
sudo fc-cache -f

# ---------------------------------------------------------------------------
say "Swap (2 GiB)"
# 4 GiB of RAM with two Node processes and an ffmpeg child is enough until it
# isn't. Swap does not make the box faster; it makes a memory spike a slowdown
# instead of the OOM killer taking out the API.
if ! sudo swapon --show | grep -q /swapfile; then
    sudo dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile >/dev/null
    sudo swapon /swapfile
    grep -q '^/swapfile' /etc/fstab || \
        echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
    # Prefer reclaiming cache over swapping; swap is the safety net, not the plan.
    echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-gocollab.conf >/dev/null
    sudo sysctl -p /etc/sysctl.d/99-gocollab.conf >/dev/null
fi

# ---------------------------------------------------------------------------
say "Node.js ${NODE_MAJOR}"
if ! command -v node >/dev/null || [[ "$(node -v)" != v${NODE_MAJOR}.* ]]; then
    curl -fsSL "https://rpm.nodesource.com/setup_${NODE_MAJOR}.x" | sudo bash -
    sudo dnf -y install nodejs
fi
node -v

# ---------------------------------------------------------------------------
say "ffmpeg ${FFMPEG_VERSION} (pinned)"
# Installed to /usr/local/bin and pointed at by FFMPEG_PATH in the env file.
# Both encoders (WatermarkService, PreviewVideoService) prefer FFMPEG_PATH over
# the ffmpeg-static binary in node_modules, so this is the one that runs.
if [[ "$(ffmpeg -version 2>/dev/null | head -1 | awk '{print $3}')" != "${FFMPEG_VERSION}"* ]]; then
    tmp="$(mktemp -d)"
    got=""
    for url in "${FFMPEG_URLS[@]}"; do
        # A miss on the first URL is the NORMAL case while this version is still
        # upstream's current release, so curl's error is held back and only
        # printed if every URL fails. Otherwise a healthy run looks like a crash.
        if curl -fsSL "$url" -o "$tmp/ffmpeg.tar.xz" 2>"$tmp/curl.err"; then
            got="$url"
            break
        fi
        echo "    not available at $url"
    done
    if [[ -z "$got" ]]; then
        echo "FAIL: could not download ffmpeg ${FFMPEG_VERSION} from any known URL" >&2
        cat "$tmp/curl.err" >&2 || true
        rm -rf "$tmp"
        exit 1
    fi
    tar -xJf "$tmp/ffmpeg.tar.xz" -C "$tmp" --strip-components=1
    # The fallback URL is a moving target, so refuse anything that is not the pin.
    have="$("$tmp/ffmpeg" -version | head -1 | awk '{print $3}')"
    if [[ "$have" != "${FFMPEG_VERSION}"* ]]; then
        echo "FAIL: $got served ffmpeg $have, expected ${FFMPEG_VERSION}." >&2
        echo "      Upstream rotated its current release. Check what changed, then" >&2
        echo "      re-run with FFMPEG_VERSION=$have once you accept the new build." >&2
        rm -rf "$tmp"
        exit 1
    fi
    echo "    from $got"
    sudo install -m 0755 "$tmp/ffmpeg"  /usr/local/bin/ffmpeg
    sudo install -m 0755 "$tmp/ffprobe" /usr/local/bin/ffprobe
    rm -rf "$tmp"
fi
ffmpeg -version | head -1

# ---------------------------------------------------------------------------
say "Redis"
# BullMQ's backing store. Loopback only — nothing outside this box talks to it,
# so it needs no password and must never be reachable from the network.
sudo sed -i 's/^# *maxmemory .*/maxmemory 512mb/' /etc/redis6/redis6.conf || true
# noeviction, NOT allkeys-lru: BullMQ stores job state here. Evicting a key
# under memory pressure silently loses jobs; refusing the write fails loudly.
sudo sed -i 's/^# *maxmemory-policy .*/maxmemory-policy noeviction/' /etc/redis6/redis6.conf || true
sudo systemctl enable --now redis6
redis6-cli ping

# ---------------------------------------------------------------------------
say "PM2"
sudo npm install -g pm2@5.4.3
pm2 -v

# ---------------------------------------------------------------------------
say "Directories"
sudo mkdir -p "$APP_DIR"/{releases,shared/logs} "$WEB_DIR"/{releases,shared/logs} "$ENV_DIR"
sudo chown -R "$APP_USER":"$APP_USER" "$APP_DIR" "$WEB_DIR"
# root owns the directory so the app user cannot delete or replace the env file,
# but it must be GROUP-owned by the app user: 750 root:root would deny ec2-user
# the +x needed to traverse into it, and deploy.sh sources the file as ec2-user.
sudo chown root:"$APP_USER" "$ENV_DIR"
sudo chmod 750 "$ENV_DIR"
# The env file holds the DB URL, the S3 keys and the JWT secret. 0600, so only
# the app user (and root) can read the secrets themselves.
for f in server.env client.env; do
    if [[ ! -f "$ENV_DIR/$f" ]]; then
        sudo install -m 0600 -o "$APP_USER" -g "$APP_USER" /dev/null "$ENV_DIR/$f"
        echo "    created empty $ENV_DIR/$f — fill it before deploying"
    fi
done

# ---------------------------------------------------------------------------
say "PM2 boot on reboot"
# Writes a systemd unit that runs `pm2 resurrect` as APP_USER at boot.
sudo env PATH="$PATH:/usr/bin" pm2 startup systemd -u "$APP_USER" --hp "/home/$APP_USER" >/dev/null
echo "    systemd unit installed (pm2-$APP_USER)"

# ---------------------------------------------------------------------------
say "Done"
cat <<SUMMARY

  node     $(node -v)
  npm      $(npm -v)
  pm2      $(pm2 -v)
  ffmpeg   $(ffmpeg -version | head -1 | awk '{print $3}')  (/usr/local/bin/ffmpeg)
  redis    $(redis6-cli ping)
  fonts    $(fc-match 'DejaVu Sans')

Next: fill ${ENV_DIR}/server.env and ${ENV_DIR}/client.env, then deploy.

SUMMARY
