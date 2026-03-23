const axios = require('axios');

/**
 * 透過 Telegram Bot 發送訊息 (Axios 穩定版)
 */
async function sendTelegramMessage(message) {
  const botToken = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const chatId = (process.env.TELEGRAM_CHAT_ID || '').trim();

  if (!botToken || botToken === 'your_telegram_bot_token_here' || !chatId || chatId === 'your_telegram_chat_id_here') {
    return { success: false, reason: 'Token 或 Chat ID 未設定' };
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await axios.post(url, {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML'
    });

    if (response.data && response.data.ok) {
      console.log('[通知] Telegram 發送大容量報告成功！');
      return { success: true };
    } else {
      console.error('[通知] Telegram 遭拒絕:', response.data);
      return { success: false, reason: 'Telegram 回傳未成功' };
    }
  } catch (error) {
    const errMsg = error.response ? error.response.data.description : error.message;
    console.error('[通知] Telegram 網路連線錯誤:', errMsg);
    return { success: false, reason: errMsg };
  }
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
🔗 查看完整 Dashboard 報告：
http://localhost:${process.env.PORT || 3000}`;

  return sendTelegramMessage(message);
}

module.exports = {
  sendTelegramMessage,
  sendDailyReportToTelegram
};
