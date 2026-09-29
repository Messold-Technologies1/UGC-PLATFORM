# Moving the server from Railway to AWS

**Scope:** the NestJS server in `server/`. The Next.js client is a separate
deploy and is not covered here.

You are already largely on AWS — S3 for media, SES for email, CloudFront for
`CDN_BASE_URL`. This moves compute onto EC2 alongside them.

If you need the notification worker running **before** the EC2 move, or you
decide to stay on Railway, skip to §8 — the process split works there too.

> **Nothing here has been executed.** The Dockerfile, compose file and deploy
> script are written and the build steps they depend on are verified locally
> (`npm ci` with placeholder database variables, `npm run build` producing
> `dist/main.js`, `dist/main.worker.js` and 96 template files). The **image
> itself has not been built** — this container has the Docker CLI but no daemon.
> Build it once locally before trusting the deploy script.

---

## What you are running

Two processes from **one image**, which is the point — they can never drift.

| Process | Command | `BULLMQ_WORKER_ENABLED` | Public |
|---|---|---|---|
| `api` | `node dist/main.js` | `false` | via ALB |
| `worker` | `node dist/main.worker.js` | `true` | no |

The worker exists so SES, Meta and Handlebars work never sits on the request
path, and so it can be restarted without dropping API traffic.

---

## 1 · Decide two things first

### Postgres: keep Neon, or move to RDS?

Your schema uses the Neon idiom — `DATABASE_URL` (pooled) plus `DIRECT_URL`
(direct, for migrations).

**Recommendation: keep Neon for now.** It works fine from EC2, it is one less
thing to migrate during a move that already changes plenty, and you would lose
autosuspend — which your own code is careful to preserve (`health.controller.ts`
avoids querying the database on the liveness probe precisely so Neon can sleep).

Move to RDS later, on its own, if you want everything in one VPC. That migration
deserves its own window rather than being bundled with a hosting change.

### Redis: container on the box, or ElastiCache?

Redis here holds BullMQ jobs and the Socket.IO adapter. Nothing in it is
precious — a lost job is recovered by the backstop sweep, which is exactly what
it was built for.

**Recommendation: start with a Redis container on the same EC2 host.** Cheaper,
simpler, and adequate at your volume. Move to ElastiCache when you run more than
one EC2 instance, because at that point a local Redis stops being shared.

---

## 2 · Provision

### EC2

- **t3.small** (2 vCPU, 2 GB) is enough to start. The worker is small; the API
  is the memory consumer. Watch and resize rather than guessing upward.
- Amazon Linux 2023 or Ubuntu 22.04.
- Attach an **instance role** rather than putting AWS keys in the env file —
  it can carry the S3 and SES permissions, and the SDK picks it up
  automatically. See the note on credentials in step 4.

```bash
# Docker + compose plugin
sudo dnf install -y docker git && sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

sudo mkdir -p /opt/gocollab /etc/gocollab
sudo chown ec2-user:ec2-user /opt/gocollab /etc/gocollab
git clone <your-repo> /opt/gocollab
```

### Security groups

| | Inbound |
|---|---|
| ALB | 443 from `0.0.0.0/0` (and 80, redirecting to 443) |
| EC2 | 4000 **from the ALB security group only** — never from the internet |
| EC2 | 22 from your IP, or nothing if you use SSM Session Manager |

The compose file binds the API to `127.0.0.1:4000`, so it is not reachable from
outside the host even if a security group is wrong.

### ALB + TLS

- Target group → EC2 instance, port 4000, protocol HTTP.
- **Health check path: `/api/health`.**
  **Not `/api/health/db`.** The liveness route deliberately does not query the
  database so Neon can autosuspend; pointing the ALB at the `db` route would
  poll it every 30 seconds forever and keep the compute awake — and billed.
- Certificate from ACM for your API domain, attached to the 443 listener.
- Enable **stickiness only if** you use Socket.IO without the Redis adapter.
  You do use the Redis adapter (`main.ts` wires it when `REDIS_URL` is set), so
  you do not need stickiness.

