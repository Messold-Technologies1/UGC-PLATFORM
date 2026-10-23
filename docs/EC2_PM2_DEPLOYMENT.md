# EC2 deployment with PM2 — production and testing

Two instances, each running the API and the worker under PM2, deployed by
GitHub Actions. `main` deploys to production, `development` to testing.

## Before you start: this replaces the Docker path

`server/Dockerfile`, `server/docker-compose.yml` and `server/deploy.sh` already
exist and describe the same two processes. Running PM2 on the host instead means
reproducing by hand what the image installs for you:

| Dockerfile line | Why it exists | Host equivalent |
|---|---|---|
| `fonts-dejavu-core`, `fontconfig` | sharp/librsvg renders the watermark as SVG text and **silently** falls back to a thin substitute when the font is missing — measured at ~23% of intended ink coverage | `apt-get install` them, §1 |
| `openssl`, `ca-certificates` | Prisma's query engine; outbound TLS | `apt-get install` them, §1 |
| `node:22-slim` (Debian, not Alpine) | sharp and ffmpeg-static ship glibc-linked prebuilt binaries | use Ubuntu/Debian, not Alpine |

None of that is hard, but it is now your responsibility rather than the image's.
The failure mode worth knowing is the font one: it does not error, it just
produces a barely-visible watermark on brand-facing delivery previews.

If you would rather keep Docker, the compose file is ready and only the CI/CD in
§6 needs adjusting — the host setup and env handling below still apply.

---

## 1. Host setup

Ubuntu 24.04 LTS, both instances.

```bash
sudo apt-get update && sudo apt-get upgrade -y

# Node 22 — matches the Dockerfile's node:22-slim
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Runtime dependencies. The fonts are not optional — see the table above.
sudo apt-get install -y \
  openssl ca-certificates fontconfig fonts-dejavu-core \
  redis-server nginx rsync

sudo npm install -g pm2

node --version      # v22.x
fc-list | grep -ci dejavu    # must be > 0
```

**ffmpeg is not installed here.** `ffmpeg-static` is a production dependency in
`package.json` and ships its own glibc-linked binary, which the services resolve
via `ffmpegStatic`. Set `FFMPEG_PATH` only if you deliberately want a system
build instead.

### Redis

BullMQ and the Socket.IO adapter both need it.

```bash
sudo sed -i 's/^# *maxmemory-policy .*/maxmemory-policy noeviction/' /etc/redis/redis.conf
sudo systemctl enable --now redis-server
redis-cli ping      # PONG
```

`noeviction` matters: BullMQ stores job state in Redis, and an eviction policy
would silently drop queued jobs under memory pressure.

Redis binds to localhost by default. Leave it that way.

### Directories

```bash
sudo mkdir -p /opt/gocollab/server /var/log/gocollab
sudo chown -R "$USER":"$USER" /opt/gocollab /var/log/gocollab
```

### Swap — cheap insurance

`storage.service.ts:748` buffers whole objects into memory and the upload caps
are 1 GiB (portfolio) and 500 MiB (delivery). PM2's `max_memory_restart` polls
roughly every 30s, so a fast spike can still outrun it. Swap turns an OOM kill
into a slow minute.

```bash
sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 2. Environment variables

`app.module.ts:44` calls `ConfigModule.forRoot()` with **no `envFilePath`**, so
Nest reads `.env` from the process working directory. Both PM2 apps set
`cwd: /opt/gocollab/server`, so that is where the file goes.

```bash
touch /opt/gocollab/server/.env
chmod 600 /opt/gocollab/server/.env
```

`envValidationSchema` enforces **16 required variables** and boots nothing if one
is missing — the app exits at startup rather than failing later, which is the
behaviour you want. Start from `server/.env.example`.

Values that change for this migration:

```ini
AWS_REGION=ap-south-1
AWS_S3_ACCESS_KEY_ID=<the gocollab app user's key>
AWS_S3_SECRET_ACCESS_KEY=<its secret>
S3_BUCKET_NAME=gocollab-media-prod-285870986713-ap-south-1-an
CDN_BASE_URL=https://<new-distribution>.cloudfront.net

REDIS_URL=redis://127.0.0.1:6379
PORT=4000
NODE_ENV=production
```

> `server/.env.example:35-36` names `AWS_ACCESS_KEY_ID` /
> `AWS_SECRET_ACCESS_KEY`, but `env.validation.ts:122-123` requires
> `AWS_S3_ACCESS_KEY_ID` / `AWS_S3_SECRET_ACCESS_KEY`. Use the validated names.

**Do not put `BULLMQ_WORKER_ENABLED` in `.env`.** It is the only variable that
differs between the two processes and `ecosystem.config.js` sets it per app. In
the file it would be ambiguous at best and wrong for one of them at worst.

The testing instance gets its own `.env` with its own database, its own Redis,
and test credentials for Razorpay, Twilio and WhatsApp. It should never point at
the production bucket.

---

## 3. PM2

`server/ecosystem.config.js` defines both processes. The reasoning is in its
comments; the two decisions worth restating:

**Both apps run `exec_mode: 'fork'` with `instances: 1`.** Cluster mode is
tempting on a 4-vCPU box but wrong here: `ScheduleModule.forRoot()` is
unconditional in `jobs/jobs.module.ts:11`, and the `@Cron` handlers guard only
with an in-process flag. Every extra instance is another copy of every cron.
Gate the schedule on `BULLMQ_WORKER_ENABLED` before scaling out. For the worker,
parallelism already comes from the BullMQ concurrency settings — more PM2
instances would multiply those limits rather than share them.

**`max_memory_restart` is a safety net, not a tuning knob.** 1 GB for the API,
6 GB for the worker on a 16 GiB host. BullMQ retries whatever was in flight.

First start:

```bash
cd /opt/gocollab/server
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd      # prints a sudo command — run it, so PM2 survives reboot
```

Log rotation, or the disk fills:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 5
pm2 set pm2-logrotate:compress true
```

