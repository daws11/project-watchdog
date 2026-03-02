module.exports = {
  apps: [
    {
      name: "watchdog-backend",
      cwd: __dirname,
      script: "pnpm",
      args: "--filter backend start",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "watchdog-wa-ingestor",
      cwd: __dirname,
      script: "pnpm",
      args: "--filter wa-ingestor start",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};

