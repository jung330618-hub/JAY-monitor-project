// ===================================================
// ④ 通知模組 - Line Notify
// ===================================================
const axios = require('axios');

/**
 * 透過 Line Messaging API 發送訊息 (官方帳號模式)
 */
async function sendLineNotify(message) {
  const token = (process.env.LINE_CHANNEL_ACCESS_TOKEN || '').trim();
  const userId = (process.env.LINE_USER_ID || '').trim();

  if (!token || token === 'your_line_channel_access_token' || !userId || userId === 'your_line_user_id') {
    console.log('[通知] Line Token 或 User ID 未設定，跳過 Line 通知');
    return { success: false, reason: 'Token 或 User ID 未設定' };
  }

  try {
    const response = await axios.post(
      'https://api.line.me/v2/bot/message/push',
      {
        to: userId,
        messages: [{ type: 'text', text: message }]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    console.log('[通知] Line 官方帳號推播發送成功！');
    return { success: true };
  } catch (error) {
    const errMsg = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error('[通知] Line 原生 API 發送失敗:', errMsg);
    return { success: false, reason: errMsg };
  }
}

/**
 * 發送每日摘要到 Line
 */
async function sendDailyReportToLine(report) {
  const message = `
🎤 周杰倫每日輿情報告
📅 ${report.report_date}
━━━━━━━━━━━━━━
📊 今日統計
  總計: ${report.total_articles} 篇
  ✅ 正面: ${report.positive_count} 篇
  ❌ 負面: ${report.negative_count} 篇
  ⚪ 中性: ${report.neutral_count} 篇
━━━━━━━━━━━━━━
📝 摘要
${report.daily_summary}
━━━━━━━━━━━━━━
🔑 重要事件
${report.key_events}
━━━━━━━━━━━━━━
🔗 完整報告: http://localhost:${process.env.PORT || 3000}`;

  return sendLineNotify(message);
}

module.exports = {
  sendLineNotify,
  sendDailyReportToLine
};