---

## 3 · Redis

```yaml
# add to server/docker-compose.yml
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: ["redis-server", "--appendonly", "yes", "--maxmemory-policy", "noeviction"]
    volumes: [redis-data:/data]
volumes:
  redis-data:
```

`noeviction` matters: BullMQ stores delayed jobs as real keys, and an eviction
policy that discards them silently loses scheduled sends. The backstop sweep
would recover them, but it should not have to.

Then `REDIS_URL=redis://redis:6379`.

---

## 4 · Environment

Copy every variable out of Railway into `/etc/gocollab/server.env`
(`chmod 600`). There are **71**, of which **16 are required** — the server
refuses to boot without them (`src/config/env.validation.ts`), which is helpful:
a missing variable fails loudly at start rather than at 3am.

Required: `DATABASE_URL`, `DIRECT_URL`, `JWT_ACCESS_SECRET`,
`JWT_REFRESH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`GOOGLE_CALLBACK_URL`, `FRONTEND_URL`, `AWS_REGION`, `AWS_S3_ACCESS_KEY_ID`,
`AWS_S3_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`, `CDN_BASE_URL`,
`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.

**Changes from Railway:**

| Variable | Change |
|---|---|
| `REDIS_URL` | now `redis://redis:6379` |
| `PORT` | keep `4000`; compose maps it |
| `CORS_ORIGIN` | your client origin — do not leave it `*` in production |
| `BULLMQ_WORKER_ENABLED` | **do not set it here** — compose sets it per service |
| `NOTIFICATIONS_SENDING_ENABLED` | leave unset; that is the separate cutover |

**On AWS credentials:** you can drop `AWS_S3_ACCESS_KEY_ID` /
`AWS_S3_SECRET_ACCESS_KEY` / `AWS_SES_*` and let the instance role supply them —
but only after checking each client construction, since some read the keys
explicitly rather than falling through to the default chain. Worth doing, worth
doing separately from the move.

---

## 5 · Deploy

```bash
/opt/gocollab/server/deploy.sh
```

Pull, build, `prisma migrate deploy` in a one-shot container, then
`docker compose up -d`, then wait for `/api/health`. Migrations run in their own
container deliberately: as an entrypoint hook both services would race and one
would fail on the advisory lock.

---

## 6 · Cut over from Railway with no downtime

1. Bring the EC2 stack up while Railway still serves traffic. Both point at the
   same database, so both are live and correct.
2. Verify directly against the ALB hostname: `/api/health`, then a real
   authenticated request.
3. **Lower the DNS TTL on your API record to 60s a day beforehand.** This is the
   step people skip and then wait hours for.
4. Repoint DNS to the ALB. Watch both sets of logs until Railway goes quiet.
5. Update anything holding the old hostname:
   - Razorpay webhook URL
   - SES SNS subscription (bounces/complaints)
   - WhatsApp callback URL in Meta
   - Google and Instagram OAuth redirect URIs
   - `FRONTEND_URL` / `CORS_ORIGIN` if the client moves too
6. Keep Railway running, idle, for a few days. It is the rollback.

> **Do the hosting move and the notification cutover separately.** Both are
> reversible on their own; together, a problem gives you two suspects.

---

## 7 · Logs and monitoring

Compose caps json-file logs at 10 MB × 5 per service, so the disk cannot fill —
the failure mode that takes a box down quietly.

For anything beyond `docker compose logs`, install the CloudWatch agent and ship
`/var/lib/docker/containers/*/*-json.log`. The app already logs structured JSON
through pino, so it stays queryable.

Worth alarming on:

| Alarm | Why |
|---|---|
| ALB 5xx rate | the obvious one |
| ALB unhealthy host count | the API stopped responding |
| EC2 CPU and memory | sizing was a guess; this is how you correct it |
| Disk > 80% | images and logs accumulate |
| `docker ps` shows the worker restarting | a crash loop is otherwise invisible — it serves no traffic, so nothing else notices |

