// PM2 process definitions for the EC2 host.
//
// Two processes from one build, split by BULLMQ_WORKER_ENABLED — the same
// contract main.worker.ts documents:
//
//   api     dist/main.js          BULLMQ_WORKER_ENABLED=false   serves HTTP
//   worker  dist/main.worker.js   BULLMQ_WORKER_ENABLED=true    drains queues
//
// With the flag unset BOTH would consume jobs, which defeats the split: an
// ffmpeg encode would then run inside the process that is answering requests.
//
// Secrets are NOT here. deploy.sh sources /etc/gocollab/server.env into its own
// environment and starts PM2 with --update-env, so the processes inherit it.
// This file is committed; that file is 0600 on the box.
module.exports = {
  apps: [
    {
      name: 'gocollab-api',
      script: 'dist/main.js',
      cwd: '/opt/gocollab/current',
      // Fork, not cluster. Two vCPUs are shared with the worker's ffmpeg
      // children; a second API process would compete with the encoder for the
      // same cores rather than adding throughput. Revisit when the encode work
      // moves off this box.
      exec_mode: 'fork',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        BULLMQ_WORKER_ENABLED: 'false',
      },
      // The API holds no large buffers; anything past this is a leak, and a
      // restart is cheaper than an OOM kill that also takes the worker with it.
      max_memory_restart: '700M',
      // Restart backoff, so a process that crashes on boot (bad env, DB
      // unreachable) does not spin at 100% CPU retrying forever.
      exp_backoff_restart_delay: 200,
      min_uptime: '20s',
      max_restarts: 10,
      kill_timeout: 10000,
      out_file: '/opt/gocollab/shared/logs/api.out.log',
      error_file: '/opt/gocollab/shared/logs/api.err.log',
      merge_logs: true,
      time: true,
    },
    {
      name: 'gocollab-worker',
      script: 'dist/main.worker.js',
      cwd: '/opt/gocollab/current',
      exec_mode: 'fork',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        BULLMQ_WORKER_ENABLED: 'true',
      },
      // Node's own footprint only — ffmpeg runs as a CHILD process, so its
      // memory is not counted here. Since the encoders stream S3 -> disk ->
      // ffmpeg -> disk -> S3, this number should stay flat regardless of how
      // big the video is. If it climbs, something started buffering again.
      max_memory_restart: '900M',
      exp_backoff_restart_delay: 200,
      min_uptime: '20s',
      max_restarts: 10,
      // Longer than the API: give an in-flight encode a chance to finish and
      // the BullMQ worker a chance to close cleanly before SIGKILL. Must stay
      // above WATERMARK_FFMPEG_TIMEOUT_MS's grace, or a deploy during an encode
      // leaves a temp directory behind.
      kill_timeout: 30000,
      out_file: '/opt/gocollab/shared/logs/worker.out.log',
      error_file: '/opt/gocollab/shared/logs/worker.err.log',
      merge_logs: true,
      time: true,
    },
  ],
};
