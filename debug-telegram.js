require('dotenv').config();
const { sendDailyReportToTelegram } = require('./src/notify/telegram');

async function debugTelegram() {
  console.log('--- 🐛 開始偵錯 Telegram 推播模組 ---');
  
  const fakeReport = {
    report_date: '2026-03-23',
    total_articles: 10,
    positive_count: 5,
    negative_count: 2,
    neutral_count: 3,
    daily_summary: '測試訊息摘要：這裡是可以隨便打的文字。',
    key_events: '事件一, 事件二'
  };

  console.log(`[驗證環境變數]`);
  console.log(`BOT_TOKEN: ${process.env.TELEGRAM_BOT_TOKEN ? '已加載 (長度 ' + process.env.TELEGRAM_BOT_TOKEN.length + ')' : '未設定'}`);
  console.log(`CHAT_ID: ${process.env.TELEGRAM_CHAT_ID ? '已加載 (' + process.env.TELEGRAM_CHAT_ID + ')' : '未設定'}`);
  
  console.log('\n[開始發送假資料報表]...');
  const result = await sendDailyReportToTelegram(fakeReport);
  console.log('\n[最終發送結果]', result);
}

debugTelegram();
