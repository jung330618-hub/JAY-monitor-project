require('dotenv').config();
const https = require('https');
const fs = require('fs');
const path = require('path');

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token || token === 'your_telegram_bot_token_here') {
  console.log('\n❌ 錯誤：請先到 `.env` 檔案內把從 @BotFather 拿到的 TELEGRAM_BOT_TOKEN 貼上去，再執行本程式！\n');
  process.exit(1);
}

console.log('\n🤖 [Telegram 小精靈] 已經收到你的 Token！');
console.log('👉 請打開 Telegram，搜尋你剛才建立的機器人專屬 ID。');
console.log('👉 點擊 Start 或隨便傳一句 Hello 給它...');
console.log('🔄 正在等待由你發送的第一則訊息 (20秒刷新一次)...\n');

let isPolling = true;

async function checkUpdates() {
  if (!isPolling) return;
  const url = `https://api.telegram.org/bot${token}/getUpdates`;
  
  https.get(url, (res) => {
    let rawData = '';
    res.on('data', (chunk) => rawData += chunk);
    res.on('end', () => {
      try {
        const parsedData = JSON.parse(rawData);
        if (parsedData.ok && parsedData.result.length > 0) {
          // 抓取最後一則聊天對話的 ID
          const latestMessage = parsedData.result[parsedData.result.length - 1];
          const chatId = latestMessage.message?.chat?.id;
          
          if (chatId) {
            console.log(`✅ 抓到你的 Chat ID 囉！是：${chatId}`);
            updateEnvFile(chatId);
            isPolling = false;
          }
        }
      } catch (e) {
        // 忽略解析錯誤
      }
    });
  }).on('error', () => {
    console.log('⚠️ 連線 Telegram 失敗，準備重試...');
  });

  if (isPolling) {
    setTimeout(checkUpdates, 3000);
  }
}

function updateEnvFile(chatId) {
  const envPath = path.join(__dirname, '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // 替換檔案內的 TELEGRAM_CHAT_ID
  envContent = envContent.replace(
    /TELEGRAM_CHAT_ID=your_telegram_chat_id_here/g, 
    `TELEGRAM_CHAT_ID=${chatId}`
  );
  
  fs.writeFileSync(envPath, envContent);
  console.log('\n🎉 太棒了！我已經自動幫你把 ID 寫進 `.env` 檔案裡了。你的 Telegram 推播功能正式全境開通！');
  
  // 測試發送成功通知
  sendWelcomeMessage(chatId);
}

function sendWelcomeMessage(chatId) {
  const message = encodeURIComponent('🎉 報告老闆！我是你的周杰倫專屬 AI 機器人，已經成功連線，隨時聽侯您的差遣！');
  const url = `https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${message}`;
  
  https.get(url, () => {
    console.log('📨 我順便幫你發了一則測試連線訊息到 Telegram 了，去看看手機有沒有收到吧！\n');
    process.exit(0);
  });
}

checkUpdates();
