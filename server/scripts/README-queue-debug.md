# Queue / Redis debugging

Tools for diagnosing why the in-process BullMQ workers (`social-metrics-sync`,
`delivery-watermark`) sometimes fail to consume jobs — jobs sit in `wait` and
never go `active`, so the 15s watchdog runs them inline instead.

## `redis-queue-diagnose.mjs`

Read-only inspection of the Redis instance and both app queues, plus an
optional live idle→consume reproduction. Password in the URL is redacted in all
output, so the results are safe to paste.

### Run it **inside Railway** (the Redis host is on the private network)

`redis.railway.internal` only resolves from inside the Railway project, so run
the script in the same environment as the server:

```bash
# from the deployed service shell, or locally via the Railway CLI:
railway run node server/scripts/redis-queue-diagnose.mjs

# or point at the public proxy URL Railway exposes (Variables tab):
node server/scripts/redis-queue-diagnose.mjs --url "$REDIS_PUBLIC_URL"
```

Deps (`bullmq`, `ioredis`) resolve from `server/node_modules`, so run it from a
place where the server's dependencies are installed.

### Options

| flag | meaning |
| --- | --- |
| `--url <redisUrl>` | Redis URL. Falls back to `$REDIS_URL`. |
| `--queues a,b` | Queues to inspect. Default `social-metrics-sync,delivery-watermark`. |
| `--idle-test[=secs]` | Also run a worker on an isolated `diag-idle-consume` queue, sit idle for `secs` (default 60), then enqueue one job and measure time-to-`active`. Reproduces the idle blocking-connection drop against the real Redis. |

### How to read the output

1. **Eviction policy** — must be `noeviction`. Anything else (`allkeys-lru`, …)
   or `evicted_keys > 0` means Redis is evicting BullMQ's own keys → jobs get
   stuck/lost. Fix: set `noeviction` and/or lower retained history.
2. **Client connections** — `blocked_clients` is how many workers are parked on
   a blocking wait. `connected_clients` near `maxclients` → new worker
   connections get refused.
3. **Blocking consumers** — with a job sitting in `wait` *right now*, if there
   are **no** blocking consumers, the worker's blocking connection is dead —
   this is the idle-drop smoking gun.
4. **App queues** — per-queue counts + `workersRegistered`. `0 workers` means
   nothing consumes there (worker never started / crashed / different Redis).
5. **Idle test** — pickup <1.5s = healthy; several seconds = connection was
   re-established after a drop; **not consumed within 20s = the bug reproduced.**

## Related log lines (added for correlation)

Both queue services now log `worker Redis connection closed — reconnecting`
(from the worker's `ioredis:close` event). If you see that shortly before a
`watchdog job … still wait` line, the idle blocking-connection drop is
confirmed as the cause.
