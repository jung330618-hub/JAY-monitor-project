// ===================================================
// ④ 通知模組 - Line Notify
// ===================================================
const https = require('https');
const querystring = require('querystring');

/**
 * 透過 Line Notify 發送訊息
 */
async function sendLineNotify(message) {
  const token = process.env.LINE_NOTIFY_TOKEN;

  if (!token || token === 'your_line_notify_token_here') {
    console.log('[通知] Line Notify Token 未設定，跳過 Line 通知');
    return { success: false, reason: 'Token 未設定' };
  }

  return new Promise((resolve, reject) => {
    const postData = querystring.stringify({ message });

    const options = {
      hostname: 'notify-api.line.me',
      path: '/api/notify',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('[通知] Line Notify 發送成功');
          resolve({ success: true });
        } else {
          console.error(`[通知] Line Notify 發送失敗 (${res.statusCode}):`, data);
          resolve({ success: false, reason: `HTTP ${res.statusCode}` });
        }
      });
    });

    req.on('error', (error) => {
      console.error('[通知] Line Notify 發送錯誤:', error.message);
      resolve({ success: false, reason: error.message });
    });

    req.write(postData);
    req.end();
  });
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
