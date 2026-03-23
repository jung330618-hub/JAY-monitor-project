require('dotenv').config();
const { runFullPipeline } = require('./src/scheduler/cron');

console.log('--- 🚀 準備手動觸發完整流水線測試 ---');
runFullPipeline().then((result) => {
  if (result.success) {
    console.log('✅ 手動執行成功！請去檢查你的 Telegram 手機訊息！');
  } else {
    console.log('❌ 執行發生錯誤。');
  }
  process.exit();
}).catch(console.error);
