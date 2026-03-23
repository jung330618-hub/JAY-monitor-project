require('dotenv').config();
const { sendLineNotify } = require('./src/notify/line');

async function testLineConnection() {
  console.log('--- 🟢 準備測試 Line 官方機器人連線 ---');

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const userId = process.env.LINE_USER_ID;

  if (!token || token === 'your_line_channel_access_token') {
    console.log('❌ 警告：LINE_CHANNEL_ACCESS_TOKEN 似乎沒有正確載入。');
    process.exit(1);
  }
  if (!userId || userId === 'your_line_user_id') {
    console.log('❌ 警告：LINE_USER_ID 似乎沒有正確載入。');
    process.exit(1);
  }

  console.log('✅ 已偵測到 Line 金鑰配置，發送測試訊息中...');

  const testMessage = '🎉 報告老闆！你的周杰倫「LINE 官方機器人」已經連線成功，且升級最新版 API 通道，隨時待命！';
  
  const result = await sendLineNotify(testMessage);

  if (result.success) {
    console.log('✅ 測試連線訊息已送出，請檢查你的 LINE 手機訊息！');
  } else {
    console.log('❌ 傳送失敗，原因:', result.reason);
    console.log('💡 若失敗，請檢查你是否已經掃描 QR Code 加此機器人為好友！');
  }
}

testLineConnection();
