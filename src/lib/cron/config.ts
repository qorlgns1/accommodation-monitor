export const CRON_CONFIG = {
  schedule: process.env.CRON_SCHEDULE || "*/10 * * * *",
  concurrency: parseInt(process.env.WORKER_CONCURRENCY || "3", 10),
  startupDelay: 10000, // 10초
};
