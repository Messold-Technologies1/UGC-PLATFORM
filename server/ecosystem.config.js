/**
 * PM2 process definitions for the GoCollab server.
 *
 * Two processes from one build, mirroring docker-compose.yml: the API serves
 * HTTP and Socket.IO, the worker drains the BullMQ queues. They differ only in
 * BULLMQ_WORKER_ENABLED, which is set here rather than in .env so the same env
 * file can serve both without ambiguity.
 *
 * Secrets live in /opt/gocollab/server/.env (chmod 600), which Nest's
 * ConfigModule reads from the process cwd — app.module.ts sets no envFilePath,
 * so cwd is what matters and both apps set it explicitly below.
 */
module.exports = {
  apps: [
    {
      name: 'gocollab-api',
      script: 'dist/main.js',
      cwd: '/opt/gocollab/server',

      // Fork, single instance — NOT cluster. ScheduleModule.forRoot() is
      // unconditional in jobs.module.ts and the @Cron handlers guard only with
      // an in-process flag (this.reconcileRunning), so every extra instance is
      // another copy of every cron. Gate the schedule on BULLMQ_WORKER_ENABLED
      // before raising this. The API is I/O-bound anyway.
      instances: 1,
      exec_mode: 'fork',

      env: {
        NODE_ENV: 'production',
        BULLMQ_WORKER_ENABLED: 'false',
      },

      // The API holds no large buffers; anything near 1 GB is a leak worth
      // restarting through.
      max_memory_restart: '1G',

      kill_timeout: 10000,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '30s',

      time: true,
      merge_logs: true,
      out_file: '/var/log/gocollab/api.out.log',
      error_file: '/var/log/gocollab/api.err.log',
    },

    {
      name: 'gocollab-worker',
      script: 'dist/main.worker.js',
      cwd: '/opt/gocollab/server',

      // Also single — BullMQ concurrency (MEDIA_NORMALIZE_CONCURRENCY and
      // friends) is what parallelises work. A second PM2 instance would
      // multiply those limits rather than share them, and memory is the
      // binding constraint here, not scheduling.
      instances: 1,
      exec_mode: 'fork',

      env: {
        NODE_ENV: 'production',
        BULLMQ_WORKER_ENABLED: 'true',
      },

      // storage.service.ts:748 buffers whole objects (Buffer.concat holds the
      // chunk array and the result at once, so peak is ~2x the file), and the
      // upload caps are 1 GiB for portfolio video, 500 MiB for deliveries. A
      // bad combination can climb fast, so restart before the kernel OOM-killer
      // takes the box — it would take the API with it.
      //
      // Sized for a 16 GiB host. Scale with the instance; PM2 polls RSS about
      // every 30s, so keep headroom rather than setting this near total RAM.
      // BullMQ retries whatever was in flight.
      max_memory_restart: '6G',

      // Long, so an in-flight transcode can finish on SIGINT instead of being
      // killed and retried from the start.
      kill_timeout: 120000,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '60s',

      time: true,
      merge_logs: true,
      out_file: '/var/log/gocollab/worker.out.log',
      error_file: '/var/log/gocollab/worker.err.log',
    },
  ],
};
