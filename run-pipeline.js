require('dotenv').config();
const { runFullPipeline } = require('./src/scheduler/cron');

(async () => {
  try {
    console.log('🚀 開始執行自動化任務...');
    await runFullPipeline();
    console.log('✅ 所有排程已完成，資料庫與通知已送出。');
    process.exit(0);
  } catch (err) {
    console.error('❌ 執行任務時發生錯誤:', err);
    process.exit(1);
  }
})();
