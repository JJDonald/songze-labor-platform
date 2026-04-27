module.exports = {
  apps: [
    {
      name: 'labor-api',
      script: 'dist/index.js',
      cwd: 'server',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        DATABASE_URL: 'file:./prisma/dev.db',
        CORS_ORIGINS: 'https://example.com',
      },
      max_memory_restart: '500M',
      error_file: '/var/log/nginx/labor-api-error.log',
      out_file: '/var/log/nginx/labor-api-out.log',
      merge_logs: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
}
