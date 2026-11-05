const { config, assertRequired } = require('./config/env');
const { connectDatabase } = require('./config/database');
const app = require('./app');
const { startReminderJob } = require('./services/reminderService');

async function main() {
  assertRequired();
  await connectDatabase(config.mongoUri);

  app.listen(config.port, () => {
    console.log(`Server đang chạy tại http://localhost:${config.port}/api`);
    startReminderJob();
  });
}

main().catch((err) => {
  console.error('Không thể khởi động server:', err.message);
  process.exit(1);
});
