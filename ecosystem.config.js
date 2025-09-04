// ecosystem.config.js
module.exports = {
  apps: [
    // API HTTP
    {
      name: "mi-app",
      script: "build/server.js",
      exec_mode: "fork",
      instances: 1,
      max_memory_restart: '7G',
      env_production: { NODE_ENV: "production" },
    },
    // Scheduler (proceso aparte)
    {
      name: "mi-app:scheduler",
      script: "./build/ace",
      args: "scheduler:run",
      interpreter: "node",
      cwd: "/var/app/project-x",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      env_production: { NODE_ENV: "production" },
    },
  ],
};
