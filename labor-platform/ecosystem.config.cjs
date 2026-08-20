const path = require('node:path');

const appRoot = __dirname;
const serverRoot = path.join(appRoot, 'server');

module.exports = {
  apps: [
    {
      name: 'labor-api',
      script: 'dist/index.js',
      cwd: serverRoot,
      instances: 1,
      exec_mode: 'fork',
      node_args: `--env-file=${path.join(serverRoot, '.env')}`,
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '500M',
      error_file: path.join(serverRoot, 'logs', 'error.log'),
      out_file: path.join(serverRoot, 'logs', 'output.log'),
      merge_logs: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
