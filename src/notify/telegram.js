// ===================================================
// ④ 通知模組 - Telegram Bot
// ===================================================
const https = require('https');

/**
 * 透過 Telegram Bot 發送訊息
 */
async function sendTelegramMessage(message) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || botToken === 'your_telegram_bot_token_here' || !chatId || chatId === 'your_telegram_chat_id_here') {
    console.log('[通知] Telegram Bot 未設定，跳過 Telegram 通知');
    return { success: false, reason: 'Token 或 Chat ID 未設定' };
  }

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML'
    });

    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${botToken}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('[通知] Telegram 訊息發送成功');
          resolve({ success: true });
        } else {
          console.error(`[通知] Telegram 發送失敗 (${res.statusCode}):`, data);
          resolve({ success: false, reason: `HTTP ${res.statusCode}` });
        }
      });
    });

    req.on('error', (error) => {
      console.error('[通知] Telegram 發送錯誤:', error.message);
      resolve({ success: false, reason: error.message });
    });

    req.write(postData);
    req.end();
  });
}

/**
 * 發送每日摘要到 Telegram
 */
async function sendDailyReportToTelegram(report) {
  const message = `🎤 <b>周杰倫每日輿情報告</b>
📅 ${report.report_date}
━━━━━━━━━━━━━━
📊 <b>今日統計</b>
  總計: ${report.total_articles} 篇
  ✅ 正面: ${report.positive_count} 篇
  ❌ 負面: ${report.negative_count} 篇
  ⚪ 中性: ${report.neutral_count} 篇
━━━━━━━━━━━━━━
📝 <b>摘要</b>
${report.daily_summary}
━━━━━━━━━━━━━━
🔑 <b>重要事件</b>
${report.key_events}
━━━━━━━━━━━━━━
🔗 <a href="http://localhost:${process.env.PORT || 3000}">查看完整報告</a>`;

  return sendTelegramMessage(message);
}

module.exports = {
  sendTelegramMessage,
  sendDailyReportToTelegram
};
