// PM2 process definition for the Next.js frontend.
//
// Separate from the backend's ecosystem file on purpose: `pm2 startOrReload`
// only touches the apps named in the file it is given, so a frontend deploy
// cannot restart the API or the worker, and vice versa.
//
// This file is copied into .next/standalone during packaging, so it sits
// beside server.js at the root of the release.
module.exports = {
  apps: [
    {
      name: 'gocollab-web',
      script: 'server.js',
      // The symlink, not a release path. The OS resolves it at exec time, so a
      // reload after the symlink flip picks up the new release.
      cwd: '/opt/gocollab-client/current',
      exec_mode: 'fork',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
        // Loopback only. Nginx is the sole way in; without this, Next would
        // listen on 0.0.0.0 and port 3000 would be directly reachable.
        HOSTNAME: '127.0.0.1',
      },
      max_memory_restart: '600M',
      exp_backoff_restart_delay: 200,
      min_uptime: '20s',
      max_restarts: 10,
      kill_timeout: 10000,
      out_file: '/opt/gocollab-client/shared/logs/web.out.log',
      error_file: '/opt/gocollab-client/shared/logs/web.err.log',
      merge_logs: true,
      time: true,
    },
  ],
};
