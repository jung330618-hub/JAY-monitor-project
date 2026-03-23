require('dotenv').config();
const { sendDailyReportToTelegram } = require('./src/notify/telegram');
const fs = require('fs');

async function debugTelegram() {
  const fakeReport = {
    report_date: '2026-03-23',
    total_articles: 10,
    positive_count: 5,
    negative_count: 2,
    neutral_count: 3,
    daily_summary: '測試訊息摘要：這裡是可以隨便打的文字。',
    key_events: '事件一, 事件二'
  };

  try {
    const result = await sendDailyReportToTelegram(fakeReport);
    fs.writeFileSync('debug-result.txt', JSON.stringify({ result }, null, 2));
  } catch(e) {
    fs.writeFileSync('debug-result.txt', JSON.stringify({ error: e.message }, null, 2));
  }
}

debugTelegram();
