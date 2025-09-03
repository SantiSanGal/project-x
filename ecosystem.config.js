// ecosystem.config.js
module.exports = {
  apps: [
    // API HTTP
    {
      name: "mi-app",
      script: "build/server.js", // tu entrypoint de prod
      exec_mode: "cluster",
      instances: "max",
      env_production: { NODE_ENV: "production" },
    },

    // Scheduler (proceso aparte)
    {
      name: "mi-app:scheduler",
      script: "ace", // sin comillas raras ni shell
      args: "scheduler:run",
      interpreter: "node",
      cwd: "/ruta/a/tu/app",
      exec_mode: "fork",
      instances: 1, // ¡solo 1!
      autorestart: true,
      env_production: { NODE_ENV: "production" },
    },
  ],
};