Day to day:

```bash
pm2 status
pm2 logs gocollab-worker --lines 100
pm2 reload ecosystem.config.js --update-env   # zero-downtime
pm2 monit                                      # live CPU/memory
```

### Concurrency

Until `getObjectBuffer` streams instead of buffering, keep these low in `.env`
on production and raise them once you have watched real memory use:

```ini
MEDIA_NORMALIZE_CONCURRENCY=1
PREVIEW_VIDEO_CONCURRENCY=1
WATERMARK_CONCURRENCY=1
```

Defaults are 2 each, across four queues, each able to hold a multi-hundred-MB
buffer.

---

## 4. nginx

The API binds to `127.0.0.1:4000`; nginx terminates TLS and proxies.

```nginx
# /etc/nginx/sites-available/gocollab
server {
    listen 80;
    server_name api.gocollab.io;

    client_max_body_size 1m;   # uploads go direct to S3 via presigned URLs,
                               # so nothing large passes through here

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;

        # Socket.IO needs these two or realtime silently falls back to polling
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/gocollab /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.gocollab.io
```

`client_max_body_size 1m` is deliberate. Media never traverses nginx — the
browser PUTs straight to S3 with a presigned URL — so a large limit here would
only widen the attack surface.

---

## 5. Security groups

| Port | Source | Why |
|---|---|---|
| 22 | your office IP, or nothing if using SSM | SSH / deploys |
| 80, 443 | 0.0.0.0/0 | public API |
| 6379 | **nobody** | Redis is localhost-only |
| 4000 | **nobody** | nginx proxies it |

---

## 6. GitHub Actions

`.github/workflows/deploy-server.yml` builds on the runner, ships `dist` plus
manifests, then installs and reloads on the host.

`node_modules` is **not** shipped. sharp and ffmpeg-static carry
platform-specific binaries, so `npm ci --omit=dev` runs on the target where the
architecture is known to match. This is also what makes a later move to Graviton
a config change rather than a rebuild.

### Secrets

Create two GitHub **Environments** — `production` and `testing` — each with:

| Secret | Value |
|---|---|
| `EC2_HOST` | instance public DNS or IP |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | private key whose public half is in that host's `~/.ssh/authorized_keys` |

Generate a deploy-only key rather than reusing a personal one:

```bash
ssh-keygen -t ed25519 -f ./gocollab-deploy -N "" -C "github-actions"
# public half -> the instance; private half -> the EC2_SSH_KEY secret
```

Add a required reviewer on the `production` environment if you want deploys to
`main` to pause for approval.

### What a run does

1. `npm ci`, lint, test, build on the runner — a broken build never reaches a host
2. rsync `dist`, `package.json`, `package-lock.json`, `prisma`,
   `ecosystem.config.js`, excluding `node_modules` and `.env`
3. `npm ci --omit=dev`
4. `npx prisma migrate deploy` — applies committed migrations only, never prompts
5. `pm2 reload --update-env`
6. poll `/api/health` for 60s; on failure, print the last 50 log lines and fail
   the job

Migrations run before the reload because new code may require the new schema.

### Rollback

```bash
git revert <sha> && git push
```

Re-runs the pipeline with the previous code. Note this does **not** reverse a
database migration — write migrations to be backwards-compatible with the
release before them, so a code rollback alone is always safe.

---

## 7. Verify a deploy

```bash
pm2 status                                  # both online, restarts not climbing
curl -fsS http://127.0.0.1:4000/api/health  # on the host
curl -fsS https://api.gocollab.io/api/health
pm2 logs gocollab-worker --lines 50         # queues attached, no Redis errors
free -h                                      # worker RSS sane, swap near zero
```

Then exercise the parts that only break in production:

- Upload a **>10 MB video** — multipart plus the `ETag` CORS path
- Submit a delivery and check the watermarked preview — if the overlay is faint,
  the fonts from §1 are missing
- Open two browser sessions and confirm realtime updates — Socket.IO through
  nginx

---

## 8. Known gaps

**Crons fire in both processes.** `ScheduleModule.forRoot()` is unconditional,
so the API and worker each run every `@Cron`. The handlers claim rows via status
transitions, so duplicates mostly no-op, but it is wasted work and it blocks
cluster mode. Gating it on `BULLMQ_WORKER_ENABLED` is a small change.

**`AWS_REGION` is shared by S3 and SES** (`env.validation.ts:121`, consumed by
`storage.service.ts:132` and `ses-mail.transport.ts:38`). Both are `ap-south-1`
today so it does not bite, but it means S3 cannot move region without SES.

**The worker's memory profile is a code limitation, not a workload one.** ffmpeg
streams; the buffering in `getObjectBuffer` is what forces 16 GiB. Streaming
straight to the temp file — the pattern `uploadStream` already uses on the
upload side — would let production run on half the instance.
