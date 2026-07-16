// PM2 Ecosystem 配置 —— 生产环境进程管理
module.exports = {
  apps: [
    {
      name: 'nest-service',
      script: './dist/main.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '400M',
      kill_timeout: 10000,
      out_file: '/dev/stdout',
      error_file: '/dev/stderr',
      merge_logs: true,
    },
  ],
};