That last one is the one people miss. The worker has no health check because it
has no HTTP surface: if it dies, notifications simply stop, silently, and the API
looks perfectly healthy.

---

## 8 · Interim: running the worker on Railway

The two-process split is a **code** change, not an AWS one. If you want the
notification worker running before the EC2 move — or you stay on Railway —
Railway supports it fine. Add a **second service pointed at the same repo** and
change one thing: the start command.

| | `api` service | `worker` service |
|---|---|---|
| Root directory | `server` | `server` |
| Build | default | default (identical) |
| Start command | `npm run start:prod` | `npm run start:worker` |
| `BULLMQ_WORKER_ENABLED` | `false` | `true` |
| Public domain | yes | **none** |
| Health check path | `/api/health` | **leave empty** |
| App sleeping / serverless | off | **off** |

### The worker needs no domain

`src/main.worker.ts` calls `NestFactory.createApplicationContext`, not `create`.
There is no HTTP server, no `listen()`, no port — only `src/main.ts` binds one.
The worker dials *outward* to Postgres and Redis; nothing ever dials *in*. A
Railway domain exists so traffic can reach a service, so there is nothing here to
attach one to. Railway will still inject `PORT`; the worker ignores it.

### The two settings that break it silently

**Leave the health check path empty.** Railway health checks are HTTP GETs.
Pointed at a process with no server, every deploy fails its check and
restart-loops. This is the most common way a Railway worker is broken.

**Turn App Sleeping off.** Sleeping is driven by inbound HTTP activity, and a
service that never receives any looks permanently idle. It sleeps, nothing wakes
it, and the queues simply stop draining — no error, no alarm, delayed sends
piling up unfired. The API stays green throughout.

Both failures share the shape called out in §7: the worker serves no traffic, so
nothing notices when it stops. On Railway, watch its deploy logs for the
`notification worker started` line and alarm on the service restarting.

### Environment

Give the worker the **full** variable set, not a subset — it is the process that
actually sends, so it needs the SES and WhatsApp credentials, `DATABASE_URL` /
`DIRECT_URL`, `REDIS_URL` and `NOTIFICATIONS_SENDING_ENABLED` exactly as the API
has them. Use Railway shared variables rather than two copies that drift.

`REDIS_URL` must resolve to the **same** Redis instance for both services, over
Railway's private network (`redis.railway.internal`). This is the one place a
domain matters, and it is Redis's private domain, not the worker's. Point them at
different instances and the worker drains a queue nobody fills — which looks
exactly like the sleeping failure above.

### Migrations

Run `prisma migrate deploy` from **one** service only — the API's start command
or a release step. If both run it at boot they race on the advisory lock and one
fails the deploy. Leave the worker's start command as bare `npm run start:worker`.
This is the same hazard `deploy.sh` avoids on EC2 with a one-shot container.

> When you move to AWS this section becomes moot: `docker-compose.yml` already
> defines both services off one image, which is strictly better than two Railway
> services that can drift in build or environment.

---

## What is verified, and what is not

| | |
|---|---|
| `npm ci` with placeholder database variables | ✅ verified locally |
| `npm run build` → `main.js`, `main.worker.js`, 96 templates | ✅ verified |
| Health route `/api/health` exists and skips the database | ✅ verified in source |
| Docker image builds | ❌ **not verified — no daemon here** |
| Compose brings both services up | ❌ not verified |
| Deploy script end to end | ❌ not verified |
| Worker starts with no HTTP listener (§8) | ✅ verified in source |
| Railway two-service setup (§8) | ❌ not verified — never deployed |
| **Any queue job actually executing, anywhere** | ❌ **not verified — no Redis here** |

Build the image locally once before you trust any of it:

```bash
cd server && docker build -t gocollab-server:test .
docker run --rm gocollab-server:test node -e "console.log('ok')"
```
